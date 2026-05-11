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
        // 1. جلب المناديب والطلبات
        const { data: drivers } = await window.supabaseClient.from('delivery_drivers').select('id, name');
        const { data: orders, error } = await window.supabaseClient
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

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
                    <td><strong>${order.customer_name}</strong></td>
                    <td>${window.formatCurrency(order.total_amount)}</td>
                    
                    <td>
                        <select onchange="handleDeliveryChange(${order.id}, this.value)" style="width: 110px; margin-bottom: 5px;">
                            <option value="30" ${order.delivery_commission == 30 ? 'selected' : ''}>داخل / قريبة (30)</option>
                            <option value="50" ${order.delivery_commission == 50 ? 'selected' : ''}>بعيدة (50)</option>
                            <option value="custom" ${order.delivery_commission != 30 && order.delivery_commission != 50 ? 'selected' : ''}>محافظة أخرى</option>
                        </select>
                        <input type="number" id="comm-${order.id}" 
                               value="${order.delivery_commission || 0}" 
                               onchange="updateCommission(${order.id}, this.value)"
                               style="width: 50px; display: ${order.delivery_commission != 30 && order.delivery_commission != 50 ? 'inline' : 'none'};">
                    </td>

                    <td>
                        <select onchange="assignDriver(${order.id}, this.value)">
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
                        </select>
                    </td>
                </tr>
            `;
        });
    } catch (err) { console.error(err); }
}

// دالة التعامل مع تغيير الفئة
window.handleDeliveryChange = async (orderId, value) => {
    const input = document.getElementById(`comm-${orderId}`);
    if (value === 'custom') {
        input.style.display = 'inline';
    } else {
        input.style.display = 'none';
        await updateCommission(orderId, value);
    }
};

// تحديث العمولة في قاعدة البيانات
window.updateCommission = async (orderId, amount) => {
    const { error } = await window.supabaseClient
        .from('orders')
        .update({ delivery_commission: parseFloat(amount) })
        .eq('id', orderId);
    
    if (!error && amount != "custom") alert("تم تحديث سعر التوصيل ✅");
};

// (بقبة الدوال كما هي: assignDriver, updateOrderStatus, getStatusAr)
window.assignDriver = async (orderId, driverId) => {
    await window.supabaseClient.from('orders').update({ driver_id: driverId || null }).eq('id', orderId);
    loadDashboardData();
};

window.updateOrderStatus = async (orderId, status) => {
    await window.supabaseClient.from('orders').update({ status }).eq('id', orderId);
    loadDashboardData();
};

function getStatusAr(s) {
    const m = {'PENDING':'إنتظار','PREPARING':'تحضير','WITH_DRIVER':'مع المندوب','DELIVERED':'تم التسليم'};
    return m[s] || s;
}
