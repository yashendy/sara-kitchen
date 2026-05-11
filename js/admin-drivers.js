// js/admin-drivers.js

// 1. وظائف إظهار وإخفاء النافذة (لحل مشكلة الزر)
window.showAddDriverModal = () => {
    const modal = document.getElementById('add-driver-modal');
    if (modal) modal.style.display = 'flex';
};

window.hideAddDriverModal = () => {
    const modal = document.getElementById('add-driver-modal');
    if (modal) modal.style.display = 'none';
};

document.addEventListener('DOMContentLoaded', async () => {
    // التحقق من الأدمن
    if (sessionStorage.getItem('is_admin') !== 'true') {
        window.location.href = 'admin-login.html';
        return;
    }

    await loadDriversData();

    // 2. معالجة نموذج الإضافة
    const addForm = document.getElementById('add-driver-form');
    if (addForm) {
        addForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('d-name').value;
            const phone = document.getElementById('d-phone').value;
            const method = document.getElementById('d-method').value;
            const notes = document.getElementById('d-notes').value;

            try {
                // المرحلة الأولى: إضافة المستخدم لجدول users
                const { data: newUser, error: userError } = await window.supabaseClient
                    .from('users')
                    .insert([{ 
                        email: `${phone}@sara.com`, 
                        phone: phone,
                        password: phone, // كلمة المرور هي رقم الهاتف
                        password_hash: 'manual_entry', 
                        role: 'DRIVER', 
                        full_name: name 
                    }])
                    .select().single();

                if (userError) throw userError;

                // المرحلة الثانية: إضافة تفاصيل المندوب لجدول delivery_drivers
                const { error: driverError } = await window.supabaseClient
                    .from('delivery_drivers')
                    .insert([{ 
                        id: newUser.id, // ربط الـ ID بجدول المستخدمين
                        user_id: newUser.id,
                        name: name, 
                        phone: phone,
                        delivery_method: method,
                        notes: notes,
                        status: 'ACTIVE'
                    }]);

                if (driverError) throw driverError;

                alert("تم تسجيل المندوب بنجاح! ✅\nيمكنه الدخول برقم هاتفه.");
                hideAddDriverModal();
                location.reload();

            } catch (err) {
                console.error("Error details:", err);
                alert("حدث خطأ: " + err.message);
            }
        });
    }
});

// 3. عرض قائمة المناديب
async function loadDriversData() {
    const { data: drivers, error } = await window.supabaseClient
        .from('delivery_drivers')
        .select('*');

    if (error) return;

    const listBody = document.getElementById('drivers-list-body');
    if (listBody) {
        listBody.innerHTML = '';
        drivers.forEach(driver => {
            listBody.innerHTML += `
                <tr>
                    <td><strong>${driver.name}</strong><br><small>${driver.delivery_method || ''}</small></td>
                    <td>${driver.phone}</td>
                    <td><span class="status-badge status-DELIVERED">${driver.status}</span></td>
                    <td>
                        <button onclick="deleteDriver(${driver.id}, ${driver.user_id})" class="btn-remove">حذف</button>
                    </td>
                </tr>
            `;
        });
    }
}

window.deleteDriver = async (drId, uId) => {
    if (confirm('هل أنت متأكد من حذف المندوب نهائياً؟')) {
        const { error } = await window.supabaseClient.from('users').delete().eq('id', uId);
        if (!error) location.reload();
    }
};
