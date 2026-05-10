// js/cart.js

document.addEventListener('DOMContentLoaded', () => {
    displayCartItems();
    
    // إخفاء العنوان إذا كان العميل سيستلم من المطبخ
    document.getElementById('delivery-type').addEventListener('change', (e) => {
        const addressGroup = document.getElementById('address-group');
        addressGroup.style.display = e.target.value === 'PICKUP' ? 'none' : 'block';
    });

    // معالجة إرسال الطلب
    document.getElementById('order-form').addEventListener('submit', handleOrderSubmission);
});

// 1. عرض الوجبات الموجودة في السلة (LocalStorage)
function displayCartItems() {
    const cart = JSON.parse(localStorage.getItem('sara_cart')) || [];
    const container = document.getElementById('cart-items-container');
    const totalEl = document.getElementById('total-price');
    
    container.innerHTML = '';
    let total = 0;

    if (cart.length === 0) {
        container.innerHTML = '<p class="empty-msg">سلة المشتريات فارغة.. ابدأ بإضافة وجباتك المفضلة!</p>';
        totalEl.textContent = window.formatCurrency(0);
        return;
    }

    cart.forEach((item, index) => {
        total += item.price * item.quantity;
        container.innerHTML += `
            <div class="cart-item">
                <div class="item-info">
                    <h4>${item.name}</h4>
                    <p>${window.formatCurrency(item.price)}</p>
                </div>
                <div class="item-qty">
                    <button onclick="updateQty(${index}, -1)">-</button>
                    <span>${item.quantity}</span>
                    <button onclick="updateQty(${index}, 1)">+</button>
                </div>
                <button class="btn-remove" onclick="removeItem(${index})">🗑️</button>
            </div>
        `;
    });

    totalEl.textContent = window.formatCurrency(total);
}

// 2. تحديث الكمية
window.updateQty = (index, change) => {
    let cart = JSON.parse(localStorage.getItem('sara_cart'));
    cart[index].quantity += change;
    
    if (cart[index].quantity < 1) cart[index].quantity = 1;
    
    localStorage.setItem('sara_cart', JSON.stringify(cart));
    displayCartItems();
};

// 3. حذف صنف
window.removeItem = (index) => {
    let cart = JSON.parse(localStorage.getItem('sara_cart'));
    cart.splice(index, 1);
    localStorage.setItem('sara_cart', JSON.stringify(cart));
    displayCartItems();
};

// 4. إرسال الطلب لـ Supabase
async function handleOrderSubmission(e) {
    e.preventDefault();
    const cart = JSON.parse(localStorage.getItem('sara_cart')) || [];
    
    if (cart.length === 0) {
        alert("سلتك فارغة!");
        return;
    }

    const orderData = {
        order_code: window.APP_CONFIG.orderCodePrefix + Math.floor(1000 + Math.random() * 9000),
        customer_name: document.getElementById('cust-name').value,
        customer_phone: document.getElementById('cust-phone').value,
        customer_address: document.getElementById('cust-address').value,
        delivery_type: document.getElementById('delivery-type').value,
        total_amount: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        status: 'PENDING'
    };

    // حفظ الطلب في جدول orders
    const { data, error } = await window.supabaseClient
        .from('orders')
        .insert([orderData])
        .select();

    if (error) {
        console.error(error);
        alert("حدث خطأ أثناء إرسال الطلب، حاول مرة أخرى.");
    } else {
        // حفظ الأصناف في جدول order_items
        const orderId = data[0].id;
        const itemsToInsert = cart.map(item => ({
            order_id: orderId,
            name: item.name,
            quantity: item.quantity,
            unit_price: item.price,
            total_price: item.price * item.quantity
        }));

        await window.supabaseClient.from('order_items').insert(itemsToInsert);

        alert(`تم استلام طلبك بنجاح! كود الطلب هو: ${orderData.order_code}`);
        localStorage.removeItem('sara_cart');
        window.location.href = `track.html?code=${orderData.order_code}`;
    }
}
