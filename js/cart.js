// js/cart.js

// متغيرات عامة لحفظ الكوبونات وإعدادات المتجر
let appliedCoupon = null; 
let storeSettings = {
    bulk_threshold: 500, // قيم افتراضية
    bulk_discount_percent: 10
};

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
    // لو انتي مسمية السلة cart او sara_cart، اتأكدي من الاسم، هنا استخدمنا 'cart' زي الكود بتاعك
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
            <div class="cart-item" style="display: flex; align-items: center; background: white; padding: 15px; margin-bottom: 10px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                <img src="${item.image_url || item.image || 'default-food.png'}" alt="${item.name}" style="width: 70px; height: 70px; border-radius: 8px; margin-left: 15px;">
                
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

    // تحديث سعر المشتريات فقط
    document.getElementById('subtotal-price').innerText = subtotal.toFixed(2) + " ج.م";
    
    // استدعاء دالة تحديث الإجمالي النهائي فوراً
    updateTotalWithDelivery();
}

/**
 * 3. دالة تعديل الكمية يدوياً
 */
window.updateItemQuantity = (index, newQuantity) => {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    let qty = parseInt(newQuantity);
    
    if (qty < 1) qty = 1; // منع الكميات السالبة أو الصفر
    
    cart[index].quantity = qty;
    localStorage.setItem('cart', JSON.stringify(cart));
    
    renderCart(); // إعادة رسم السلة لتحديث الأسعار والإجمالي
};

/**
 * 4. دالة حذف منتج من السلة
 */
window.removeFromCart = (index) => {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    cart.splice(index, 1);
    localStorage.setItem('cart', JSON.stringify(cart));
    renderCart(); // إعادة العرض فوراً
};

/**
 * 5. دالة التحكم في إظهار/إخ
