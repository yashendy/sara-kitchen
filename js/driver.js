// js/driver.js

document.addEventListener('DOMContentLoaded', async () => {
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
        // 1. جلب بيانات المندوب (للحصول على الـ ID الخاص بجدول المناديب)
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

        // --- العمليات الحسابية للمحفظة بناءً على النظام الجديد ---
        let totalCashInHand = 0;   // إجمالي الكاش اللي معاه من الزبائن
        let totalMyEarnings = 0;    // إجمالي عمولته (مكسبه الشخصي)

        const deliveredOrders = orders.filter(o => o.status === 'DELIVERED');
        const pendingOrders = orders.filter(o => o.status === 'WITH_DRIVER');

        deliveredOrders.forEach(order => {
            totalCashInHand += order.total_amount;
            // قراءة العمولة المحددة من الأدمن (لو مش موجودة نعتبرها 30 كافتراضي)
            totalMyEarnings += (order.delivery_commission || 30);
        });

        // الصافي المطلوب توريده للمطبخ (الفلوس اللي معاه - مكسبه)
        // ونخصم منهم أي مبالغ وردها المطبخ سابقاً
        const netToKitchen = (totalCashInHand - totalMyEarnings) - (driver.total_paid_to_kitchen || 0);

        // تحديث واجهة المستخدم
        document.getElementById('wallet-total').textContent = window.formatCurrency(totalCashInHand);
        document.getElementById('wallet-earnings').textContent = window.formatCurrency(totalMyEarnings);
        document.getElementById('wallet-net').textContent = window.formatCurrency(netToKitchen);

        // --- عرض الطلبات الجارية للتوصيل ---
        const container = document.getElementById('driver-orders-list');
        container.innerHTML = '';

        if (pendingOrders.length === 0) {
            container.innerHTML = '<div class="stat-card" style="text-align:center;"><p>لا توجد طلبات جارية حالياً ☕</p></div>';
            return;
        }

        pendingOrders.forEach(order => {
            container.innerHTML += `
                <div class="order-info-card" style="background: white; padding: 15px; border-radius: 12px; margin-bottom: 15px; border-right: 6px solid var(--secondary); box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <h4 style="margin:0;">طلب #${order.order_code}</h4>
                        <span style="background: #e1f5fe; color: #0288d1; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem;">عمولتك: ${order.delivery_commission || 30} ج.م</span>
                    </div>
                    <hr style="border:0; border-top:1px solid #eee; margin:10px 0;">
                    <p><strong>العميل:</strong> ${order.customer_name}</p>
                    <p><strong>العنوان:</strong> ${order.customer_address}</p>
                    <p style="font-size: 1.1rem; color: var(--primary); font-weight: bold;">المطلوب تحصيله: ${window.formatCurrency(order.total_amount)}</p>
                    
                    <div style="display: flex; gap: 10px; margin-top: 15px;">
                        <button onclick="finishOrder(${order.id})" class="btn btn-primary" style="flex: 2;">✅ تم التسليم</button>
                        <a href="tel:${order.customer_phone}" class="btn btn-outline" style="flex: 1; text-align:center;">📞 إتصال</a>
                    </div>
                </div>
            `;
        });

    } catch (err) {
        console.error("Driver Dashboard Error:", err);
    }
}

// دالة إنهاء الطلب
window.finishOrder = async (id) => {
    if (confirm('هل استلمت الكاش بالكامل وسلمت الطلب؟')) {
        const { error } = await window.supabaseClient
            .from('orders')
            .update({ status: 'DELIVERED' })
            .eq('id', id);

        if (!error) {
            location.reload();
        }
    }
};

window.logout = () => { sessionStorage.clear(); window.location.href = 'index.html'; };
