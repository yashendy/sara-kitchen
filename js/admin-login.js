// js/admin-login.js

document.getElementById('admin-login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = document.getElementById('admin-user').value;
    const pass = document.getElementById('admin-pass').value;
    const errorEl = document.getElementById('login-error');

    // الاستعلام من جدول users عن الأدمن
    const { data, error } = await window.supabaseClient
        .from('users')
        .select('*')
        .or(`email.eq.${user},phone.eq.${user}`)
        .eq('password_hash', pass)
        .eq('role', 'ADMIN')
        .single();

    if (error || !data) {
        errorEl.style.display = 'block';
    } else {
        // حفظ بيانات الجلسة مؤقتاً
        sessionStorage.setItem('is_admin', 'true');
        sessionStorage.setItem('admin_name', data.email);
        window.location.href = 'admin-dashboard.html';
    }
});
