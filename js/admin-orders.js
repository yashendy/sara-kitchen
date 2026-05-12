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
        const listEl = document.getElementById(`list-${status}`);
        const countEl = document.getElementById(`count-${status}`);
        if (listEl) listEl.innerHTML = '';
        if (countEl) countEl.innerText = '0';
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

        // 👈 التعديل الأول: محاولة استخراج اسم المندوب من الربط بقاعدة البيانات
        let driverName = '';
        if (order.delivery_drivers && order.delivery_drivers.name) {
            driverName = order.delivery_drivers.name;
        }

        // تجهيز شكل المندوب لو كان موجود
        const driverHtml = driverName ? 
            `<div style="margin-top: 5px; color: #8b5cf6; font-weight: bold; font-size: 0.85rem;">
                🛵 المندوب: ${driverName}
            </div>` : '';

        const card = document.createElement('div');
        card.className = `order-card status-${order.status}`;
        
        // 👈 التعديل الثاني: إضافة ${driverHtml} تحت عنوان العميل
        card.innerHTML = `
            <div class="card-header">
                <span class="order-code">${order.order_code}</span>
                <span class="order-time">${time}</span>
            </div>
            <div class="customer-info">
                <span class="customer-name">${order.customer_name}</span>
                <span class="customer-addr">${order.customer_address || 'استلام من المطبخ'}</span>
                ${driverHtml}
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
    // 1. زرار الطباعة: متاح دائماً ليتمكن المطبخ من طباعة البون في أي وقت
    const printBtn = `<button class="btn-status" 
                        style="background:#475569; color:white; max-width:45px; display:flex; align-items:center; justify-content:center;" 
                        onclick="printOrder(${order.id})" 
                        title="طباعة الفاتورة">
                        🖨️
                      </button>`;
    
    let actionBtn = "";

    // 2. تحديد زرار الحالة بناءً على وضع الأوردر الحالي
    if (order.status === 'PENDING') {
        actionBtn = `<button class="btn-status btn-primary" onclick="updateStatus(${order.id}, 'PREPARING')">بدء التحضير 👨‍🍳</button>`;
    } else if (order.status === 'PREPARING') {
        actionBtn = `<button class="btn-status btn-primary" style="background:#8b5cf6" onclick="openDriverModal(${order.id})">تسليم لمندوب 🛵</button>`;
    } else if (order.status === 'WITH_DRIVER') {
        actionBtn = `<button class="btn-status btn-primary" style="background:#10b981" onclick="updateStatus(${order.id}, 'DELIVERED')">تم التوصيل ✅</button>`;
    } else {
        actionBtn = `<span style="color:#10b981; font-size:0.8rem; font-weight:bold;">✅ طلب مكتمل</span>`;
    }

    // 3. دمج الزرار في حاوية واحدة (Flex) لضمان التنسيق
    return `
        <div style="display:flex; gap:8px; width:100%; align-items:center;">
            ${printBtn}
            <div style="flex-grow:1;">${actionBtn}</div>
        </div>
    `;
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

async function printOrder(orderId) {
    // 1. جلب بيانات الأوردر من المصفوفة المحفوظة عندنا
    // ملاحظة: تأكدي أن loadOrders تحفظ البيانات في متغير اسمه allOrders
    const order = allOrders.find(o => o.id === orderId);
    if (!order) return;

    // 2. تعبئة بيانات الفاتورة في القسم المخفي
    document.getElementById('p-order-code').innerText = `رقم الطلب: ${order.order_code}`;
    document.getElementById('p-date').innerText = new Date(order.created_at).toLocaleString('ar-EG');
    document.getElementById('p-cust-name').innerText = order.customer_name;
    document.getElementById('p-cust-addr').innerText = order.customer_address || 'استلام من المطبخ';
    document.getElementById('p-cust-phone').innerText = order.customer_phone;
    document.getElementById('p-total').innerText = order.total_amount;

    const itemsBody = document.getElementById('p-items');
    itemsBody.innerHTML = '';
    
    if (order.items) {
        let items = order.items;
        if (typeof items === 'string') items = JSON.parse(items);
        
        items.forEach(item => {
            itemsBody.innerHTML += `
                <tr>
                    <td>${item.name}</td>
                    <td>${item.quantity}</td>
                    <td>${(item.price * item.quantity)} ج</td>
                </tr>
            `;
        });
    }

    // 3. أمر الطباعة
    window.print();
}
