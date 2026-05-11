// app.js - المحرك الرئيسي لمنصة مطبخ سارة

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

// 1. وظيفة إضافة منتج للسلة (تُستخدم في صفحة المنيو)
window.addToCart = (id, name, price, image) => {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    
    // البحث إذا كان المنتج موجود مسبقاً لزيادة الكمية
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

// 2. وظيفة تحديث رقم الأصناف في أيقونة السلة (تظهر في الهيدر)
window.updateCartCount = () => {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const countElements = document.querySelectorAll('.cart-link'); // نبحث عن كل روابط السلة
    
    // حساب إجمالي عدد القطع في السلة
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    countElements.forEach(el => {
        // تحديث النص ليظهر الرقم بجانب الكلمة
        el.innerHTML = `السلة 🛒 <span class="cart-badge">${totalItems}</span>`;
    });
};

// --- وظائف التنسيق والواجهة ---

// وظيفة لتنسيق الأسعار حسب العملة
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
