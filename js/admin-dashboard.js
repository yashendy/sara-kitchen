// js/admin-dashboard.js

document.addEventListener('DOMContentLoaded', async () => {
    // 1. التحقق من صلاحية الأدمن قبل تحميل أي بيانات
    if (sessionStorage.getItem('is_admin') !== 'true') {
        window.location.href = 'admin-login.html';
        return;
    }

    // 2. تشغيل دالة تحميل البيانات
    await loadDashboardData();
});

// الدالة الرئيسية لجلب وعرض بيانات لوحة التحكم
async function loadDashboardData() {
    try {
        // --- أولاً: جلب قائمة المناديب من الجدول الجديد ---
        const { data: drivers, error: driverError } = await window.supabaseClient
            .from('delivery_drivers')
            .select('id, name');

        if (driverError) console.error("Error fetching drivers:", driverError);

        // --- ثانياً: جلب بيانات الطلبات ---
        const { data: orders, error: orderError } = await window.supabaseClient
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });

        if (orderError) throw orderError;

        // --- ثالثاً: جلب إحصائية عدد الأصناف ---
        const { count: productsCount, error: prodError } = await window.supabaseClient
            .from('products')
            .select('*', { count: 'exact', head: true });

        if (prodError) console.error("Error fetching products count:", prodError);

        // --- رابعاً: تحديث بطاقات الإحصائيات في واجهة المستخدم ---
        
        document.getElementById('pending-count').textContent = 
            orders.filter(o => o.status === 'PENDING').length;

        document.getElementById('preparing-count').textContent = 
            orders.filter(o => o.status === 'PREPARING').length;

        const today = new Date().toISOString().split('T')[0];
        const deliveredToday = orders.filter(o => 
            o.status === 'DELIVERED' && o.created_at.startsWith(today)
        ).length;
        document.getElementById('delivered-today').textContent = deliveredToday;

        document.getElementById('products-count').textContent = productsCount || 0;

        // --- خامساً: ملء جدول الطلبات ---
        const list = document.getElementById('admin-orders-list');
        list.innerHTML = '';

        if (orders.length === 0) {
            list.innerHTML = '<tr><td colspan="6" style="text-align:center;">لا توجد طلبات مسجلة حتى الآن</td></tr>';
            return;
        }

        orders.forEach(order => {
            // بناء قائمة المناديب المنسدلة لكل طلب
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
                        <select onchange="assignDriver(${order.id}, this.value)" style="width: 130px; padding: 5px; font-size: 0.8rem;">
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

// وظيفة لربط المندوب بالطلب في قاعدة البيانات
window.assignDriver = async (orderId, driverId) => {
    const valueToUpdate = driverId === "" ? null : parseInt(driverId);
    
    const { error } = await window.supabaseClient
        .from('orders')
        .update({ driver_id: valueToUpdate })
        .eq('id', orderId);

    if (error) {
        alert('حدث خطأ أثناء تعيين المندوب: ' + error.message);
    } else {
        // تحديث البيانات لضمان دقة الحسابات في الإحصائيات
        await loadDashboardData();
    }
};

// وظيفة لتحديث حالة الطلب
window.updateOrderStatus = async (orderId, newStatus) => {
    const { error } = await window.supabaseClient
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

    if (error) {
        alert('فشل في تحديث الحالة: ' + error.message);
    } else {
        await loadDashboardData();
    }
};

// وظيفة مساعدة للترجمة
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

// تسجيل الخروج
window.logout = () => {
    sessionStorage.clear();
    window.location.href = 'admin-login.html';
};
