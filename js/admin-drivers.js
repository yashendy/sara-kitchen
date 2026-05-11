// js/admin-drivers.js

document.addEventListener('DOMContentLoaded', async () => {
    // التحقق من الأدمن
    if (sessionStorage.getItem('is_admin') !== 'true') {
        window.location.href = 'admin-login.html';
        return;
    }

    await loadDriversData();

    document.getElementById('add-driver-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('d-name').value;
        const phone = document.getElementById('d-phone').value;
        const method = document.getElementById('d-method').value; // طريقة التوصيل
        const notes = document.getElementById('d-notes').value;   // ملاحظات للعميل

        try {
            // 1. إضافة المستخدم لجدول users
            // سيتم إدخال "password" لسهولة تسجيل الدخول لاحقاً
            const { data: newUser, error: userError } = await window.supabaseClient
                .from('users')
                .insert([{ 
                    email: `${phone}@sara.com`, 
                    phone: phone,
                    password: phone, // كلمة المرور هي رقم التليفون
                    password_hash: 'not_hashed_yet', // لأننا نستخدم نظام بسيط حالياً
                    role: 'DRIVER', 
                    full_name: name 
                }])
                .select().single();

            if (userError) throw userError;

            // 2. إضافة تفاصيل المندوب لجدول delivery_drivers
            const { error: driverError } = await window.supabaseClient
                .from('delivery_drivers')
                .insert([{ 
                    id: newUser.id, // نستخدم نفس ID اليوزر لتوحيد البيانات
                    user_id: newUser.id,
                    name: name, 
                    phone: phone,
                    delivery_method: method,
                    notes: notes,
                    status: 'ACTIVE'
                }]);

            if (driverError) throw driverError;

            alert("تم تسجيل المندوب بنجاح! يمكنه الدخول برقم هاتفه.");
            hideAddDriverModal();
            location.reload();

        } catch (err) {
            console.error("Error details:", err);
            alert("خطأ: " + err.message);
        }
    });
});

async function loadDriversData() {
    const { data: drivers, error } = await window.supabaseClient
        .from('delivery_drivers')
        .select('*');

    if (error) return;

    const listBody = document.getElementById('drivers-list-body');
    listBody.innerHTML = '';
    
    drivers.forEach(driver => {
        listBody.innerHTML += `
            <tr>
                <td><strong>${driver.name}</strong><br><small>${driver.delivery_method || ''}</small></td>
                <td>${driver.phone}</td>
                <td>نشط</td>
                <td>
                    <button onclick="deleteDriver(${driver.id})" class="btn-remove" style="background:#e74c3c; color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer;">حذف</button>
                </td>
            </tr>
        `;
    });
}
