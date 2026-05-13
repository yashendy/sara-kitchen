// js/app.js - المحرك الرئيسي لمنصة مطبخ سارة

document.addEventListener('DOMContentLoaded', () => {
    if (!window.APP_CONFIG) {
        console.error("❌ خطأ: ملف config.js غير موجود.");
        return;
    }

    // تهيئة اتصال Supabase
    const { url, anonKey } = window.APP_CONFIG.supabase;
    if (typeof supabase !== 'undefined') {
        window.supabaseClient = supabase.createClient(url, anonKey);
        console.log("🚀 تم تفعيل اتصال SupabaseClient بنجاح.");
    }

    updateGlobalUI();
    if (typeof window.updateCartCount === 'function') window.updateCartCount(); 
    setupDynamicNavbar(); // تفعيل الشريط الذكي
});

// ==========================================
// 1. نظام الدخول الموحد (أدمن - مندوب - عميل)
// ==========================================
window.handleLogin = async (phone, password) => {
    try {
        const { data: user, error } = await window.supabaseClient
            .from('users')
            .select('*')
            .eq('phone', phone)
            .maybeSingle();

        if (error) throw new Error("حدث خطأ في الاتصال بقاعدة البيانات.");
        if (!user) throw new Error("رقم الهاتف غير مسجل لدينا، يرجى إنشاء حساب.");

        if (user.password !== password && user.password_hash !== password) {
            throw new Error("كلمة المرور غير صحيحة ❌");
        }

        if (!user.is_active) throw new Error("هذا الحساب غير مفعل حالياً.");

        // حفظ الجلسة
        sessionStorage.setItem('is_logged_in', 'true');
        sessionStorage.setItem('user_role', user.role);
        sessionStorage.setItem('user_id', user.id);
        sessionStorage.setItem('user_phone', user.phone);
        sessionStorage.setItem('user_full_name', user.full_name || 'عميل مميز');

        // التوجيه الذكي
        if (user.role === 'ADMIN') {
            sessionStorage.setItem('is_admin', 'true');
            window.location.href = 'admin-dashboard.html';
        } else if (user.role === 'DRIVER') {
            window.location.href = 'driver-orders.html';
        } else {
            window.location.href = 'index.html';
        }
    } catch (err) {
        alert(err.message);
    }
};

// ==========================================
// 2. إنشاء حساب جديد للعميل
// ==========================================
window.handleRegister = async (userData) => {
    try {
        const { data: existing } = await window.supabaseClient.from('users').select('id').eq('phone', userData.phone).maybeSingle();
        if (existing) throw new Error("هذا الرقم مسجل بالفعل، جرب تسجيل الدخول.");

        const { error } = await window.supabaseClient.from('users').insert([{
            full_name: userData.name,
            phone: userData.phone,
            password_hash: userData.password,
            password: userData.password,
            address: userData.address,
            role: 'CUSTOMER',
            is_active: true,
            loyalty_points: 0
        }]);

        if (error) throw error;
        alert("تم إنشاء حسابك بنجاح! 🎉 يمكنك الآن تسجيل الدخول.");
        window.location.reload(); 
    } catch (err) {
        alert(err.message);
    }
};

// ==========================================
// 3. تسجيل الخروج
// ==========================================
window.handleLogout = () => {
    sessionStorage.clear();
    alert("تم تسجيل الخروج بنجاح 👋");
    window.location.href = 'index.html'; // يرجع للرئيسية كزائر
};

