// js/admin-dashboard.js

document.addEventListener('DOMContentLoaded', async () => {
    if (sessionStorage.getItem('is_admin') !== 'true') {
        window.location.href = 'admin-login.html';
        return;
    }
    await loadOrders();
});

async function loadOrders() {
    // 1. جلب الطلبات
    const { data: orders, error: orderError } = await window.supabaseClient
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

    if (orderError) return;

    // 2. جلب عدد الأصناف (إضافة جديدة)
    const { count: productsCount, error: prodError } = await window.supabaseClient
        .from('products')
        .select('*', { count: 'exact', head: true });

    // تحديث الأرقام في البطاقات
    document.getElementById('pending-count').textContent = orders.filter(o => o.status === 'PENDING').length;
    document.getElementById('preparing-count').textContent = orders.filter(o => o.status === 'PREPARING').length;
    document.getElementById('delivered-today').textContent = orders.filter(o => o.status === 'DELIVERED').length;
    
    // وضع عدد الأصناف في البطاقة الجديدة
    if (!prodError) {
        document.getElementById('products-count').textContent = productsCount || 0;
    }

    // ملء الجدول
    const list = document.getElementById('admin-orders-list');
    list.innerHTML = '';
    orders.forEach(order => {
        list.innerHTML += `
            <tr>
                <td>#${order.order_code}</td>
                <td>${order.customer_name}</td>
                <td>${window.formatCurrency(order.total_amount)}</td>
                <td><span class="status-badge status-${order.status}">${order.status}</span></td>
                <td>
                    <select onchange="updateOrderStatus(${order.id}, this.value)">
                        <option value="PENDING" ${order.status==='PENDING'?'selected':''}>انتظار</option>
                        <option value="PREPARING" ${order.status==='PREPARING'?'selected':''}>تحضير</option>
                        <option value="WITH_DRIVER" ${order.status==='WITH_DRIVER'?'selected':''}>مع مندوب</option>
                        <option value="DELIVERED" ${order.status==='DELIVERED'?'selected':''}>تم التسليم</option>
                    </select>
                </td>
            </tr>
        `;
    });
}

window.updateOrderStatus = async (orderId, newStatus) => {
    const { error } = await window.supabaseClient
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

    if (!error) {
        alert('تم تحديث حالة الطلب!');
        loadOrders();
    }
};

window.logout = () => {
    sessionStorage.clear();
    window.location.href = 'admin-login.html';
};
