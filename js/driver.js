// js/driver.js

document.addEventListener('DOMContentLoaded', async () => {
    // التأكد من أن المستخدم مندوب وجلب الـ ID بتاعه
    const role = sessionStorage.getItem('user_role');
    const userId = sessionStorage.getItem('user_id'); // 👈 السر هنا

    if (role !== 'DRIVER' || !userId) {
        window.location.href = 'login.html';
        return;
    }

    const fullName = sessionStorage.getItem('user_full_name') || 'يا بطل';
    const nameEl = document.getElementById('driver-name');
    if(nameEl) nameEl.innerText = `أهلاً، ${fullName.split(' ')[0]} 👋`;

    await refreshDriverData(userId);
});

async function refreshDriverData(userId) {
    const container = document.getElementById('orders-list');
    if (!container) return; 

    try {
        // 1. جلب الطلبات المعينة "لهذا المندوب فقط" باستخدام الـ ID
        const { data: orders, error } = await window.supabaseClient
            .from('orders')
            .select('*')
            .eq('driver_id', userId) // 👈 التعديل الأهم
            .order('created_at', { ascending: false });

        if (error) throw error;

       // 2. الحسابات المحاسبية (المحفظة)
        let totalCashCollected = 0;   
        let myEarnings = 0;
        let alreadyPaidToAdmin = 0;
        
        const deliveredOrders = orders.filter(o => o.status === 'DELIVERED');
        const activeOrders = orders.filter(o => o.status === 'WITH_DRIVER' || o.status === 'PENDING' || o.status === 'PREPARING');

        deliveredOrders.forEach(o => {
            const comm = o.delivery_commission || 30;
            totalCashCollected += (o.total_amount + comm);
            myEarnings += comm;
            alreadyPaidToAdmin += (o.admin_received_amount || 0); // الفلوس اللي وردها
        });

        // اللي في جيبه = اللي حصله - اللي ورده
        const cashWithMe = totalCashCollected - alreadyPaidToAdmin;
        // اللي عليه للمطبخ = (إجمالي فواتير المطبخ) - اللي ورده
        const netToKitchen = (totalCashCollected - myEarnings) - alreadyPaidToAdmin;

        // تحديث أرقام المحفظة في الواجهة
        const statCash = document.getElementById('stat-cash');
        const statEarn = document.getElementById('stat-earnings');
        const statNet = document.getElementById('stat-net');

        if(statCash) statCash.innerText = `${cashWithMe > 0 ? cashWithMe.toFixed(0) : 0} ج`;
        if(statEarn) statEarn.innerText = `${myEarnings.toFixed(0)} ج`;
        if(statNet) statNet.innerText = `${netToKitchen > 0 ? netToKitchen.toFixed(0) : 0} ج`;

        // 3. عرض قائمة الطلبات النشطة
        if (activeOrders.length === 0) {
            container.innerHTML = '<div style="text-align:center; padding:40px; color:#94a3b8;"><span style="font-size:2.5rem; display:block; margin-bottom:10px;">☕</span>مفيش طلبات حالياً.. استريح شوية!</div>';
            return;
        }

        container.innerHTML = '';
        activeOrders.forEach(order => {
            // معالجة المكونات عشان تظهر للمندوب بشكل منسق
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

            const totalToCollect = order.total_amount + (order.delivery_commission || 0);
            
            // رابط ذكي لخرائط جوجل
            const mapUrl = `https://maps.google.com/?q=${encodeURIComponent(order.customer_address)}`;

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
    if (!confirm("هل استلمت المبلغ كامل وسلمت الطلب للعميل؟ 💰")) return;

    try {
        const { error } = await window.supabaseClient
            .from('orders')
            .update({ status: 'DELIVERED' })
            .eq('id', orderId);

        if (error) throw error;
        
        alert("عاش يا بطل! تم إضافة الأوردر لمحفظتك. 💪");
        const userId = sessionStorage.getItem('user_id');
        refreshDriverData(userId); // تحديث فوري للأرقام والقائمة
    } catch (err) {
        alert("حدث خطأ أثناء التحديث.");
    }
};
