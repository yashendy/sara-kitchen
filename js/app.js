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
        console.error("❌ خطأ: مكتبة Supabase JS لم يتم تحميلها. تأكدي من وجود رابط الـ CDN في ملف الـ HTML.");
    }

    // 3. تحديث بيانات التواصل في الصفحة تلقائياً
    updateGlobalUI();
});

// وظيفة لتنسيق الأسعار حسب العملة المختارة في الإعدادات
window.formatCurrency = (amount) => {
    const { code, label } = window.APP_CONFIG.currency;
    return `${parseFloat(amount).toFixed(2)} ${label}`;
};

// وظيفة لتحديث البيانات العامة في أي صفحة (مثل رقم التليفون في الفوتر)
function updateGlobalUI() {
    const phoneElement = document.getElementById('contact-phone');
    if (phoneElement) {
        phoneElement.textContent = window.APP_CONFIG.contact.phone;
    }
}

// وظيفة مساعدة لعرض التنبيهات بشكل جمالي
window.showAlert = (message, type = 'success') => {
    alert(message); // يمكنك استبدالها لاحقاً بـ Toast أو SweetAlert لجمال التصميم
};
