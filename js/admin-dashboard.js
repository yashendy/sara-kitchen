// js/admin-dashboard.js

document.addEventListener('DOMContentLoaded', async () => {
    // 1. التحقق من الصلاحيات
    if (sessionStorage.getItem('is_admin') !== 'true') {
        window.location.href = 'login.html';
        return;
    }

    // 2. إعداد تواريخ التقارير الافتراضية (من أول الشهر لليوم)
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    document.getElementById('start-date').value = firstDay.toISOString().split('T')[0];
    document.getElementById('end-date').value = today.toISOString().split('T')[0];

    // 3. تشغيل دالة إدارة العمليات (شغلك القديم) ودالة التقارير المالية (الجديدة)
    await loadDashboardData(); 
    await window.loadDashboardStats(); 
});

// ==========================================
// القسم الأول: التقارير المالية (الجديد)
// ==========================================
window.loadDashboardStats = async () => {
    const startDate = document.getElementById('start-date').value;
    let endDate = document.getElementById('end-date').value;
    
    if (!startDate || !endDate) return;

    const endDateTime = new Date(endDate);
    endDateTime.setHours(23, 59, 59, 999);

    try {
        const { data: orders, error } = await window.supabaseClient
            .from('orders')
            .select('total_amount, delivery_commission, settled_with_admin')
            .eq('status', 'DELIVERED')
            .gte('created_at', new Date(startDate).toISOString())
            .lte('created_at', endDateTime.toISOString());

        if (error) throw error;

        let totalKitchenSales = 0; 
        let totalCommissions = 0;  
        let netInSafe = 0;         
        let pendingOutside = 0;    

        orders.forEach(order => {
            const customerPaid = order.total_amount; 
            const driverCommission = order.delivery_commission || 0; 
            const kitchenShare = customerPaid - driverCommission; 

            totalKitchenSales += kitchenShare;
            totalCommissions += driverCommission;

            if (order.settled_with_admin === true) {
                netInSafe += kitchenShare; 
            } else {
                pendingOutside += kitchenShare;
            }
        });

        document.getElementById('stat-sales').innerText = totalKitchenSales.toFixed(0) + ' ج';
        document.getElementById('stat-commissions').innerText = totalCommissions.toFixed(0) + ' ج';
        document.getElementById('stat-net').innerText = netInSafe.toFixed(0) + ' ج';
        document.getElementById('stat-pending').innerText = pendingOutside.toFixed(0) + ' ج';

    } catch (err) {
        console.error("خطأ في جلب تقارير الداشبورد:", err);
    }
};

