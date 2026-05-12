// js/admin-orders.js

let selectedOrderId = null;

document.addEventListener('DOMContentLoaded', async () => {
    await loadOrders();
    await loadDrivers();
    
    // تحديث تلقائي كل 30 ثانية للطلبات الجديدة
    setInterval(loadOrders, 30000);
});

async function loadOrders() {
    try {
        // السحر هنا: بنجيب الأوردر ومعاه اسم المندوب المرتبط بيه
        const { data: orders, error } = await window.supabaseClient
            .from('orders')
            .select(`
                *,
                delivery_drivers (name)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        renderBoard(orders);
    } catch (err) {
        console.error("Error loading orders:", err);
    }
}
function renderBoard(orders) {
    const statuses = ['PENDING', 'PREPARING', 'WITH_DRIVER', 'DELIVERED'];
    
    // تصفير القوائم
    statuses.forEach(status => {
        document.getElementById(`list-${status}`).innerHTML = '';
        document.getElementById(`count-${status}`).innerText = '0';
    });

    orders.forEach(order => {
        const list = document.getElementById(`list-${order.status}`);
        if (!list) return;

        // تحديث العداد
        const countEl = document.getElementById(`count-${order.status}`);
        countEl.innerText = parseInt(countEl.innerText) + 1;

        // تجهيز عرض الأصناف (المكونات)
        let itemsHtml = '';
        if (order.items && Array.isArray(order.items)) {
            itemsHtml = order.items.map(item => `
                <div class="item-row">
                    <span>${item.name} x ${item.quantity}</span>
                    <span>${(item.price * item.quantity).toFixed(0)} ج</span>
                </div>
            `).join('');
        }

        const time = new Date(order.created_at).toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'});

        const card = document.createElement('div');
        card.className = `order-card status-${order.status}`;
        card.innerHTML = `
            <div class="card-header">
                <span class="order-code">${order.order_code}</span>
                <span class="order-time">${time}</span>
            </div>
            <div class="customer-info">
                <span class="customer-name">${order.customer_name}</span>
                <span class="customer-addr">${order.customer_address}</span>
            </div>
            <div class="items-summary">
                ${itemsHtml}
                <div style="border-top:1px solid #ddd; margin-top:5px; padding-top:5px; font-weight:bold;">
                    الإجمالي: ${order.total_amount} ج.م
                </div>
            </div>
            <div class="card-footer">
                ${renderActionButtons(order)}
            </div>
        `;
        list.appendChild(card);
    });
}

function renderActionButtons(order) {
    if (order.status === 'PENDING') {
        return `<button class="btn-status btn-primary" onclick="updateStatus(${order.id}, 'PREPARING')">بدء التحضير 👨‍🍳</button>`;
    } else if (order.status === 'PREPARING') {
        return `<button class="btn-status btn-primary" style="background:#8b5cf6" onclick="openDriverModal(${order.id})">تسليم لمندوب 🛵</button>`;
    } else if (order.status === 'WITH_DRIVER') {
        return `<button class="btn-status btn-primary" style="background:#10b981" onclick="updateStatus(${order.id}, 'DELIVERED')">تم التوصيل ✅</button>`;
    }
    return `<span style="color:#10b981; font-size:0.8rem">✅ طلب مكتمل</span>`;
}

async function updateStatus(id, newStatus) {
    try {
        const { error } = await window.supabaseClient
            .from('orders')
            .update({ status: newStatus })
            .eq('id', id);

        if (error) throw error;
        await loadOrders();
    } catch (err) {
        alert("خطأ في تحديث الحالة");
    }
}

// إدارة المندوبين
async function loadDrivers() {
    try {
        // التعديل هنا: استخدام الجدول الصحيح بناءً على الهيكل
        const { data, error } = await window.supabaseClient
            .from('delivery_drivers')
            .select('*');

        if (error) throw error;

        const select = document.getElementById('driverSelect');
        if (!select) return;

        select.innerHTML = '<option value="">اختر المندوب...</option>';
        if (data && data.length > 0) {
            data.forEach(d => {
                // بنعرض اسم المندوب (أو اليوزرنيم) وبنخزن الـ ID
                const driverName = d.name || d.username || d.full_name || `مندوب رقم ${d.id}`;
                select.innerHTML += `<option value="${d.id}">${driverName}</option>`;
            });
        }
    } catch (err) {
        console.error("خطأ في تحميل المندوبين:", err);
    }
}

function openDriverModal(orderId) {
    selectedOrderId = orderId;
    document.getElementById('driverModal').hidden = false;
}

function closeDriverModal() {
    document.getElementById('driverModal').hidden = true;
}

async function confirmAssignDriver() {
    const driverSelect = document.getElementById('driverSelect');
    const driverId = driverSelect.value;

    if (!driverId) return alert("يرجى اختيار مندوب أولاً");

    try {
        const { error } = await window.supabaseClient
            .from('orders')
            .update({ 
                status: 'WITH_DRIVER',
                driver_id: parseInt(driverId) // التعديل هنا: بنحفظ رقم المندوب مش اسمه
            })
            .eq('id', selectedOrderId);

        if (error) throw error;
        
        closeDriverModal();
        await loadOrders(); // تحديث اللوحة فوراً
    } catch (err) {
        console.error("خطأ أثناء تعيين المندوب:", err);
        alert("حدث خطأ أثناء تعيين المندوب");
    }
}
