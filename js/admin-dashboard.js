// js/admin-dashboard.js

document.addEventListener('DOMContentLoaded', async () => {
    if (sessionStorage.getItem('is_admin') !== 'true') {
        window.location.href = 'admin-login.html';
        return;
    }
    await loadDashboardData();
});

async function loadDashboardData() {
    try {
        // 1. جلب قائمة المناديب
        const { data: drivers, error: driverError } = await window.supabaseClient
            .from('delivery_drivers')
            .select('id, name');

        if (driverError) console.error("Error fetching drivers:", driverError);

        // 2. جلب الطلبات
        const { data: orders, error: orderError } = await window.supabaseClient
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });

        if (orderError) throw orderError;

        // 3. جلب إحصائية الأصناف
        const { count: productsCount } = await window.supabaseClient
            .from('products')
            .select('*', { count: 'exact', head: true });

        // --- تحديث بطاقات الإحصائيات ---
        document.getElementById('pending-count').textContent = orders.filter(o => o.status === 'PENDING').length;
        document.getElementById('preparing-count').textContent = orders.filter(o => o.status === 'PREPARING').length;
        
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('delivered-today').textContent = orders.filter(o => 
            o.status === 'DELIVERED' && o.created_at.startsWith(today)
        ).length;
        
        document.getElementById('products-count').textContent = productsCount || 0;

        // --- ملء جدول الطلبات ---
        const list = document.getElementById('admin-orders-list');
        list.innerHTML = '';

        orders.forEach(order => {
            // بناء قائمة المناديب
            let driverOptions = `<option value="">-- اختر مندوب --</option>`;
            if (drivers) {
                drivers.forEach(d => {
                    driverOptions += `<option value="${d.id}" ${order.driver_id === d.id ? 'selected' : ''}>${d.name}</option>`;
                });
            }

            list.innerHTML += `
                <tr>
                    <td>#${order.order_code}</td>
                    <td>
                        <strong>${order.customer_name}</strong><br>
                        <small>${order.customer_phone}</small>
                    </td>
                    <td>${window.formatCurrency(order.total_amount)}</td>
                    
                    <td>
                        <div style="display:flex; align-items:center; gap:5px;">
                            <input type="number" 
                                   value="${order.delivery_commission || 10}" 
                                   onchange="updateCommission(${order.id}, this.value)" 
                                   style="width: 50px; padding: 4px; border: 1px solid #ddd; border-radius: 4px;">
                            <span style="font-size: 0.7rem;">ج.م</span>
                        </div>
                    </td>

                    <td>
                        <select onchange="assignDriver(${order.id}, this.value)" style="width: 120px; padding: 5px; font-size: 0.8rem;">
                            ${driverOptions}
                        </select>
                    </td>
                    
                    <td><span class="status-badge status-${order.status}">${getStatusAr(order.status)}</span></td>
                    
                    <td>
                        <select onchange="updateOrderStatus(${order.id}, this.value)">
                            <option value="PENDING" ${order.status === 'PENDING' ? 'selected' : ''}>إنتظار</option>
                            <option value="PREPARING" ${order.status === 'PREPARING' ? 'selected' : ''}>تحضير</option>
                            <option value="WITH_DRIVER" ${order.status === 'WITH_DRIVER' ? 'selected' : ''}>مع المندوب</option>
                            <option value="DELIVERED" ${order.status === 'DELIVERED' ? 'selected' : ''}>تم التسليم</option>
                            <option value="CANCELLED" ${order.status === 'CANCELLED' ? 'selected' : ''}>إلغاء الطلب</option>
                        </select>
                    </td>
                </tr>
            `;
        });

    } catch (err) {
        console.error("Dashboard Load Error:", err);
    }
}

// دالة تحديث عمولة التوصيل (داخل أو خارج المنطقة)
window.updateCommission = async (orderId, amount) => {
    const { error } = await window.supabaseClient
        .from('orders')
        .update({ delivery_commission: parseFloat(amount) })
        .eq('id', orderId);

    if (error) alert('خطأ في تحديث العمولة: ' + error.message);
};

// دالة ربط المندوب بالطلب
window.assignDriver = async (orderId, driverId) => {
    const valueToUpdate = driverId === "" ? null : parseInt(driverId);
    const { error } = await window.supabaseClient
        .from('orders')
        .update({ driver_id: valueToUpdate })
        .eq('id', orderId);

    if (error) alert('خطأ في تعيين المندوب: ' + error.message);
    else await loadDashboardData();
};

// دالة تحديث الحالة
window.updateOrderStatus = async (orderId, newStatus) => {
    const { error } = await window.supabaseClient
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

    if (!error) await loadDashboardData();
};

function getStatusAr(status) {
    const statusMap = {
        'PENDING': 'بانتظار التأكيد',
        'PREPARING': 'جاري التحضير',
        'WITH_DRIVER': 'مع المندوب',
        'DELIVERED': 'تم التسليم',
        'CANCELLED': 'ملغي'
    };
    return statusMap[status] || status;
}

window.logout = () => {
    sessionStorage.clear();
    window.location.href = 'admin-login.html';
};