// ==========================================
// القسم الثاني: إدارة العمليات (الكود القديم الخاص بكِ معدل للعمل بكفاءة)
// ==========================================
async function loadDashboardData() {
    try {
        const { data: drivers } = await window.supabaseClient.from('delivery_drivers').select('id, name');
        const { data: orders, error } = await window.supabaseClient
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // تحديث إحصائيات العمليات السريعة (المربعات التي تعلو الجدول)
        const todayStart = new Date();
        todayStart.setHours(0,0,0,0);
        
        let pending = 0, preparing = 0, deliveredToday = 0;
        orders.forEach(o => {
            if(o.status === 'PENDING') pending++;
            if(o.status === 'PREPARING') preparing++;
            if(o.status === 'DELIVERED' && new Date(o.created_at) >= todayStart) deliveredToday++;
        });

        document.getElementById('pending-count').innerText = pending;
        document.getElementById('preparing-count').innerText = preparing;
        document.getElementById('delivered-today').innerText = deliveredToday;

        // بناء جدول الطلبات
        const list = document.getElementById('admin-orders-list');
        list.innerHTML = '';

        orders.forEach(order => {
            let driverOptions = `<option value="">-- اختر مندوب --</option>`;
            if (drivers) {
                drivers.forEach(d => {
                    driverOptions += `<option value="${d.id}" ${order.driver_id === d.id ? 'selected' : ''}>${d.name}</option>`;
                });
            }

            list.innerHTML += `
                <tr>
                    <td style="font-weight:bold;">#${order.order_code}</td>
                    <td><strong>${order.customer_name}</strong></td>
                    <td style="color:var(--primary); font-weight:bold;">${window.formatCurrency ? window.formatCurrency(order.total_amount) : order.total_amount + ' ج'}</td>
                    
                    <td>
                        <select onchange="handleDeliveryChange(${order.id}, this.value)" style="width: 110px; margin-bottom: 5px; padding:5px; border-radius:5px;">
                            <option value="30" ${order.delivery_commission == 30 ? 'selected' : ''}>داخل / قريبة (30)</option>
                            <option value="50" ${order.delivery_commission == 50 ? 'selected' : ''}>بعيدة (50)</option>
                            <option value="custom" ${order.delivery_commission != 30 && order.delivery_commission != 50 ? 'selected' : ''}>مخصص</option>
                        </select>
                        <input type="number" id="comm-${order.id}" 
                               value="${order.delivery_commission || 0}" 
                               onchange="updateCommission(${order.id}, this.value)"
                               style="width: 60px; padding:5px; border-radius:5px; display: ${order.delivery_commission != 30 && order.delivery_commission != 50 ? 'inline' : 'none'};">
                    </td>

                    <td>
                        <select onchange="assignDriver(${order.id}, this.value)" style="padding:5px; border-radius:5px;">
                            ${driverOptions}
                        </select>
                    </td>
                    
                    <td><span class="status-badge status-${order.status}">${getStatusAr(order.status)}</span></td>
                    
                    <td>
                        <select onchange="updateOrderStatus(${order.id}, this.value)" style="padding:5px; border-radius:5px; background:#f8fafc; border:1px solid #cbd5e1;">
                            <option value="PENDING" ${order.status === 'PENDING' ? 'selected' : ''}>إنتظار</option>
                            <option value="PREPARING" ${order.status === 'PREPARING' ? 'selected' : ''}>تحضير</option>
                            <option value="WITH_DRIVER" ${order.status === 'WITH_DRIVER' ? 'selected' : ''}>مع المندوب</option>
                            <option value="DELIVERED" ${order.status === 'DELIVERED' ? 'selected' : ''}>تم التسليم</option>
                        </select>
                    </td>
                </tr>
            `;
        });
    } catch (err) { console.error("Error loading dashboard data:", err); }
}

// ==========================================
// دوال تحديث الطلبات (من كودك القديم)
// ==========================================
window.handleDeliveryChange = async (orderId, value) => {
    const input = document.getElementById(`comm-${orderId}`);
    if (value === 'custom') {
        input.style.display = 'inline';
    } else {
        input.style.display = 'none';
        await updateCommission(orderId, value);
    }
};

window.updateCommission = async (orderId, amount) => {
    const { error } = await window.supabaseClient
        .from('orders')
        .update({ delivery_commission: parseFloat(amount) })
        .eq('id', orderId);
    
    if (!error && amount !== "custom") {
        alert("تم تحديث سعر التوصيل ✅");
        window.loadDashboardStats(); // تحديث الحسابات المالية فوراً
    }
};

window.assignDriver = async (orderId, driverId) => {
    await window.supabaseClient.from('orders').update({ driver_id: driverId || null }).eq('id', orderId);
    loadDashboardData();
};

window.updateOrderStatus = async (orderId, status) => {
    await window.supabaseClient.from('orders').update({ status }).eq('id', orderId);
    loadDashboardData();
    window.loadDashboardStats(); // تحديث الحسابات لو الطلب بقى 'تم التسليم'
};

function getStatusAr(s) {
    const m = {'PENDING':'إنتظار','PREPARING':'تحضير','WITH_DRIVER':'مع المندوب','DELIVERED':'تم التسليم'};
    return m[s] || s;
}
