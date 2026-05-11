// js/cart.js

document.addEventListener('DOMContentLoaded', () => {
    // تحميل السلة عند فتح الصفحة
    renderCart();

    // ربط نموذج الطلب بالدالة المسؤولة عن الإرسال
    const orderForm = document.getElementById('order-form');
    if (orderForm) {
        orderForm.addEventListener('submit', handleOrderSubmit);
    }
});

/**
 * 1. دالة عرض محتويات السلة وتحديث الأسعار الأولية
 */
function renderCart() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const container = document.getElementById('cart-items-container');
    let subtotal = 0;

    container.innerHTML = '';

    if (cart.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:20px;"><p>السلة فارغة حالياً.. اذهب للمنيو واطلب ألذ الأكلات! 🥗</p><a href="menu.html" class="btn btn-primary">تصفح القائمة</a></div>';
        document.getElementById('subtotal-price').innerText = "0.00 ج.م";
        updateTotalWithDelivery();
        return;
    }

    cart.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;
        container.innerHTML += `
            <div class="cart-item">
                <img src="${item.image || 'default-food.png'}" alt="${item.name}">
                <div class="item-details">
                    <h4>${item.name}</h4>
                    <p>${item.price} ج.م × ${item.quantity}</p>
                </div>
                <button onclick="removeFromCart(${index})" class="btn-remove">حذف</button>
            </div>
        `;
    });

    // تحديث سعر المشتريات فقط
    document.getElementById('subtotal-price').innerText = subtotal.toFixed(2) + " ج.م";
    
    // استدعاء دالة تحديث الإجمالي النهائي فوراً
    updateTotalWithDelivery();
}

/**
 * 2. دالة التحكم في إظهار/إخفاء خيارات التوصيل
 */
window.toggleDeliveryZones = () => {
    const type = document.getElementById('delivery-type').value;
    const zonesGroup = document.getElementById('zones-group');
    const deliveryRow = document.getElementById('delivery-row');
    const addressGroup = document.getElementById('address-group');
    
    if (type === 'PICKUP') {
        zonesGroup.style.display = 'none';
        deliveryRow.style.display = 'none';
        addressGroup.style.display = 'none'; // العنوان غير ضروري عند الاستلام من المطبخ
    } else {
        zonesGroup.style.display = 'block';
        deliveryRow.style.display = 'flex';
        addressGroup.style.display = 'block';
    }
    updateTotalWithDelivery();
};

/**
 * 3. دالة تحديث الحسبة النهائية (المشتريات + التوصيل)
 */
window.updateTotalWithDelivery = () => {
    const subtotalText = document.getElementById('subtotal-price').innerText;
    const subtotal = parseFloat(subtotalText.replace(" ج.م", "")) || 0;
    
    const deliveryType = document.getElementById('delivery-type').value;
    const zoneValue = document.getElementById('delivery-zone').value;
    
    let deliveryCost = 0;
    
    if (deliveryType === 'DELIVERY') {
        if (zoneValue === 'custom') {
            deliveryCost = 0; // سيتم تحديده لاحقاً
            document.getElementById('delivery-cost').innerText = "يحدد لاحقاً";
        } else {
            deliveryCost = parseFloat(zoneValue);
            document.getElementById('delivery-cost').innerText = deliveryCost.toFixed(2) + " ج.م";
        }
    } else {
        document.getElementById('delivery-cost').innerText = "0.00 ج.م";
    }

    const finalTotal = subtotal + deliveryCost;
    document.getElementById('total-price').innerText = finalTotal.toFixed(2) + " ج.م";
};

/**
 * 4. دالة معالجة إرسال الطلب لقاعدة البيانات
 */
