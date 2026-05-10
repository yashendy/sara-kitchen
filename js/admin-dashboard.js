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
        // --- أولاً: جلب بيانات الطلبات ---
        const { data: orders, error: orderError } = await window.supabaseClient
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });

        if (orderError) throw orderError;

        // --- ثانياً: جلب إحصائية عدد الأصناف (إضافة جديدة) ---
        const { count: productsCount, error: prodError } = await window.supabaseClient
            .from('products')
            .select('*', { count: 'exact', head: true });

        if (prodError) console.error("Error fetching products count:", prodError);

        // --- ثالثاً: تحديث بطاقات الإحصائيات في واجهة المستخدم ---
        
        // 1. طلبات بانتظار التأكيد
        document.getElementById('pending-count').textContent = 
            orders.filter(o => o.status === 'PENDING').length;

        // 2. طلبات قيد التحضير في المطبخ
        document.getElementById('preparing-count').textContent = 
            orders.filter(o => o.status === 'PREPARING').length;

        // 3. الطلبات التي تم تسليمها اليوم فقط
        const today = new Date().toISOString().split('T')[0];
        const deliveredToday = orders.filter(o => 
            o.status === 'DELIVERED' && o.created_at.startsWith(today)
        ).length;
        document.getElementById('delivered-today').textContent = deliveredToday;

        // 4. إجمالي الأصناف في المنيو
        document.getElementById('products-count').textContent = productsCount || 0;

        // --- رابعاً: ملء جدول الطلبات ---
        const list = document.getElementById('admin-orders-list');
        list.innerHTML = '';

        if (orders.length === 0) {
            list.innerHTML = '<tr><td colspan="5" style="text-align:center;">لا توجد طلبات مسجلة حتى الآن</td></tr>';
            return;
        }

        orders.forEach(order => {
            list.innerHTML += `
                <tr>
                    <td>#${order.order_code}</td>
                    <td>
                        <strong>${order.customer_name}</strong><br>
                        <small>${order.customer_phone}</small>
                    </td>
                    <td>${window.formatCurrency(order.total_amount)}</td>
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

// وظيفة لتحديث حالة الطلب في قاعدة البيانات
window.updateOrderStatus = async (orderId, newStatus) => {
    const { error } = await window.supabaseClient
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

    if (error) {
        alert('فشل في تحديث الحالة: ' + error.message);
    } else {
        // تحديث البيانات في الصفحة دون الحاجة لعمل Refresh كامل
        await loadDashboardData();
    }
};

// وظيفة مساعدة لتحويل الرموز إلى كلمات عربية داخل الجدول
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

// وظيفة تسجيل الخروج
window.logout = () => {
    sessionStorage.clear();
    window.location.href = 'admin-login.html';
};
