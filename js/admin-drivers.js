// js/admin-drivers.js

// 1. وظائف التحكم في النوافذ المنبثقة (Modals)
window.showAddDriverModal = () => {
    const modal = document.getElementById('add-driver-modal');
    if (modal) modal.style.display = 'flex';
};

window.hideAddDriverModal = () => {
    const modal = document.getElementById('add-driver-modal');
    if (modal) modal.style.display = 'none';
};

window.showEditDriverModal = () => {
    const modal = document.getElementById('edit-driver-modal');
    if (modal) modal.style.display = 'flex';
};

window.hideEditDriverModal = () => {
    const modal = document.getElementById('edit-driver-modal');
    if (modal) modal.style.display = 'none';
};

document.addEventListener('DOMContentLoaded', async () => {
    // التحقق من صلاحية الأدمن
    if (sessionStorage.getItem('is_admin') !== 'true') {
        window.location.href = 'admin-login.html';
        return;
    }

    await loadDriversData();

    // 2. معالجة نموذج إضافة مندوب جديد
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
                        password: phone, 
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
                        id: newUser.id,
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

    // 3. معالجة نموذج تعديل بيانات المندوب
    const editForm = document.getElementById('edit-driver-form');
    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const drId = document.getElementById('edit-d-id').value;
            const uId = document.getElementById('edit-u-id').value;
            const name = document.getElementById('edit-d-name').value;
            const phone = document.getElementById('edit-d-phone').value;
            const method = document.getElementById('edit-d-method').value;
            const notes = document.getElementById('edit-d-notes').value;

            try {
                // تحديث جدول المستخدمين (لتغيير اسم الدخول أو الباسورد)
                const { error: uError } = await window.supabaseClient
                    .from('users')
                    .update({ 
                        full_name: name, 
                        email: `${phone}@sara.com`, 
                        password: phone,
                        phone: phone 
                    })
                    .eq('id', uId);

                if (uError) throw uError;

                // تحديث جدول المناديب
                const { error: dError } = await window.supabaseClient
                    .from('delivery_drivers')
                    .update({ 
                        name: name, 
                        phone: phone, 
                        delivery_method: method, 
                        notes: notes 
                    })
                    .eq('id', drId);

                if (dError) throw dError;

                alert("تم تحديث بيانات المندوب بنجاح ✅");
                hideEditDriverModal();
                location.reload();

            } catch (err) {
                alert("خطأ في التحديث: " + err.message);
            }
        });
    }
});

// 4. جلب وعرض قائمة المناديب في الجدول
async function loadDriversData() {
    const { data: drivers, error } = await window.supabaseClient
        .from('delivery_drivers')
        .select('*')
        .order('created_at', { ascending: false });

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
                        <button onclick="openEditDriverModal(${driver.id})" class="btn-primary" style="padding:5px 10px; margin-left:5px; cursor:pointer;">تعديل</button>
                        <button onclick="deleteDriver(${driver.id}, ${driver.user_id})" class="btn-remove" style="padding:5px 10px; cursor:pointer;">حذف</button>
                    </td>
                </tr>
            `;
        });
    }
}

// 5. فتح نافذة التعديل وملء البيانات
window.openEditDriverModal = async (driverId) => {
    const { data: driver, error } = await window.supabaseClient
        .from('delivery_drivers')
        .select('*')
        .eq('id', driverId)
        .single();

    if (driver) {
        document.getElementById('edit-d-id').value = driver.id;
        document.getElementById('edit-u-id').value = driver.user_id;
        document.getElementById('edit-d-name').value = driver.name;
        document.getElementById('edit-d-phone').value = driver.phone;
        document.getElementById('edit-d-method').value = driver.delivery_method || 'سيارة';
        document.getElementById('edit-d-notes').value = driver.notes || '';
        
        showEditDriverModal();
    }
};

// 6. حذف المندوب وحسابه
window.deleteDriver = async (drId, uId) => {
    if (confirm('هل أنت متأكد من حذف المندوب نهائياً؟ سيتم حذف حساب الدخول الخاص به أيضاً.')) {
        // الحذف من جدول users سيحذف من delivery_drivers تلقائياً بسبب ON DELETE CASCADE
        const { error } = await window.supabaseClient
            .from('users')
            .delete()
            .eq('id', uId);
        
        if (!error) {
            location.reload();
        } else {
            alert("خطأ في الحذف: " + error.message);
        }
    }
};
