// js/track.js

document.addEventListener('DOMContentLoaded', () => {
    // التحقق إذا كان الكود موجود في الرابط (جاي من صفحة السلة)
    const urlParams = new URLSearchParams(window.location.search);
    const codeFromUrl = urlParams.get('code');
    if (codeFromUrl) {
        document.getElementById('track-code-input').value = codeFromUrl;
        trackOrder(codeFromUrl);
    }
});

async function trackOrder(forcedCode = null) {
    const code = forcedCode || document.getElementById('track-code-input').value.trim();
    const resultArea = document.getElementById('track-result');
    const errorArea = document.getElementById('track-error');

    if (!code) return;

    // جلب بيانات الطلب من Supabase
    const { data, error } = await window.supabaseClient
        .from('orders')
        .select('*')
        .eq('order_code', code)
        .single();

    if (error || !data) {
        resultArea.style.display = 'none';
        errorArea.style.display = 'block';
        return;
    }

    // إظهار النتائج
    errorArea.style.display = 'none';
    resultArea.style.display = 'block';

    document.getElementById('res-code').textContent = data.order_code;
    document.getElementById('res-name').textContent = data.customer_name;
    
    const statusText = {
        'PENDING': 'بانتظار التأكيد',
        'PREPARING': 'جاري التحضير بالمطبخ',
        'WITH_DRIVER': 'الطلب مع المندوب الآن',
        'DELIVERED': 'تم توصيل الطلب بنجاح',
        'CANCELLED': 'تم إلغاء الطلب'
    };

    document.getElementById('res-status').textContent = statusText[data.status];
    
    // تحديث شريط التقدم المرئي
    updateTimeline(data.status);
}

function updateTimeline(currentStatus) {
    // إعادة ضبط الألوان
    document.querySelectorAll('.timeline-step').forEach(step => {
        step.classList.remove('active', 'completed');
    });

    const steps = ['PENDING', 'PREPARING', 'WITH_DRIVER', 'DELIVERED'];
    const currentIndex = steps.indexOf(currentStatus);

    steps.forEach((status, index) => {
        const stepEl = document.getElementById(`step-${status}`);
        if (!stepEl) return;

        if (index < currentIndex) {
            stepEl.classList.add('completed');
        } else if (index === currentIndex) {
            stepEl.classList.add('active');
        }
    });
}
