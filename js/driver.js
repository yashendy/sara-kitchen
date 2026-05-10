// js/driver.js

// تنبيه: في المرحلة القادمة سنضيف تسجيل دخول برقم التليفون، حالياً سنعرض البيانات بناءً على أول مندوب مسجل للتجربة
let currentDriverId = 1; 

document.addEventListener('DOMContentLoaded', async () => {
    await loadDriverData();
});

async function loadDriverData() {
    try {
        // 1. جلب بيانات المندوب وحساباته
        const { data: driver, error: dError } = await window.supabaseClient
            .from('delivery_drivers')
            .select('*')
            .eq('id', currentDriverId)
            .single();

        if (dError) throw dError;

        // 2. جلب كل الطلبات المرتبطة بهذا المندوب
        const { data: orders, error: oError } = await window.supabaseClient
            .from('orders')
            .select('*')
            .eq('driver_id', currentDriverId);

        if (oError) throw oError;

        // --- العمليات الحسابية للمحفظة ---
        let totalCashCollected = 0; // إجمالي الكاش اللي استلمه من الناس (للطلبات المسلمة)
        let totalCommission = 0;    // إجمالي عمولته عن كل الطلبات المسلمة

        const deliveredOrders = orders.filter(o => o.status === 'DELIVERED');
        const pendingOrders = orders.filter(o => o.status === 'WITH_DRIVER');

        deliveredOrders.forEach(order => {
            totalCashCollected += order.total_amount;
            totalCommission += (driver.delivery_fee_per_order || 10);
        });

        // الصافي المطلوب توريده للمطبخ (إجمالي الكاش - عمولته)
        const netToKitchen = totalCashCollected - totalCommission;

        // تحديث أرقام المحفظة في الصفحة
        document.getElementById('wallet-total').textContent = window.formatCurrency(totalCashCollected);
        document.getElementById('wallet-earnings').textContent = window.formatCurrency(totalCommission);
        document.getElementById('wallet-net').textContent = window.formatCurrency(netToKitchen);

        // --- عرض الطلبات الجارية فقط (مع المندوب) ---
        const container = document.getElementById('driver-orders-list');
        container.innerHTML = '';

        if (pendingOrders.length === 0) {
            container.innerHTML = '<div class="stat-card"><p>لا توجد طلبات جديدة للتوصيل حالياً.</p></div>';
            return;
        }

        pendingOrders.forEach(order => {
            container.innerHTML += `
                <div class="order-info-card" style="text-align: right; margin-bottom: 15px; border-right: 5px solid var(--secondary); background: white; padding: 15px; border-radius: 10px;">
                    <h4>طلب #${order.order_code}</h4>
                    <p><strong>العميل:</strong> ${order.customer_name}</p>
                    <p><strong>الهاتف:</strong> <a href="tel:${order.customer_phone}">${order.customer_phone}</a></p>
                    <p><strong>العنوان:</strong> ${order.customer_address}</p>
                    <p style="font-size: 1.2rem; color: var(--secondary); font-weight: bold;">المبلغ المطلوب: ${window.formatCurrency(order.total_amount)}</p>
                    
                    <div style="margin-top: 10px; display: flex; gap: 10px;">
                        <button onclick="finishOrder(${order.id})" class="btn btn-primary" style="flex: 1;">تم التسليم ✅</button>
                        <a href="https://wa.me/${order.customer_phone}" class="btn btn-outline" style="border-color: #25D366; color: #25D366;">واتساب</a>
                    </div>
                </div>
            `;
        });

    } catch (err) {
        console.error("Error loading driver dashboard:", err);
    }
}

// دالة إنهاء الطلب وتحويله لـ "تم التسليم"
window.finishOrder = async (id) => {
    if (confirm('هل استلمت المبلغ المذكور وقمت بتسليم الطلب؟')) {
        const { error } = await window.supabaseClient
            .from('orders')
            .update({ status: 'DELIVERED' })
            .eq('id', id);

        if (!error) {
            alert('أحسنت! تم تحديث محفظتك.');
            await loadDriverData(); // إعادة حساب المحفظة فوراً
        }
    }
};

window.logout = () => { window.location.href = 'index.html'; };
