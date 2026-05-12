// js/admin-orders.js

let selectedOrderId = null;
let allOrders = []; // 👈 هذا هو السطر الذي كان يسبب مشكلة الطباعة!

document.addEventListener('DOMContentLoaded', async () => {
    await loadOrders();
    await loadDrivers();
    
    // تحديث تلقائي كل 30 ثانية للطلبات الجديدة
    setInterval(loadOrders, 30000);
});

async function loadOrders() {
    try {
        const { data: orders, error } = await window.supabaseClient
            .from('orders')
            .select(`
                *,
                delivery_drivers (name)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        allOrders = orders; // 👈 حفظ الطلبات في المتغير لتعمل الطباعة والواتساب بشكل صحيح
        renderBoard(orders);
    } catch (err) {
        console.error("Error loading orders:", err);
    }
}

function renderBoard(orders) {
    const statuses = ['PENDING', 'PREPARING', 'WITH_DRIVER', 'DELIVERED'];
    
    statuses.forEach(status => {
        const listEl = document.getElementById(`list-${status}`);
        const countEl = document.getElementById(`count-${status}`);
        if (listEl) listEl.innerHTML = '';
        if (countEl) countEl.innerText = '0';
    });

    orders.forEach(order => {
        const list = document.getElementById(`list-${order.status}`);
        if (!list) return;

        const countEl = document.getElementById(`count-${order.status}`);
        countEl.innerText = parseInt(countEl.innerText) + 1;

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

        let driverName = '';
        if (order.delivery_drivers && order.delivery_drivers.name) {
            driverName = order.delivery_drivers.name;
        }

        const driverHtml = driverName ? 
            `<div style="margin-top: 5px; color: #8b5cf6; font-weight: bold; font-size: 0.85rem;">
                🛵 المندوب: ${driverName}
            </div>` : '';

        const card = document.createElement('div');
        card.className = `order-card status-${order.status}`;
        
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
    const printBtn = `<button class="btn-status" 
                        style="background:#475569; color:white; max-width:45px; display:flex; align-items:center; justify-content:center;" 
                        onclick="printOrder(${order.id})" 
                        title="طباعة الفاتورة">
                        🖨️
                      </button>`;
    
    let actionBtn = "";

    if (order.status === 'PENDING') {
        actionBtn = `<button class="btn-status btn-primary" onclick="updateStatus(${order.id}, 'PREPARING')">بدء التحضير 👨‍🍳</button>`;
    } else if (order.status === 'PREPARING') {
        actionBtn = `<button class="btn-status btn-primary" style="background:#8b5cf6" onclick="openDriverModal(${order.id})">تسليم لمندوب 🛵</button>`;
    } else if (order.status === 'WITH_DRIVER') {
        actionBtn = `<button class="btn-status btn-primary" style="background:#10b981" onclick="updateStatus(${order.id}, 'DELIVERED')">تم التوصيل ✅</button>`;
    } else {
        actionBtn = `<span style="color:#10b981; font-size:0.8rem; font-weight:bold;">✅ طلب مكتمل</span>`;
    }

    return `
        <div style="display:flex; gap:8px; width:100%; align-items:center;">
            ${printBtn}
            <div style="flex-grow:1;">${actionBtn}</div>
        </div>
    `;
}

// === دوال مساعدة للواتساب ===

// تحويل تفاصيل الطلب لنص منسق للواتساب
function formatItemsForWhatsApp(itemsJson) {
    let itemsText = "";
    if (itemsJson) {
        let itemsArray = itemsJson;
        if (typeof itemsArray === 'string') {
            try { itemsArray = JSON.parse(itemsArray); } catch(e){}
        }
        if (Array.isArray(itemsArray)) {
            itemsText = itemsArray.map(item => `▪️ ${item.quantity}x ${item.name}`).join('\n');
        }
    }
    return itemsText || "بدون تفاصيل";
}

// ضبط رقم الهاتف ليناسب كود الدولة (مصر أو الكويت)
function formatPhoneNumber(phone) {
    if(!phone) return "";
    let p = phone.replace(/\D/g, ''); // إزالة أي مسافات أو رموز
    if (p.startsWith('01') && p.length === 11) {
        p = '2' + p; // كود مصر
    } else if (p.length === 8 && (p.startsWith('9') || p.startsWith('6') || p.startsWith('5'))) {
        p = '965' + p; // كود الكويت
    }
    return p;
}

// === تحديث الحالة وإرسال واتساب للعميل ===
async function updateStatus(id, newStatus) {
    try {
        const { error } = await window.supabaseClient
            .from('orders')
            .update({ status: newStatus })
            .eq('id', id);

        if (error) throw error;
        
        // 👈 إضافة ميزة: رسالة الواتساب للعميل عند بدء التحضير
        if (newStatus === 'PREPARING') {
            const order = allOrders.find(o => o.id === id);
            if (order && order.customer_phone) {
                let itemsList = formatItemsForWhatsApp(order.items);
                let msg = `أهلاً بك في مطبخ سارة 🍲\n`;
                msg += `طلبك رقم #${order.order_code} جاري تحضيره الآن! 👨‍🍳\n\n`;
                msg += `🛒 تفاصيل الطلب:\n${itemsList}\n\n`;
                msg += `💰 الإجمالي: ${order.total_amount} ج.م\n`;
                msg += `شكراً لاختيارك مطبخ سارة ❤️`;
                
                let waUrl = `https://wa.me/${formatPhoneNumber(order.customer_phone)}?text=${encodeURIComponent(msg)}`;
                window.open(waUrl, '_blank'); // فتح الواتساب في نافذة جديدة
            }
        }

        await loadOrders();
    } catch (err) {
        alert("خطأ في تحديث الحالة");
    }
}