// ==========================================
// 4. الشريط العلوي الذكي (Dynamic Navbar)
// ==========================================
function setupDynamicNavbar() {
    const isLoggedIn = sessionStorage.getItem('is_logged_in') === 'true';
    const userRole = sessionStorage.getItem('user_role');
    const userName = sessionStorage.getItem('user_full_name') || '';
    
    const navLinksContainer = document.querySelector('.nav-links');
    if (!navLinksContainer) return;

    if (isLoggedIn) {
        if (userRole === 'ADMIN') {
            // التعديل الجديد للأدمن: إضافة المخزن والمصروفات
            navLinksContainer.innerHTML = `
                <a href="index.html">الرئيسية</a>
                <span style="color: #475569; margin: 0 10px;">|</span>
                <a href="admin-dashboard.html">الداشبورد</a>
                <a href="admin-orders.html">الطلبات</a>
                <a href="admin-items.html">الأصناف</a>
                <a href="admin-drivers.html">المندوبين</a>
                <a href="admin-inventory.html" style="color: var(--primary); font-weight:bold;">المخزن 📦</a>
                <a href="#" onclick="window.handleLogout()" style="color:#ef4444; font-weight:bold;">خروج 🚪</a>
            `;
        } else if (userRole === 'DRIVER') {
            // واجهة المندوب: بسيطة وسريعة
            navLinksContainer.innerHTML = `
                <a href="driver-orders.html">طلبات التوصيل 🚚</a>
                <a href="#" onclick="window.handleLogout()" style="color:#ef4444; font-weight:bold;">خروج 🚪</a>
            `;
        } else {
            // عميل مسجل: تظهر له بياناته الشخصية والسلة
            navLinksContainer.innerHTML = `
                <a href="index.html">الرئيسية</a>
                <a href="menu.html">القائمة</a>
                <a href="cart.html" class="cart-link">السلة <span id="cart-count">0</span> 🛒</a>
                <a href="track.html">تتبع طلباتي</a>
                <span style="color: #475569; margin: 0 10px;">|</span>
                <span style="color: var(--primary); font-weight:bold;">أهلاً، ${userName.split(' ')[0]} 👋</span>
                <a href="#" onclick="window.handleLogout()" style="color:#ef4444; font-weight:bold;">خروج 🚪</a>
            `;
            // تحديث عداد السلة لو الوظيفة موجودة
            if (typeof window.updateCartCount === 'function') window.updateCartCount(); 
        }
    } else {
        // زائر غير مسجل: يرى خيار تسجيل الدخول
        navLinksContainer.innerHTML = `
            <a href="index.html">الرئيسية</a>
            <a href="menu.html">القائمة</a>
            <a href="cart.html" class="cart-link">السلة <span id="cart-count">0</span> 🛒</a>
            <a href="track.html">تتبع طلبك</a>
            <span style="color: #475569; margin: 0 10px;">|</span>
            <a href="login.html" style="background:var(--primary); color:white; padding:5px 15px; border-radius:20px;">تسجيل الدخول</a>
        `;
        if (typeof window.updateCartCount === 'function') window.updateCartCount();
    }
}

// ==========================================
// 5. وظائف السلة والتنسيق العامة
// ==========================================
window.addToCart = (id, name, price, image) => {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    const existingItem = cart.find(item => item.id === id);
    if (existingItem) existingItem.quantity += 1;
    else cart.push({ id, name, price: parseFloat(price), image, quantity: 1 });
    
    localStorage.setItem('cart', JSON.stringify(cart));
    if (typeof window.updateCartCount === 'function') window.updateCartCount();
    window.showAlert(`تم إضافة ${name} للسلة بنجاح ✅`);
};

window.updateCartCount = () => {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const countElement = document.getElementById('cart-count');
    if (countElement) countElement.textContent = totalItems;
};

window.formatCurrency = (amount) => {
    if(!window.APP_CONFIG) return `${amount} ج.م`;
    const { label } = window.APP_CONFIG.currency;
    return `${parseFloat(amount).toFixed(2)} ${label}`;
};

function updateGlobalUI() {
    const phoneElement = document.getElementById('contact-phone');
    if (phoneElement && window.APP_CONFIG) {
        phoneElement.textContent = window.APP_CONFIG.contact.phone;
    }
}

window.showAlert = (message) => alert(message);
