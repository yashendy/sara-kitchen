// js/admin-login.js

document.getElementById('admin-login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const userIdentifier = document.getElementById('admin-user').value.trim();
    const password = document.getElementById('admin-pass').value.trim();
    const errorEl = document.getElementById('login-error');

    errorEl.style.display = 'none';

    try {
        // شلنا شرط الـ ADMIN فقط عشان السيستم يقبل المديرين والمندوبين
        const { data, error } = await window.supabaseClient
            .from('users')
            .select('*')
            .or(`email.eq.${userIdentifier},phone.eq.${userIdentifier}`)
            .eq('password_hash', password);

        if (error) throw error;

        // التأكد من وجود مستخدم يطابق البيانات
        if (data && data.length > 0) {
            const loggedUser = data[0];
            
            if(loggedUser.is_active) {
                // حفظ البيانات الأساسية اللي بيحتاجها المندوب والأدمن
                sessionStorage.setItem('user_id', loggedUser.id);
                sessionStorage.setItem('user_role', loggedUser.role);
                
                // التوجيه الذكي بناءً على الصلاحية
                if (loggedUser.role === 'ADMIN') {
                    sessionStorage.setItem('is_admin', 'true');
                    sessionStorage.setItem('admin_id', loggedUser.id);
                    window.location.href = 'admin-dashboard.html'; // توجيه للأدمن
                    
                } else if (loggedUser.role === 'DRIVER') {
                    window.location.href = 'driver-dashboard.html'; // توجيه للمندوب
                    
                } else {
                    alert("ليس لديك صلاحيات كافية للدخول.");
                }
            } else {
                alert("هذا الحساب غير مفعل حالياً.");
            }
        } else {
            errorEl.style.display = 'block'; // بيانات غير صحيحة
        }
    } catch (err) {
        console.error("Login Error:", err);
        alert("حدث خطأ في الاتصال بقاعدة البيانات.");
    }
});
