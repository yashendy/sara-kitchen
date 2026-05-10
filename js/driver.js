// js/driver.js

document.addEventListener('DOMContentLoaded', async () => {
    // يمكننا لاحقاً إضافة نظام دخول خاص للمناديب، حالياً سنعرض الطلبات الجارية
    await loadDriverOrders();
});

async function loadDriverOrders() {
    const { data: orders, error } = await window.supabaseClient
        .from('orders')
        .select('*')
        .eq('status', 'WITH_DRIVER') // يعرض فقط ما هو مع المندوب
        .order('created_at', { ascending: false });

    const container = document.getElementById('driver-orders-list');
    container.innerHTML = '';

    if (orders.length === 0) {
        container.innerHTML = '<div class="stat-card"><p>لا توجد طلبات للتوصيل حالياً. استرح قليلاً! ✨</p></div>';
        return;
    }

    orders.forEach(order => {
        container.innerHTML += `
            <div class="order-info-card" style="text-align: right; margin-bottom: 20px; border-right: 5px solid var(--secondary);">
                <div style="display:flex; justify-content: space-between; align-items: center;">
                    <h4>طلب رقم: #${order.order_code}</h4>
                    <span class="status-badge status-DELIVERED">معك الآن</span>
                </div>
                <hr style="margin: 10px 0; border: 0.5px solid #eee;">
                <p><strong>العميل:</strong> ${order.customer_name}</p>
                <p><strong>الهاتف:</strong> <a href="tel:${order.customer_phone}">${order.customer_phone}</a></p>
                <p><strong>العنوان:</strong> ${order.customer_address || 'استلام من المطبخ'}</p>
                <p><strong>المطلوب تحصيله:</strong> <span style="color:var(--secondary); font-weight:bold;">${window.formatCurrency(order.total_amount)}</span></p>
                
                <div style="margin-top: 15px; display: flex; gap: 10px;">
                    <button onclick="finishOrder(${order.id})" class="btn btn-primary" style="background:var(--secondary); flex:1;">تم التسليم ✅</button>
                    <a href="https://wa.me/${order.customer_phone}" class="btn btn-outline" style="border-color: #25D366; color: #25D366; padding: 10px;">واتساب</a>
                </div>
            </div>
        `;
    });
}

window.finishOrder = async (id) => {
    if (confirm('هل قمت بتسليم الطلب وتحصيل المبلغ؟')) {
        const { error } = await window.supabaseClient
            .from('orders')
            .update({ status: 'DELIVERED' })
            .eq('id', id);

        if (!error) {
            alert('أحسنت! تم تحديث حالة الطلب.');
            await loadDriverOrders();
        }
    }
};

window.logout = () => {
    window.location.href = 'index.html';
};
