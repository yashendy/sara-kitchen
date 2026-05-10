// config.js
// إعدادات منصة مطبخ سارة للأكل البيتي - الربط مع قاعدة البيانات

// 1) بيانات الربط مع Supabase (تأكدي أن هذه القيم مطابقة لما في لوحة تحكم Supabase)
window.SUPABASE_URL = "https://qkrfqydawepkohoqiuwv.supabase.co";
window.SUPABASE_ANON_KEY = "sb_publishable_a_qQF4zglMzrmJKhL8rauQ_9mqo46tb";

// 2) الكائن الرئيسي لإعدادات التطبيق
window.APP_CONFIG = {
    supabase: {
        url: window.SUPABASE_URL,
        anonKey: window.SUPABASE_ANON_KEY
    },
    // إعدادات العملة
    currency: {
        code: "EGP",
        label: "ج.م"
    },
    // بيانات التواصل الأساسية (تظهر في الفوتر والصفحة الرئيسية)
    contact: {
        phone: "96550534441",
        whatsapp: "96550534441",
        workingHours: "10 ص - 10 م"
    },
    // بادئة أكواد الطلبات (مثل S-101)
    orderCodePrefix: "S",
    // مسار تخزين الصور في Supabase Storage
    storageBucket: "product-images"
};

// تجميد الكائن لمنع التغيير العرضي أثناء تشغيل الموقع
Object.freeze(window.APP_CONFIG);

console.log("✅ تم تحميل إعدادات مطبخ سارة بنجاح.");
