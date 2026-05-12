// js/cart.js

// متغيرات عامة لحفظ الكوبونات وإعدادات المتجر ونقاط الولاء
let appliedCoupon = null; 
let storeSettings = {
    bulk_threshold: 500, // قيم افتراضية
    bulk_discount_percent: 10,
    discount_per_10_points: 1
};

let userLoyaltyPoints = 0;
let loyaltyDiscountValue = 0;
let isPointsApplied = false;

document.addEventListener('DOMContentLoaded', async () => {
    // جلب إعدادات المتجر أولاً لتفعيل الخصم التلقائي
    await fetchStoreSettings();
    
    // تحميل السلة عند فتح الصفحة
    renderCart();

    // ربط نموذج الطلب بالدالة المسؤولة عن الإرسال
    const orderForm = document.getElementById('order-form');
    if (orderForm) {
        orderForm.addEventListener('submit', handleOrderSubmit);
    }
});

// 1. جلب إعدادات الخصم التلقائي من قاعدة البيانات
async function fetchStoreSettings() {
    try {
        const { data, error } = await window.supabaseClient
            .from('store_settings')
            .select('*')
            .eq('id', 1)
            .single();

        if (data && !error) {
            storeSettings = data;
        }
    } catch (err) {
        console.error("خطأ في جلب إعدادات المتجر:", err);
    }
}

/**
 * 2. دالة عرض محتويات السلة وتحديث الأسعار الأولية وإضافة خانة الكمية
 */
function renderCart() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const container = document.getElementById('cart-items-container');
    let subtotal = 0;

    if (!container) return; // حماية إضافية
    container.innerHTML = '';

    if (cart.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:20px;"><p>السلة فارغة حالياً.. اذهب للمنيو واطلب ألذ الأكلات! 🥗</p><a href="menu.html" class="btn btn-primary" style="display:inline-block; margin-top:10px;">تصفح القائمة</a></div>';
        const subEl = document.getElementById('subtotal-price');
        if(subEl) subEl.innerText = "0.00 ج.م";
        updateTotalWithDelivery();
        return;
    }

    cart.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;
        container.innerHTML += `
            <div class="cart-item" style="display: flex; align-items: center; background: white; padding: 15px; margin-bottom: 10px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                <img src="${item.image_url || item.image || 'default-food.png'}" alt="${item.name}" style="width: 70px; height: 70px; border-radius: 8px; margin-left: 15px; object-fit: cover;">
                
                <div class="item-details" style="flex-grow: 1;">
                    <h4 style="margin: 0 0 5px 0;">${item.name}</h4>
                    <p style="color: #64748b; font-size: 0.9rem; margin: 0;">${item.price} ج.م</p>
                </div>
                
                <div style="display: flex; align-items: center; gap: 10px; margin-left: 15px;">
                    <label style="font-size: 0.85rem; font-weight: bold; color: #475569;">الكمية:</label>
                    <input type="number" min="1" value="${item.quantity}" 
                           onchange="updateItemQuantity(${index}, this.value)" 
                           style="width: 60px; padding: 5px; text-align: center; border: 1px solid #cbd5e1; border-radius: 5px; font-family: inherit;">
                </div>

                <div style="font-weight: bold; margin-left: 15px; color: var(--primary);">
                    ${itemTotal.toFixed(2)} ج.م
                </div>

                <button onclick="removeFromCart(${index})" class="btn-remove" style="background: #ef4444; color: white; border: none; padding: 8px 12px; border-radius: 5px; cursor: pointer;">حذف</button>
            </div>
        `;
    });

    const subEl = document.getElementById('subtotal-price');
    if (subEl) subEl.innerText = subtotal.toFixed(2) + " ج.م";
    
    updateTotalWithDelivery();
}

/**
 * 3. دالة تعديل الكمية يدوياً
 */
window.updateItemQuantity = (index, newQuantity) => {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    let qty = parseInt(newQuantity);
    
    if (qty < 1) qty = 1; 
    
    cart[index].quantity = qty;
    localStorage.setItem('cart', JSON.stringify(cart));
    
    renderCart(); 
};

/**
 * 4. دالة حذف منتج من السلة
 */
