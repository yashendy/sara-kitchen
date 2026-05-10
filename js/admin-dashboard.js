// js/admin-dashboard.js

document.addEventListener('DOMContentLoaded', async () => {
    if (sessionStorage.getItem('is_admin') !== 'true') {
        window.location.href = 'admin-login.html';
        return;
    }
    await loadOrders();
});

async function loadOrders() {
    const { data, error } = await window.supabaseClient
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) return;

    const list = document.getElementById('admin-orders-list');
    list.innerHTML = '';
    
    // تحديث الإحصائيات
    document.getElementById('pending-count').textContent = data.filter(o => o.status === 'PENDING').length;
    document.getElementById('preparing-count').textContent = data.filter(o => o.status === 'PREPARING').length;

    data.forEach(order => {
        list.innerHTML += `
            <tr>
                <td>#${order.order_code}</td>
                <td>${order.customer_name} <br> <small>${order.customer_phone}</small></td>
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
