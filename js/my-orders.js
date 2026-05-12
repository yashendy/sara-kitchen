// js/my-orders.js

// مصفوفة عالمية لتخزين طلبات العميل الحالية عشان نقدر نوصل للأصناف وقت إعادة الطلب
let currentCustomerOrders = [];

async function fetchMyOrders() {
    const phoneInput = document.getElementById('phone-input').value.trim();
    const resultsContainer = document.getElementById('orders-results');

    if (!phoneInput) {
        alert("يرجى إدخال رقم الهاتف أولاً!");
        return;
    }

    resultsContainer.innerHTML = '<p style="text-align: center;">جارٍ البحث عن طلباتك... ⏳</p>';

    try {
        const { data, error } = await window.supabaseClient
            .from('orders')
            .select('*')
            .eq('customer_phone', phoneInput)
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!data || data.length === 0) {
            resultsContainer.innerHTML = `
                <div style="text-align: center; padding: 30px; background: white; border-radius: 12px;">
                    <h3>لم نجد أي طلبات مسجلة بهذا الرقم 😔</h3>
                    <p>فرصة ممتازة عشان تجرب أكلنا دلوقتي!</p>
                    <a href="menu.html" class="btn-primary" style="display: inline-block; margin-top: 15px; text-decoration: none;">تصفح المنيو</a>
                </div>`;
            return;
        }

        // حفظ الطلبات في المتغير العالمي
        currentCustomerOrders = data;
        renderCustomerOrders(data);

    } catch (err) {
        console.error("خطأ في جلب الطلبات:", err);
        resultsContainer.innerHTML = '<p style="text-align: center; color: red;">حدث خطأ في الاتصال، يرجى المحاولة لاحقاً.</p>';
    }
}

function renderCustomerOrders(orders) {
    const resultsContainer = document.getElementById('orders-results');
    resultsContainer.innerHTML = '';

    const statusNames = {
        'PENDING': 'بانتظار التأكيد ⏳',
        'PREPARING': 'في المطبخ 👩‍🍳',
        'WITH_DRIVER': 'في الطريق 🛵',
        'DELIVERED': 'تم التوصيل ✅'
    };

    orders.forEach(order => {
        const dateObj = new Date(order.created_at);
        const formattedDate = dateObj.toLocaleDateString('ar-EG') + ' - ' + dateObj.toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'});
        
        let itemsText = "تفاصيل غير متوفرة";
        // التحقق من وجود أصناف محفوظة داخل الطلب
        if (order.items && Array.isArray(order.items)) {
            itemsText = order.items.map(item => `✔️ ${item.quantity}x ${item.name}`).join('<br>');
        }

        const card = document.createElement('div');
        card.className = 'history-card';
        card.innerHTML = `
            <div class="history-header">
                <div>
                    <strong>طلب رقم: ${order.order_code}</strong>
                    <div class="history-date">${formattedDate}</div>
                </div>
                <span class="status-badge bg-${order.status}">${statusNames[order.status] || order.status}</span>
            </div>
            
            <div class="history-items">
                <strong>محتويات الطلب:</strong><br>
                ${itemsText}
            </div>

            <div class="history-footer">
                <div class="history-total">الإجمالي: ${order.total_amount} ج.م</div>
                <button class="btn-reorder" onclick="reorderItems(${order.id})">إعادة الطلب 🔄</button>
            </div>
        `;

        resultsContainer.appendChild(card);
    });
}

// 🔄 دالة إعادة الطلب (السحر كله هنا)
function reorderItems(orderId) {
    // البحث عن الطلب المطلوب من المصفوفة المحفوظة
    const targetOrder = currentCustomerOrders.find(o => o.id === orderId);
    
    if (!targetOrder || !targetOrder.items || targetOrder.items.length === 0) {
        alert("عذراً، تفاصيل الأصناف لهذا الطلب غير متوفرة لإعادة طلبها.");
        return;
    }

    // تأكيد من العميل
    const confirmReorder = confirm("هل تريد مسح سلتك الحالية وإضافة مكونات هذا الطلب إليها؟");
    if (!confirmReorder) return;

    // أخذ الأصناف ووضعها في سلة المتصفح (localStorage)
    localStorage.setItem('cart', JSON.stringify(targetOrder.items));
    
    // تحديث رقم العداد فوق في الهيدر
    if (typeof updateCartCount === 'function') {
        updateCartCount();
    }

    // توجيه العميل فوراً لصفحة السلة عشان يأكد الطلب
    window.location.href = 'cart.html';
}
