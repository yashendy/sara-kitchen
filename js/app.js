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
}

// وظيفة لعرض التنبيهات
window.showAlert = (message) => {
    alert(message); 
};