window.removeFromCart = (index) => {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    cart.splice(index, 1);
    localStorage.setItem('cart', JSON.stringify(cart));
    
    // لو حذفنا حاجة، نلغي خصم النقاط عشان يحسبه من جديد لو حب
    isPointsApplied = false;
    loyaltyDiscountValue = 0;
    const usePointsSection = document.getElementById('use-points-section');
    if(usePointsSection) usePointsSection.style.display = 'none';
    const msgEl = document.getElementById('loyalty-msg');
    if(msgEl) msgEl.innerText = '';
    
    renderCart(); 
};

/**
 * 5. دالة التحكم في إظهار/إخفاء خيارات التوصيل
 */
window.toggleDeliveryZones = () => {
    const typeEl = document.getElementById('delivery-type');
    if (!typeEl) return;
    const type = typeEl.value;
    const zonesGroup = document.getElementById('zones-group');
    const deliveryRow = document.getElementById('delivery-row');
    const addressGroup = document.getElementById('address-group');
    
    if (type === 'PICKUP') {
        if(zonesGroup) zonesGroup.style.display = 'none';
        if(deliveryRow) deliveryRow.style.display = 'none';
        if(addressGroup) addressGroup.style.display = 'none';
    } else {
        if(zonesGroup) zonesGroup.style.display = 'block';
        if(deliveryRow) deliveryRow.style.display = 'flex';
        if(addressGroup) addressGroup.style.display = 'block';
    }
    updateTotalWithDelivery();
};

/**
 * 6. دالة تحديث الحسبة النهائية 
 */
window.updateTotalWithDelivery = () => {
    const subEl = document.getElementById('subtotal-price');
    if (!subEl) return;
    const subtotalText = subEl.innerText;
    const subtotal = parseFloat(subtotalText.replace(" ج.م", "")) || 0;
    
    const typeEl = document.getElementById('delivery-type');
    const deliveryType = typeEl ? typeEl.value : 'DELIVERY';
    
    const zoneEl = document.getElementById('delivery-zone');
    const zoneValue = zoneEl ? zoneEl.value : '0';
    
    // -- 1. حساب التوصيل --
    let deliveryCost = 0;
    const costEl = document.getElementById('delivery-cost');
    if (deliveryType === 'DELIVERY') {
        if (zoneValue === 'custom') {
            deliveryCost = 0;
            if(costEl) costEl.innerText = "يحدد لاحقاً";
        } else {
            deliveryCost = parseFloat(zoneValue) || 0;
            if(costEl) costEl.innerText = deliveryCost.toFixed(2) + " ج.م";
        }
    } else {
        if(costEl) costEl.innerText = "0.00 ج.م";
    }

    // -- 2. حساب خصم الـ VIP التلقائي --
    let bulkDiscountValue = 0;
    const bulkRow = document.getElementById('bulk-discount-row');
    const bulkVal = document.getElementById('bulk-discount-val');

    if (storeSettings.bulk_threshold > 0 && subtotal >= storeSettings.bulk_threshold) {
        bulkDiscountValue = subtotal * (storeSettings.bulk_discount_percent / 100);
        if(bulkRow) bulkRow.style.display = 'flex'; 
        if(bulkVal) bulkVal.innerText = bulkDiscountValue.toFixed(2);
    } else {
        if(bulkRow) bulkRow.style.display = 'none';
        bulkDiscountValue = 0;
    }

    // -- 3. حساب خصم الكوبون --
    let couponDiscountValue = 0;
    const couponDisplay = document.getElementById('discount-display');
    const couponAmount = document.getElementById('discount-amount');

    if (appliedCoupon) {
        if (appliedCoupon.discount_type === 'PERCENTAGE') {
            couponDiscountValue = subtotal * (appliedCoupon.discount_value / 100);
        } else {
            couponDiscountValue = appliedCoupon.discount_value;
        }
        if(couponDisplay) couponDisplay.style.display = 'flex';
        if(couponAmount) couponAmount.innerText = `-${couponDiscountValue.toFixed(2)} ج.م`;
    } else {
        if(couponDisplay) couponDisplay.style.display = 'none';
    }

    // -- 4. حساب خصم نقاط الولاء --
    const loyaltyRow = document.getElementById('loyalty-discount-row');
    const loyaltyVal = document.getElementById('loyalty-discount-val');
    
    if (isPointsApplied && loyaltyDiscountValue > 0) {
        if(loyaltyRow) loyaltyRow.style.display = 'flex';
        if(loyaltyVal) loyaltyVal.innerText = `-${loyaltyDiscountValue.toFixed(2)} ج.م`;
    } else {
        if(loyaltyRow) loyaltyRow.style.display = 'none';
    }

    // -- 5. تجميع كل الخصومات وحساب النهائي --
    let totalDiscounts = bulkDiscountValue + couponDiscountValue + (isPointsApplied ? loyaltyDiscountValue : 0);
    let finalTotal = (subtotal - totalDiscounts) + deliveryCost;

    if(finalTotal < 0) finalTotal = 0; 

    const totalEl = document.getElementById('total-price');
    if(totalEl) totalEl.innerText = finalTotal.toFixed(2) + " ج.م";
};

