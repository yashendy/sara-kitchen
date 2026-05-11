// js/cart.js

document.addEventListener('DOMContentLoaded', () => {
    renderCart(); // عرض المنتجات عند تحميل الصفحة
});

// 1. دالة عرض محتويات السلة (الموجودة عندك مسبقاً مع تعديل بسيط)
function renderCart() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const container = document.getElementById('cart-items-container');
    let subtotal = 0;

    container.innerHTML = '';

    if (cart.length === 0) {
        container.innerHTML = '<p style="text-align:center;">السلة فارغة حالياً</p>';
        document.getElementById('subtotal-price').innerText = "0.00 ج.م";
        updateTotalWithDelivery(); // لتصفير الإجمالي أيضاً
        return;
    }

    cart.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;
        container.innerHTML += `
            <div class="cart-item">
                <img src="${item.image}" alt="${item.name}">
                <div class="item-details">
                    <h4>${item.name}</h4>
                    <p>${item.price} ج.م × ${item.quantity}</p>
                </div>
                <button onclick="removeFromCart(${index})" class="btn-remove">حذف</button>
            </div>
        `;
    });

    document.getElementById('subtotal-price').innerText = subtotal.toFixed(2) + " ج.م";
    
    // استدعاء دالة التحديث لضمان حساب التوصيل فور ظهور المنتجات
    updateTotalWithDelivery(); 
}

// --- الدوال الجديدة التي سألتِ عنها ---

// 2. إخفاء أو إظهار خيارات المناطق بناءً على نوع الاستلام
window.toggleDeliveryZones = () => {
    const type = document.getElementById('delivery-type').value;
    const zonesGroup = document.getElementById('zones-group');
    const deliveryRow = document.getElementById('delivery-row');
    const addressGroup = document.getElementById('address-group');
    
    if (type === 'PICKUP') {
        zonesGroup.style.display = 'none';
        deliveryRow.style.display = 'none';
        addressGroup.style.display = 'none'; // لا داعي للعنوان لو هيستلم من المطبخ
    } else {
        zonesGroup.style.display = 'block';
        deliveryRow.style.display = 'flex';
        addressGroup.style.display = 'block';
    }
    updateTotalWithDelivery();
};

// 3. تحديث السعر النهائي شامل التوصيل (العصب الرئيسي للحسبة)
window.updateTotalWithDelivery = () => {
    // جلب سعر المنتجات فقط من الشاشة وتحويله لرقم
    const subtotalText = document.getElementById('subtotal-price').innerText;
    const subtotal = parseFloat(subtotalText.replace(" ج.م", "")) || 0;
    
    const deliveryType = document.getElementById('delivery-type').value;
    const zoneValue = document.getElementById('delivery-zone').value;
    
    let deliveryCost = 0;
    
    if (deliveryType === 'DELIVERY') {
        if (zoneValue === 'custom') {
            deliveryCost = 0; 
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

// 4. معالجة إرسال الطلب (Submit Order)
document.getElementById('order-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const deliveryType = document.getElementById('delivery-type').value;
    const zoneValue = document.getElementById('delivery-zone').value;
    
    // حساب العمولة النهائية لإرسالها لقاعدة البيانات
    let commission = 0;
    if (deliveryType === 'DELIVERY' && zoneValue !== 'custom') {
        commission = parseFloat(zoneValue);
    }

    // هنا يتم تجميع بيانات الطلب لإرسالها لـ Supabase
    const orderData = {
        customer_name: document.getElementById('cust-name').value,
        customer_phone: document.getElementById('cust-phone').value,
        customer_address: deliveryType === 'PICKUP' ? 'استلام من المطبخ' : document.getElementById('cust-address').value,
        total_amount: parseFloat(document.getElementById('total-price').innerText),
        delivery_commission: commission, // القيمة اللي حددناها بناءً على المنطقة
        status: 'PENDING',
        order_code: Math.floor(1000 + Math.random() * 9000).toString()
    };

    // كود الإرسال لـ Supabase (تأكدي من الربط الصحيح)
    const { data, error } = await window.supabaseClient.from('orders').insert([orderData]);

    if (!error) {
        alert("تم استلام طلبك بنجاح! كود الطلب: " + orderData.order_code);
        localStorage.removeItem('cart');
        window.location.href = 'index.html';
    } else {
        alert("خطأ في إرسال الطلب: " + error.message);
    }
});

// وظيفة حذف منتج
window.removeFromCart = (index) => {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    cart.splice(index, 1);
    localStorage.setItem('cart', JSON.stringify(cart));
    renderCart();
};
