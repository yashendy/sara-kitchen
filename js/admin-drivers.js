// js/admin-drivers.js

document.addEventListener('DOMContentLoaded', async () => {
    if (sessionStorage.getItem('is_admin') !== 'true') {
        window.location.href = 'admin-login.html';
        return;
    }
    await loadDriversData();

    document.getElementById('add-driver-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('d-name').value;
        const phone = document.getElementById('d-phone').value;
        const email = `${phone}@sara.com`;

        try {
            // الخطوة 1: إنشاء حساب المستخدم
            const { data: user, error: userError } = await window.supabaseClient
                .from('users')
                .insert([{ 
                    email: email, 
                    password: phone, // سيستخدم رقم تليفونه ككلمة مرور
                    role: 'DRIVER', 
                    full_name: name 
                }])
                .select().single();

            if (userError) throw userError;

            // الخطوة 2: ربط بيانات المندوب
            const { error: drError } = await window.supabaseClient
                .from('delivery_drivers')
                .insert([{ 
                    user_id: user.id, 
                    name: name, 
                    phone: phone 
                }]);

            if (drError) throw drError;

            alert("تم تسجيل المندوب بنجاح ✅");
            hideAddDriverModal();
            location.reload(); // إعادة تحميل الصفحة لتحديث الجدول

        } catch (err) {
            console.error("Error Details:", err);
            alert("خطأ: " + (err.message || "تأكد من إعدادات قاعدة البيانات"));
        }
    });
});

async function loadDriversData() {
    // جلب المناديب والطلبات المسلمة
    const { data: drivers } = await window.supabaseClient.from('delivery_drivers').select('*');
    const { data: orders } = await window.supabaseClient.from('orders').select('*').eq('status', 'DELIVERED');

    const listBody = document.getElementById('drivers-list-body');
    if (!listBody) return;
    listBody.innerHTML = '';
    
    let totalPayouts = 0;

    if (drivers) {
        drivers.forEach(driver => {
            const dOrders = orders ? orders.filter(o => o.driver_id === driver.id) : [];
            const earnings = dOrders.reduce((sum, o) => sum + (o.delivery_commission || 10), 0);
            totalPayouts += earnings;

            listBody.innerHTML += `
                <tr>
                    <td>${driver.name}</td>
                    <td>${driver.phone}</td>
                    <td>${dOrders.length} طلب</td>
                    <td>${window.formatCurrency(earnings)}</td>
                    <td><button onclick="deleteDriver(${driver.id}, ${driver.user_id})" class="btn-remove">حذف</button></td>
                </tr>
            `;
        });
    }

    document.getElementById('active-drivers-count').textContent = drivers ? drivers.length : 0;
    document.getElementById('total-driver-payouts').textContent = window.formatCurrency(totalPayouts);
}

window.showAddDriverModal = () => document.getElementById('add-driver-modal').style.display = 'flex';
window.hideAddDriverModal = () => document.getElementById('add-driver-modal').style.display = 'none';

window.deleteDriver = async (drId, uId) => {
    if (confirm('حذف المندوب نهائياً؟')) {
        await window.supabaseClient.from('users').delete().eq('id', uId);
        location.reload();
    }
};
