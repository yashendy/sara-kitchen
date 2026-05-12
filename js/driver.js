// js/driver.js

document.addEventListener('DOMContentLoaded', async () => {
    // التأكد من أن المستخدم مندوب
    const role = sessionStorage.getItem('user_role');
    if (role !== 'DRIVER') {
        window.location.href = 'login.html';
        return;
    }

    const fullName = sessionStorage.getItem('user_full_name');
    document.getElementById('driver-name').innerText = `أهلاً، ${fullName.split(' ')[0]} 👋`;

    await refreshDriverData();
});

async function refreshDriverData() {
    const phone = sessionStorage.getItem('user_phone');
    const container = document.getElementById('orders-list');

    try {
        // 1. جلب كل الطلبات المرتبطة برقم هاتف المندوب (أو المعينة له)
        // ملاحظة: نفترض هنا أن المندوب يرى الطلبات التي لم تُسلم بعد
        const { data: orders, error } = await window.supabaseClient
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // 2. الحسابات المحاسبية (المحفظة)
        let cashInHand = 0;   // إجمالي الكاش من الطلبات المسلمة ولم تورد بعد
        let myEarnings = 0;    // إجمالي العمولات
        
        // تصفية الطلبات: (المسلمة اليوم للحساب) و (التي معه حالياً للتوصيل)
        const deliveredOrders = orders.filter(o => o.status === 'DELIVERED');
        const activeOrders = orders.filter(o => o.status === 'PENDING' || o.status === 'PREPARING' || o.status === 'OUT_FOR_DELIVERY');

        deliveredOrders.forEach(o => {
            cashInHand += (o.total_amount + (o.delivery_commission || 0));
            myEarnings += (o.delivery_commission || 30); // الافتراضي 30 لو مش مسجلة
        });

        // تحديث أرقام المحفظة في الواجهة
        document.getElementById('stat-cash').innerText = `${cashInHand.toFixed(0)} ج`;
        document.getElementById('stat-earnings').innerText = `${myEarnings.toFixed(0)} ج`;
        document.getElementById('stat-net').innerText = `${(cashInHand - myEarnings).toFixed(0)} ج`;

        // 3. عرض قائمة الطلبات النشطة
        if (activeOrders.length === 0) {
            container.innerHTML = '<div style="text-align:center; padding:40px; color:#94a3b8;">☕ مفيش طلبات حالياً.. استريح شوية!</div>';
            return;
        }

        container.innerHTML = '';
        activeOrders.forEach(order => {
            // تجهيز نص المكونات (زي ما كنتي عاملاه في كودك)
            const itemsText = order.items.map(i => `${i.name} (${i.quantity})`).join(' + ');
            const totalToCollect = order.total_amount + (order.delivery_commission || 0);
            const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.customer_address)}`;

            container.innerHTML += `
                <div class="order-card">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span class="order-id">#${order.order_code}</span>
                        <span style="color:#10b981; font-weight:800; font-size:1.1rem;">تحصيل: ${totalToCollect.toFixed(0)} ج</span>
                    </div>
                    
                    <div style="margin-top:15px; font-weight:700; color:#1e293b;">👤 ${order.customer_name}</div>
                    <div style="font-size:0.9rem; color:#64748b; margin-top:5px;">📍 ${order.customer_address}</div>
                    
                    <div class="order-items">
                        <strong>مكونات الطلب:</strong><br>
                        ${itemsText}
                    </div>

                    <div class="btn-group">
                        <a href="tel:${order.customer_phone}" class="btn-small btn-call">📞 اتصال</a>
                        <a href="${mapUrl}" target="_blank" class="btn-small btn-map">🗺️ الخريطة</a>
                    </div>

                    <button onclick="completeOrder(${order.id})" class="btn-complete">تم التسليم واستلام الكاش ✅</button>
                </div>
            `;
        });

    } catch (err) {
        console.error(err);
        container.innerHTML = '<p style="text-align:center; color:red;">خطأ في جلب البيانات.</p>';
    }
}

window.completeOrder = async (orderId) => {
    if (!confirm("هل استلمت المبلغ كامل وسلمت الطلب؟ 💰")) return;

    try {
        const { error } = await window.supabaseClient
            .from('orders')
            .update({ status: 'DELIVERED' })
            .eq('id', orderId);

        if (error) throw error;
        
        alert("عاش يا بطل! تم إضافة الأوردر لمحفظتك. 💪");
        refreshDriverData(); // تحديث فوري للأرقام والقائمة
    } catch (err) {
        alert("حدث خطأ أثناء التحديث.");
    }
};
