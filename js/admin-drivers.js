// js/admin-drivers.js

document.addEventListener('DOMContentLoaded', async () => {
    // 1. التحقق من صلاحية الأدمن
    if (sessionStorage.getItem('is_admin') !== 'true') {
        window.location.href = 'admin-login.html';
        return;
    }

    // 2. تحميل بيانات المناديب عند فتح الصفحة
    await loadDriversData();

    // 3. معالجة نموذج إضافة مندوب جديد
    const addForm = document.getElementById('add-driver-form');
    if (addForm) {
        addForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('d-name').value;
            const phone = document.getElementById('d-phone').value;
            const fee = parseFloat(document.getElementById('d-fee').value);
            
            // بيانات الدخول (الإيميل هو رقم التليفون والباسورد هو رقم التليفون)
            const email = `${phone}@sara.com`;
            const password = phone;

            try {
                // أولاً: إنشاء حساب في جدول المستخدمين (users)
                const { data: user, error: userError } = await window.supabaseClient
                    .from('users')
                    .insert([{ 
                        email: email, 
                        password: password, 
                        role: 'DRIVER', 
                        full_name: name 
                    }])
                    .select()
                    .single();

                if (userError) throw userError;

                // ثانياً: ربط المستخدم بجدول المناديب (delivery_drivers)
                const { error: driverError } = await window.supabaseClient
                    .from('delivery_drivers')
                    .insert([{ 
                        user_id: user.id, // الربط الجديد المتوافق مع int8
                        name: name, 
                        phone: phone, 
                        delivery_fee_per_order: fee 
                    }]);

                if (driverError) throw driverError;

                alert(`تمت إضافة المندوب بنجاح! ✅\nيمكنه الدخول بـ:\nالإيميل: ${email}\nالباسورد: ${phone}`);
                hideAddDriverModal();
                await loadDriversData();

            } catch (err) {
                console.error("خطأ مفصل:", err);
                alert("حدث خطأ: " + (err.message || "تأكد من عدم تكرار البيانات"));
            }
        });
    }
});

// دالة جلب وعرض بيانات المناديب وحساباتهم
async function loadDriversData() {
    try {
        const today = new Date().toISOString().split('T')[0];

        // جلب المناديب
        const { data: drivers, error: dError } = await window.supabaseClient
            .from('delivery_drivers')
            .select('*');

        if (dError) throw dError;

        // جلب الطلبات المسلمة اليوم لحساب العمولات
        const { data: orders, error: oError } = await window.supabaseClient
            .from('orders')
            .select('driver_id, total_amount')
            .eq('status', 'DELIVERED')
            .gte('created_at', today);

        const listBody = document.getElementById('drivers-list-body');
        if (!listBody) return;
        
        listBody.innerHTML = '';
        let totalPayouts = 0;

        drivers.forEach(driver => {
            const driverOrders = orders ? orders.filter(o => o.driver_id === driver.id) : [];
            const fee = driver.delivery_fee_per_order || 10;
            const earnings = driverOrders.length * fee;
            totalPayouts += earnings;

            listBody.innerHTML += `
                <tr>
                    <td><strong>${driver.name}</strong></td>
                    <td>${driver.phone}</td>
                    <td>${driverOrders.length} طلب</td>
                    <td style="color:var(--secondary); font-weight:bold;">${window.formatCurrency(earnings)}</td>
                    <td>
                        <button onclick="deleteDriver(${driver.id}, ${driver.user_id})" class="btn-remove" style="padding:5px 10px; font-size:0.8rem;">حذف</button>
                    </td>
                </tr>
            `;
        });

        // تحديث الإحصائيات في الأعلى
        document.getElementById('active-drivers-count').textContent = drivers.length;
        document.getElementById('total-driver-payouts').textContent = window.formatCurrency(totalPayouts);

    } catch (err) {
        console.error("Error loading drivers data:", err);
    }
}

// وظائف التحكم في النوافذ المنبثقة
window.showAddDriverModal = () => {
    document.getElementById('add-driver-modal').style.display = 'flex';
};

window.hideAddDriverModal = () => {
    document.getElementById('add-driver-modal').style.display = 'none';
};

// دالة حذف المندوب وحسابه
window.deleteDriver = async (driverId, userId) => {
    if (confirm('هل أنتِ متأكدة من حذف المندوب وحساب دخوله نهائياً؟')) {
        // حذف المندوب من جدول المستخدمين (سيحذف تلقائياً من delivery_drivers بسبب ON DELETE CASCADE)
        const { error } = await window.supabaseClient
            .from('users')
            .delete()
            .eq('id', userId);
        
        if (!error) {
            await loadDriversData();
        } else {
            alert('خطأ في الحذف: ' + error.message);
        }
    }
};
