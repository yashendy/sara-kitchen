// js/driver.js

document.addEventListener('DOMContentLoaded', async () => {
    // الاعتماد على نظام تسجيل الدخول الخاص بك
    const userId = sessionStorage.getItem('user_id');
    const userRole = sessionStorage.getItem('user_role');

    if (!userId || userRole !== 'DRIVER') {
        window.location.href = 'admin-login.html';
        return;
    }

    await loadDriverData(userId);
});

async function loadDriverData(userId) {
    try {
        // 1. جلب بيانات المندوب
        const { data: driver, error: dError } = await window.supabaseClient
            .from('delivery_drivers')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (dError) throw dError;

        // 2. جلب كل الطلبات المرتبطة بهذا المندوب
        const { data: orders, error: oError } = await window.supabaseClient
            .from('orders')
            .select('*')
            .eq('driver_id', driver.id);

        if (oError) throw oError;

        // --- العمليات الحسابية للمحفظة ---
        let totalCashInHand = 0;   
        let totalMyEarnings = 0;    

        const deliveredOrders = orders.filter(o => o.status === 'DELIVERED');
        const pendingOrders = orders.filter(o => o.status === 'WITH_DRIVER');

        deliveredOrders.forEach(order => {
            totalCashInHand += order.total_amount;
            totalMyEarnings += (order.delivery_commission || 30);
        });

        const netToKitchen = (totalCashInHand - totalMyEarnings) - (driver.total_paid_to_kitchen || 0);

        // إذا كانت دالة formatCurrency غير موجودة نستخدم التقريب العادي
        const formatMoney = window.formatCurrency ? window.formatCurrency : (val) => val.toFixed(2) + ' ج.م';

        document.getElementById('wallet-total').textContent = formatMoney(totalCashInHand);
        document.getElementById('wallet-earnings').textContent = formatMoney(totalMyEarnings);
        document.getElementById('wallet-net').textContent = formatMoney(netToKitchen);

        // --- عرض الطلبات الجارية للتوصيل مع المكونات ---
        const container = document.getElementById('driver-orders-list');
        container.innerHTML = '';

        if (pendingOrders.length === 0) {
            container.innerHTML = '<div style="text-align:center; padding:30px; background:white; border-radius:12px;"><h3 style="color:#64748b;">لا توجد طلبات جارية حالياً ☕</h3><p>خذ استراحة، سنرسل لك طلبات قريباً.</p></div>';
            return;
        }

        pendingOrders.forEach(order => {
            // معالجة ذكية للأصناف ليراجعها المندوب مع العميل
            let itemsText = "تفاصيل غير متوفرة";
            if (order.items) {
                let itemsArray = order.items;
                if (typeof itemsArray === 'string') {
                    try { itemsArray = JSON.parse(itemsArray); } catch(e){}
                }
                if (Array.isArray(itemsArray) && itemsArray.length > 0) {
                    itemsText = itemsArray.map(item => `✔️ ${item.quantity}x ${item.name}`).join('<br>');
                }
            }

            container.innerHTML += `
                <div class="driver-card">
                    <div class="order-header">
                        <h4 style="margin:0; color:#1e293b;">طلب #${order.order_code}</h4>
                        <span class="commission-badge">عمولتك: ${order.delivery_commission || 30} ج</span>
                    </div>
                    
                    <h3 style="margin: 0 0 5px 0;">👤 ${order.customer_name}</h3>
                    <p style="margin: 0 0 10px 0; color: #475569;">📍 <strong>العنوان:</strong> ${order.customer_address}</p>
                    
                    <div class="items-box">
                        <strong>🛒 محتويات الأوردر:</strong><br>
                        ${itemsText}
                    </div>

                    <div style="text-align: center; margin: 15px 0;">
                        <span class="payment-badge">المطلوب تحصيله كاش: ${formatMoney(order.total_amount)}</span>
                    </div>
                    
                    <a href="tel:${order.customer_phone}" class="btn-call">
                        📞 اتصال بالعميل
                    </a>

                    <button onclick="finishOrder(${order.id}, '${order.order_code}')" class="btn-deliver">
                        ✅ تم التسليم واستلام الكاش
                    </button>
                </div>
            `;
        });

    } catch (err) {
        console.error("Driver Dashboard Error:", err);
    }
}

// دالة إنهاء الطلب المعدلة
window.finishOrder = async (id, code) => {
    if (confirm(`هل استلمت الكاش بالكامل وسلمت الطلب رقم ${code}؟`)) {
        try {
            const { error } = await window.supabaseClient
                .from('orders')
                .update({ status: 'DELIVERED' })
                .eq('id', id);

            if (error) throw error;
            
            alert("عاش يا بطل! تم التقفيل وإضافة العمولة لمحفظتك.");
            location.reload(); // تحديث الصفحة لإعادة حساب المحفظة فوراً
        } catch (err) {
            alert("حدث خطأ أثناء تقفيل الطلب.");
        }
    }
};

window.logout = () => { 
    sessionStorage.clear(); 
    window.location.href = 'index.html'; 
};