/**
 * 7. دوال الكوبون
 */
window.applyCoupon = async () => {
    const inputEl = document.getElementById('coupon-input');
    if(!inputEl) return;
    const code = inputEl.value.trim().toUpperCase();
    const msgEl = document.getElementById('coupon-msg');
    
    const subEl = document.getElementById('subtotal-price');
    const subtotalText = subEl ? subEl.innerText : "0";
    const subtotal = parseFloat(subtotalText.replace(" ج.م", "")) || 0;

    if (!code) return;

    try {
        const { data: coupon, error } = await window.supabaseClient
            .from('coupons')
            .select('*')
            .eq('code', code)
            .eq('is_active', true)
            .single();

        if (error || !coupon) {
            if(msgEl) { msgEl.innerText = "❌ الكوبون غير صحيح أو منتهي الصلاحية"; msgEl.style.color = "red"; }
            removeCoupon();
            return;
        }

        if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
            if(msgEl) { msgEl.innerText = "❌ هذا الكوبون انتهت صلاحيته"; msgEl.style.color = "red"; }
            removeCoupon();
            return;
        }

        if (subtotal < coupon.min_order_amount) {
            if(msgEl) { msgEl.innerText = `⚠️ يلزمك طلب بـ ${coupon.min_order_amount} ج.م لتفعيل الخصم`; msgEl.style.color = "orange"; }
            removeCoupon();
            return;
        }

        appliedCoupon = coupon;
        if(msgEl) { msgEl.innerText = "✅ تم تطبيق الخصم بنجاح!"; msgEl.style.color = "green"; }
        updateTotalWithDelivery(); 

    } catch (err) {
        console.error(err);
    }
};

window.removeCoupon = () => {
    appliedCoupon = null;
    updateTotalWithDelivery();
};

/**
 * 8. دوال التحقق من نقاط الولاء وتطبيقها
 */
window.checkLoyaltyPoints = async () => {
    const phone = document.getElementById('loyalty-phone').value.trim();
    const msgEl = document.getElementById('loyalty-msg');
    const usePointsSection = document.getElementById('use-points-section');
    
    if (!phone) {
        if(msgEl) { msgEl.innerText = "يرجى كتابة رقم الهاتف أولاً."; msgEl.style.color = "red"; }
        return;
    }

    if(msgEl) { msgEl.innerText = "جاري التحقق... ⏳"; msgEl.style.color = "#64748b"; }

    try {
        const { data: user, error } = await window.supabaseClient
            .from('users')
            .select('full_name, loyalty_points')
            .eq('phone', phone)
            .single();

        if (error || !user) {
            if(msgEl) { msgEl.innerText = "لا يوجد حساب سابق بهذا الرقم، اطلب الآن لتبدأ بجمع النقاط! 🎁"; msgEl.style.color = "#64748b"; }
            if(usePointsSection) usePointsSection.style.display = 'none';
            return;
        }

        userLoyaltyPoints = user.loyalty_points || 0;

        if (userLoyaltyPoints < 10) {
            if(msgEl) { msgEl.innerText = `أهلاً ${user.full_name || ''} 👋.. رصيدك الحالي (${userLoyaltyPoints} نقطة) غير كافٍ للاستبدال.`; msgEl.style.color = "#d97706"; }
            if(usePointsSection) usePointsSection.style.display = 'none';
        } else {
            const pointsValue = Math.floor(userLoyaltyPoints / 10) * storeSettings.discount_per_10_points;
            
            if(msgEl) { msgEl.innerText = `أهلاً ${user.full_name || ''} 👋.. لديك ${userLoyaltyPoints} نقطة تساوي خصم (${pointsValue} ج.م) 🎉`; msgEl.style.color = "green"; }
            if(usePointsSection) use