// دالة معالجة إرسال الطلب لقاعدة البيانات
async function handleOrderSubmit(e) {
    e.preventDefault();
    
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    if (cart.length === 0) {
        alert("سلتك فارغة!");
        return;
    }

    const deliveryType = document.getElementById('delivery-type').value;
    const zoneValue = document.getElementById('delivery-zone').value;
    const finalTotalText = document.getElementById('total-price').innerText;
    const finalTotal = parseFloat(finalTotalText.replace(" ج.م", ""));

    // --- التعديل هنا: الحصول على العنوان بأمان لتفادي خطأ null ---
    const addressInput = document.getElementById('cust-address');
    const customerAddress = (deliveryType === 'PICKUP') 
        ? 'استلام من المطبخ' 
        : (addressInput ? addressInput.value : 'لم يتم إدخال عنوان');

    // تحديد عمولة المندوب بناءً على المنطقة المختارة
    let commission = 0;
    if (deliveryType === 'DELIVERY') {
        if (zoneValue !== 'custom') {
            commission = parseFloat(zoneValue);
        } else {
            commission = 0; // سيقوم الأدمن بتعديلها لاحقاً في الداش بورد
        }
    }

    // تجهيز بيانات الطلب للإرسال
    const orderData = {
        customer_name: document.getElementById('cust-name').value,
        customer_phone: document.getElementById('cust-phone').value,
        customer_address: customerAddress, // استخدام المتغير الآمن
        total_amount: finalTotal, // السعر النهائي (شامل الخصم لو فيه كوبون)
        delivery_commission: commission, 
        status: 'PENDING',
        order_code: 'S' + Math.floor(1000 + Math.random() * 9000), 
        created_at: new Date().toISOString()
    };

    try {
        const { error } = await window.supabaseClient
            .from('orders')
            .insert([orderData]);

        if (error) throw error;

        alert("تم استلام طلبك بنجاح يا فنان! 🥘\nكود الطلب الخاص بك هو: " + orderData.order_code);
        
        // مسح السلة والعودة للرئيسية
        localStorage.removeItem('cart');
        window.location.href = 'index.html';

    } catch (err) {
        console.error("Submission Error:", err);
        alert("حدث خطأ أثناء إرسال الطلب: " + err.message);
    }
}

/**
 * 5. حذف منتج من السلة
 */
window.removeFromCart = (index) => {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    cart.splice(index, 1);
    localStorage.setItem('cart', JSON.stringify(cart));
    renderCart(); // إعادة العرض فوراً
};


let appliedCoupon = null; // لتخزين بيانات الكوبون لو اتفعل

// 1. دالة تطبيق الكوبون
async function applyCoupon() {
    const code = document.getElementById('coupon-input').value.trim().toUpperCase();
    const msgEl = document.getElementById('coupon-msg');
    const subtotal = parseFloat(document.getElementById('subtotal-price').innerText) || 0;

    if (!code) return;

    try {
        // البحث عن الكوبون في Supabase
        const { data: coupon, error } = await window.supabaseClient
            .from('coupons')
            .select('*')
            .eq('code', code)
            .eq('is_active', true)
            .single();

        if (error || !coupon) {
            msgEl.innerText = "❌ الكوبون غير صحيح أو منتهي الصلاحية";
            msgEl.style.color = "red";
            removeCoupon();
            return;
        }

        // التأكد من تاريخ الانتهاء
        if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
            msgEl.innerText = "❌ هذا الكوبون انتهت صلاحيته";
            msgEl.style.color = "red";
            removeCoupon();
            return;
        }

        // التأكد من الحد الأدنى للطلب
        if (subtotal < coupon.min_order_amount) {
            msgEl.innerText = `⚠️ يلزمك طلب بـ ${coupon.min_order_amount} ج.م لتفعيل الخصم`;
            msgEl.style.color = "orange";
            removeCoupon();
            return;
        }

        // لو كله تمام، نحسب الخصم
        appliedCoupon = coupon;
        msgEl.innerText = "✅ تم تطبيق الخصم بنجاح!";
        msgEl.style.color = "green";
        updateTotalWithDelivery(); // إعادة حساب الإجمالي بالخصم

    } catch (err) {
        console.error(err);
    }
}

// 2. تعديل دالة الحساب لتشمل الخصم (عدلي الدالة الموجودة عندك لتصبح هكذا)
window.updateTotalWithDelivery = () => {
    const subtotal = parseFloat(document.getElementById('subtotal-price').innerText) || 0;
    const deliveryType = document.getElementById('delivery-type').value;
    const zoneValue = document.getElementById('delivery-zone').value;
    
    let deliveryCost = 0;
    if (deliveryType === 'DELIVERY' && zoneValue !== 'custom') {
        deliveryCost = parseFloat(zoneValue);
    }

    // حساب قيمة الخصم
    let discountValue = 0;
    if (appliedCoupon) {
        if (appliedCoupon.discount_type === 'PERCENTAGE') {
            discountValue = subtotal * (appliedCoupon.discount_value / 100);
        } else {
            discountValue = appliedCoupon.discount_value;
        }
        
        document.getElementById('discount-display').style.display = 'flex';
        document.getElementById('discount-amount').innerText = `-${discountValue.toFixed(2)} ج.م`;
    } else {
        document.getElementById('discount-display').style.display = 'none';
    }

    const finalTotal = subtotal + deliveryCost - discountValue;
    document.getElementById('total-price').innerText = `${finalTotal.toFixed(2)} ج.م`;
    document.getElementById('delivery-cost').innerText = `${deliveryCost.toFixed(2)} ج.م`;
};

function removeCoupon() {
    appliedCoupon = null;
    updateTotalWithDelivery();
}
