// js/admin-login.js

document.getElementById('admin-login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const userIdentifier = document.getElementById('admin-user').value.trim();
    const password = document.getElementById('admin-pass').value.trim();
    const errorEl = document.getElementById('login-error');

    errorEl.style.display = 'none';

    try {
        // الاستعلام باستخدام فلتر بسيط وتجنب الأخطاء المعقدة
        const { data, error } = await window.supabaseClient
            .from('users')
            .select('*')
            .or(`email.eq.${userIdentifier},phone.eq.${userIdentifier}`)
            .eq('password_hash', password)
            .eq('role', 'ADMIN');

        if (error) throw error;

        // التأكد من وجود مستخدم واحد على الأقل يطابق البيانات
        if (data && data.length > 0) {
            const admin = data[0];
            if(admin.is_active) {
                sessionStorage.setItem('is_admin', 'true');
                sessionStorage.setItem('admin_id', admin.id);
                window.location.href = 'admin-dashboard.html';
            } else {
                alert("هذا الحساب غير مفعل حالياً.");
            }
        } else {
            errorEl.style.display = 'block'; // بيانات غير صحيحة
        }
    } catch (err) {
        console.error("Login Error:", err);
        alert("حدث خطأ في الاتصال بقاعدة البيانات. تأكدي من إغلاق RLS.");
    }
});
