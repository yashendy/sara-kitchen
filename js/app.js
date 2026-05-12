// js/app.js - المحرك الرئيسي لمنصة مطبخ سارة

document.addEventListener('DOMContentLoaded', () => {
    // 1. التحقق من وجود الإعدادات
    if (!window.APP_CONFIG) {
        console.error("❌ خطأ: ملف config.js غير موجود أو لم يتم تحميله بشكل صحيح.");
        return;
    }

    // 2. تهيئة اتصال Supabase
    const { url, anonKey } = window.APP_CONFIG.supabase;
    if (typeof supabase !== 'undefined') {
        window.supabaseClient = supabase.createClient(url, anonKey);
        console.log("🚀 تم تفعيل اتصال SupabaseClient بنجاح.");
    } else {
        console.error("❌ خطأ: مكتبة Supabase JS لم يتم تحميلها.");
    }

    // 3. تحديث البيانات العامة والعداد عند تحميل الصفحة
    updateGlobalUI();
    window.updateCartCount(); 
});

// --- وظائف السلة (إضافة وتحديث العداد) ---

// 1. وظيفة إضافة منتج للسلة
window.addToCart = (id, name, price, image) => {
    // تأكدي أننا نستخدم المفتاح 'cart' دائماً لتوحيد البيانات
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    
    const existingItem = cart.find(item => item.id === id);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ 
            id: id, 
            name: name, 
            price: parseFloat(price), 
            image: image, 
            quantity: 1 
        });
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    
    // تحديث العداد فوراً بعد الإضافة
    window.updateCartCount();
    
    window.showAlert(`تم إضافة ${name} للسلة بنجاح ✅`);
};

// 2. وظيفة تحديث رقم الأصناف في الهيدر (تعديل حيوي)
window.updateCartCount = () => {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    
    // حساب إجمالي عدد القطع (Quantity) وليس فقط عدد الأنواع
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    // أولاً: التحديث من خلال الـ ID الصريح (cart-count) الذي وضعتِه في HTML
    const countElement = document.getElementById('cart-count');
    if (countElement) {
        countElement.textContent = totalItems;
    }

    // ثانياً: التحديث الاحتياطي لأي روابط تحمل كلاس .cart-link
    const cartLinks = document.querySelectorAll('.cart-link');
    cartLinks.forEach(link => {
        // إذا كان الرابط لا يحتوي على سبان بالداخل، نحدث النص بجانب الإيموجي
        const spanInside = link.querySelector('span');
        if (!spanInside) {
            link.innerHTML = `السلة 🛒 (${totalItems})`;
        }
    });
};

// --- وظائف التنسيق والواجهة ---

// وظيفة لتنسيق الأسعار حسب العملة المختارة في الإعدادات
window.formatCurrency = (amount) => {
    const { label } = window.APP_CONFIG.currency;
    return `${parseFloat(amount).toFixed(2)} ${label}`;
};

// وظيفة لتحديث البيانات العامة (مثل رقم التليفون في الفوتر)
function updateGlobalUI() {
    const phoneElement = document.getElementById('contact-phone');
    if (phoneElement) {
        phoneElement.textContent = window.APP_CONFIG.contact.phone;
    }


    // js/app.js

// 1. دالة تسجيل الدخول (للكل: أدمن، مندوب، عميل)
window.handleLogin = async (phone, password) => {
    try {
        // البحث عن المستخدم برقم الهاتف وكلمة المرور
        const { data: user, error } = await window.supabaseClient
            .from('users')
            .select('*')
            .eq('phone', phone)
            .eq('password', password) // يفضل مستقبلاً استخدام تشفير
            .single();

        if (error || !user) {
            throw new Error("رقم الهاتف أو كلمة المرور غير صحيحة");
        }

        // حفظ بيانات الجلسة في المتصفح
        sessionStorage.setItem('is_logged_in', 'true');
        sessionStorage.setItem('user_role', user.role);
        sessionStorage.setItem('user_id', user.id);
        sessionStorage.setItem('user_full_name', user.full_name);

        // التوجيه الذكي بناءً على الرتبة (Role)
        if (user.role === 'ADMIN') {
            sessionStorage.setItem('is_admin', 'true');
            window.location.href = 'admin-dashboard.html';
        } else if (user.role === 'DRIVER') {
            window.location.href = 'driver-orders.html'; // شاشة المندوب
        } else {
            window.location.href = 'index.html'; // العميل يرجع للرئيسية
        }

    } catch (err) {
        alert(err.message);
    }
};

// 2. دالة إنشاء حساب جديد (للعملاء فقط)
window.handleRegister = async (userData) => {
    try {
        // التأكد أولاً أن الرقم غير مسجل
        const { data: existing } = await window.supabaseClient
            .from('users')
            .select('id')
            .eq('phone', userData.phone)
            .single();

        if (existing) throw new Error("هذا الرقم مسجل بالفعل، جرب تسجيل الدخول.");

        // إضافة المستخدم الجديد برتبة CUSTOMER
        const { error } = await window.supabaseClient
            .from('users')
            .insert([{
                full_name: userData.name,
                phone: userData.phone,
                password: userData.password,
                address: userData.address,
                role: 'CUSTOMER',
                loyalty_points: 0
            }]);

        if (error) throw error;

        alert("تم إنشاء حسابك بنجاح يا فنان! 🎉 يمكنك الآن تسجيل الدخول.");
        window.location.reload(); // لإرجاعه لشاشة الدخول

    } catch (err) {
        alert(err.message);
    }
};

// 3. دالة تسجيل الخروج (Logout)
window.handleLogout = () => {
    sessionStorage.clear(); // مسح كل بيانات الجلسة
    alert("تم تسجيل الخروج بنجاح. ننتظرك مرة أخرى! 👋");
    window.location.href = 'index.html';
};
}

// وظيفة لعرض التنبيهات
window.showAlert = (message) => {
    alert(message); 
};
