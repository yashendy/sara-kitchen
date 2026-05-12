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

    // استدعاء دالة تحميل البيانات المطورة
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
                const { error: uError } = await window.supabaseClient
                    .from('users')
                    .update({ full_name: name, email: `${phone}@sara.com`, password: phone, phone: phone })
                    .eq('id', uId);
                if (uError) throw uError;

                const { error: dError } = await window.supabaseClient
                    .from('delivery_drivers')
                    .update({ name: name, phone: phone, delivery_method: method, notes: notes })
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

// === 4. الدالة المطورة لجلب المناديب وحساب المستحقات المالية ===
async function loadDriversData() {
    try {
        const { data: drivers, error: dError } = await window.supabaseClient
            .from('delivery_drivers')
            .select('*')
            .order('created_at', { ascending: false });
        if (dError) throw dError;

        // جلب كل الطلبات اللي تم تسليمها لحساب المستحقات
        const { data: orders, error: oError } = await window.supabaseClient
            .from('orders')
            .select('driver_id, delivery_commission, created_at')
            .eq('status', 'DELIVERED');
        if (oError) throw oError;

        const listBody = document.getElementById('drivers-list-body');
        if (!listBody) return;
        listBody.innerHTML = '';

        const startOfDay = new Date();
        startOfDay.setHours(0,0,0,0);

        let activeCount = 0;
        let totalPayoutsToday = 0;

        drivers.forEach(driver => {
            if (driver.status === 'ACTIVE' || driver.is_active) activeCount++;

            // فلترة الطلبات الخاصة بالمندوب ده بس
            const driverOrders = orders.filter(o => o.driver_id === driver.id);
            const todayOrders = driverOrders.filter(o => new Date(o.created_at) >= startOfDay);
            
            // حساب المستحقات المادية (إجمالي العمولات للطلبات المسلمة بشكل عام)
            const totalDues = driverOrders.reduce((sum, o) => sum + (o.delivery_commission || 30), 0);
            
            // حساب مستحقات (اليوم) للإحصائيات العلوية
            const todayDues = todayOrders.reduce((sum, o) => sum + (o.delivery_commission || 30), 0);
            totalPayoutsToday += todayDues;

            const statusBadge = (driver.status === 'ACTIVE' || driver.is_active)
                ? `<span style="background:#10b981; color:white; padding:4px 8px; border-radius:12px; font-size:0.8rem;">ACTIVE</span>`
                : `<span style="background:#ef4444; color:white; padding:4px 8px; border-radius:12px; font-size:0.8rem;">INACTIVE</span>`;

            listBody.innerHTML += `
                <tr>
                    <td>
                        <strong>${driver.name}</strong><br>
                        <span style="font-size:0.85rem; color:#64748b;">${driver.delivery_method || 'غير محدد'}</span>
                    </td>
                    <td>${driver.phone || '-'}</td>
                    <td style="text-align:center;">
                        <span style="font-weight:bold; color:#0f172a;">${todayOrders.length}</span><br>
                        ${statusBadge}
                    </td>
                    <td style="font-weight:bold; color:#d97706; font-size:1.1rem; text-align:center;">
                        ${totalDues} ج.م
                    </td>
                    <td style="display:flex; gap:5px; justify-content:center;">
                        <button class="btn-status" style="background:#3b82f6; color:white;" onclick="openHistoryModal(${driver.id}, '${driver.name}')">سجل الطلبات 📅</button>
                        <button onclick="openEditDriverModal(${driver.id})" class="btn-primary" style="padding:5px 10px; cursor:pointer;">تعديل</button>
                        <button onclick="deleteDriver(${driver.id}, ${driver.user_id})" class="btn-remove" style="padding:5px 10px; cursor:pointer;">حذف</button>
                    </td>
                </tr>
            `;
        });

        // تحديث الإحصائيات فوق (عدد المناديب وفلوس اليوم)
        const activeEl = document.getElementById('active-drivers-count');
        const payoutsEl = document.getElementById('total-driver-payouts');
        if (activeEl) activeEl.innerText = activeCount;
        if (payoutsEl) payoutsEl.innerText = totalPayoutsToday + ' ج.م';

    } catch (err) {
        console.error("خطأ في جلب بيانات المناديب:", err);
    }
}

// 5. فتح نافذة التعديل
window.openEditDriverModal = async (driverId) => {
    const { data: driver } = await window.supabaseClient.from('delivery_drivers').select('*').eq('id', driverId).single();
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

// 6. حذف المندوب
window.deleteDriver = async (drId, uId) => {
    if (confirm('هل أنت متأكد من حذف المندوب نهائياً؟')) {
        const { error } = await window.supabaseClient.from('users').delete().eq('id', uId);
        if (!error) location.reload();
    }
};


// === 7. دوال نافذة السجل والفرز بالتواريخ ===
let currentHistoryDriverId = null;

window.openHistoryModal = (driverId, driverName) => {
    currentHistoryDriverId = driverId;
    document.getElementById('historyDriverName').innerText = `سجل طلبات: ${driverName}`;
    
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('history-start-date').value = today;
    document.getElementById('history-end-date').value = today;
    
    document.getElementById('historyModal').hidden = false;
    filterDriverHistory();
};

window.closeHistoryModal = () => {
    document.getElementById('historyModal').hidden = true;
};

window.filterDriverHistory = async () => {
    const start = document.getElementById('history-start-date').value;
    const end = document.getElementById('history-end-date').value;
    
    if (!start || !end) return alert("يرجى تحديد تواريخ صحيحة للفرز");

    const startDate = new Date(start); startDate.setHours(0,0,0,0);
    const endDate = new Date(end); endDate.setHours(23,59,59,999);

    try {
        const { data: orders, error } = await window.supabaseClient
            .from('orders')
            .select('*')
            .eq('driver_id', currentHistoryDriverId)
            .eq('status', 'DELIVERED')
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString())
            .order('created_at', { ascending: false });

        if (error) throw error;

        const tbody = document.getElementById('history-table-body');
        tbody.innerHTML = '';
        let totalCommission = 0;

        if (!orders || orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#64748b; padding:20px;">لا توجد طلبات تم تسليمها في هذه الفترة 📭</td></tr>';
        } else {
            orders.forEach(order => {
                const commission = order.delivery_commission || 30;
                totalCommission += commission;
                const time = new Date(order.created_at).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' });
                
                tbody.innerHTML += `
                    <tr>
                        <td style="font-weight:bold;">${order.order_code}</td>
                        <td style="font-size:0.9rem; color:#475569;">${time}</td>
                        <td>${order.total_amount} ج.م</td>
                        <td style="color:#10b981; font-weight:bold;">+ ${commission} ج.م</td>
                    </tr>
                `;
            });
        }
        document.getElementById('history-total-commission').innerText = `${totalCommission} ج.م`;

    } catch (err) {
        console.error("خطأ في فرز السجل:", err);
        alert("حدث خطأ أثناء جلب السجل");
    }
};