// إدارة المندوبين
async function loadDrivers() {
    try {
        const { data, error } = await window.supabaseClient
            .from('delivery_drivers')
            .select('*');

        if (error) throw error;

        const select = document.getElementById('driverSelect');
        if (!select) return;

        select.innerHTML = '<option value="">اختر المندوب...</option>';
        if (data && data.length > 0) {
            data.forEach(d => {
                const driverName = d.name || d.username || d.full_name || `مندوب رقم ${d.id}`;
                // 👈 إضافة رقم الهاتف الخاص بالمندوب كمعلومة مخفية
                select.innerHTML += `<option value="${d.id}" data-phone="${d.phone || ''}">${driverName}</option>`;
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

// === تعيين المندوب وإرسال واتساب للمندوب ===
async function confirmAssignDriver() {
    const driverSelect = document.getElementById('driverSelect');
    const driverId = driverSelect.value;
    const driverOption = driverSelect.options[driverSelect.selectedIndex];
    const driverPhone = driverOption.getAttribute('data-phone');

    if (!driverId) return alert("يرجى اختيار مندوب أولاً");

    try {
        const { error } = await window.supabaseClient
            .from('orders')
            .update({ 
                status: 'WITH_DRIVER',
                driver_id: parseInt(driverId) 
            })
            .eq('id', selectedOrderId);

        if (error) throw error;
        
        // 👈 إضافة ميزة: رسالة الواتساب للمندوب عند استلام الطلب
        const order = allOrders.find(o => o.id === selectedOrderId);
        if (order && driverPhone) {
            let itemsList = formatItemsForWhatsApp(order.items);
            let msg = `🔔 أوردر جديد للتوصيل يا بطل 🛵\n\n`;
            msg += `🔖 رقم الطلب: #${order.order_code}\n`;
            msg += `👤 العميل: ${order.customer_name}\n`;
            msg += `📞 موبايل العميل: ${order.customer_phone}\n`;
            msg += `📍 العنوان: ${order.customer_address || 'استلام من المطبخ'}\n\n`;
            msg += `🛒 تفاصيل الأوردر:\n${itemsList}\n\n`;
            msg += `💰 المطلوب تحصيله: ${order.total_amount} ج.م\n`;
            msg += `توصل بالسلامة!`;

            let waUrl = `https://wa.me/${formatPhoneNumber(driverPhone)}?text=${encodeURIComponent(msg)}`;
            window.open(waUrl, '_blank'); // فتح الواتساب للمندوب
        } else if (!driverPhone) {
            alert("تم إسناد الطلب بنجاح، لكن لم يتم العثور على رقم هاتف للمندوب لإرسال الواتساب.");
        }

        closeDriverModal();
        await loadOrders(); 
    } catch (err) {
        console.error("خطأ أثناء تعيين المندوب:", err);
        alert("حدث خطأ أثناء تعيين المندوب");
    }
}

// === دالة الطباعة (تعمل بنجاح الآن) ===
async function printOrder(orderId) {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) return;

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
        if (typeof items === 'string') {
            try { items = JSON.parse(items); } catch(e){}
        }
        
        if (Array.isArray(items)) {
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
    }

    // أمر الطباعة
    window.print();
}
