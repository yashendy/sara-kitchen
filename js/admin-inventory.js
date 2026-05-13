// js/admin-inventory.js

document.addEventListener('DOMContentLoaded', async () => {
    // 1. التحقق من صلاحيات الإدارة
    if (sessionStorage.getItem('is_admin') !== 'true') {
        window.location.href = 'login.html';
        return;
    }

    // 2. تحميل البيانات أول ما الصفحة تفتح
    await loadInventoryData();
    await loadPurchasesData();

    // 3. ربط النماذج (Forms) بدوال الحفظ
    const invForm = document.getElementById('inventory-form');
    if (invForm) invForm.addEventListener('submit', saveInventoryItem);

    const purForm = document.getElementById('purchase-form');
    if (purForm) purForm.addEventListener('submit', savePurchaseRecord);
});

// ==========================================
// القسم الأول: إدارة خامات المخزن
// ==========================================

async function loadInventoryData() {
    try {
        const { data: inventory, error } = await window.supabaseClient
            .from('kitchen_inventory')
            .select('*')
            .order('item_name', { ascending: true });

        if (error) throw error;

        const tbody = document.getElementById('inventory-list');
        tbody.innerHTML = '';
        let shortageCount = 0; // عداد النواقص

        if (!inventory || inventory.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">المخزن فارغ حالياً 📦</td></tr>';
        } else {
            inventory.forEach(item => {
                // التحقق هل الرصيد أقل من أو يساوي الحد الأدنى؟
                const isShortage = item.current_stock <= item.min_required;
                if (isShortage) shortageCount++;

                tbody.innerHTML += `
                    <tr>
                        <td><strong>${item.item_name}</strong></td>
                        <td style="font-weight:bold; font-size:1.1rem; color:${isShortage ? '#ef4444' : '#10b981'};">
                            ${item.current_stock}
                        </td>
                        <td style="color:#64748b;">${item.unit}</td>
                        <td>
                            ${isShortage 
                                ? '<span class="badge-danger">مطلوب شراء ⚠️</span>' 
                                : '<span class="badge-safe">رصيد آمن ✅</span>'}
                        </td>
                    </tr>
                `;
            });
        }

        // تحديث إحصائيات النواقص فوق
        document.getElementById('total-shortages').innerText = `${shortageCount} صنف`;

    } catch (err) {
        console.error("خطأ في جلب المخزون:", err);
    }
}

async function saveInventoryItem(e) {
    e.preventDefault();
    
    const payload = {
        item_name: document.getElementById('inv-name').value.trim(),
        unit: document.getElementById('inv-unit').value.trim(),
        current_stock: parseFloat(document.getElementById('inv-stock').value) || 0,
        min_required: parseFloat(document.getElementById('inv-min').value) || 0
    };

    try {
        const { error } = await window.supabaseClient.from('kitchen_inventory').insert([payload]);
        if (error) throw error;

        alert('تمت إضافة الصنف للمخزن بنجاح! 📦');
        document.getElementById('inventoryModal').hidden = true;
        loadInventoryData(); // تحديث الجدول فوراً
    } catch (err) {
        alert("حدث خطأ أثناء الحفظ.");
        console.error(err);
    }
}

// ==========================================
// القسم الثاني: إدارة المشتريات والديون
// ==========================================

async function loadPurchasesData() {
    try {
        const { data: purchases, error } = await window.supabaseClient
            .from('kitchen_purchases')
            .select('*')
            .order('purchase_date', { ascending: false });

        if (error) throw error;

        const tbody = document.getElementById('purchases-list');
        tbody.innerHTML = '';
        
        let totalPaidCash = 0;
        let totalRemainingDebt = 0;

        if (!purchases || purchases.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">لم يتم تسجيل أي مصروفات 💸</td></tr>';
        } else {
            purchases.forEach(pur => {
                totalPaidCash += (pur.paid_amount || 0);
                totalRemainingDebt += (pur.remaining_debt || 0);

                const dateStr = new Date(pur.purchase_date).toLocaleDateString('ar-EG');
                
                tbody.innerHTML += `
                    <tr>
                        <td>
                            <strong>${pur.description}</strong>
                            <div style="font-size:0.8rem; color:#64748b; margin-top:3px;">
                                🛒 ${pur.supplier_name || 'غير محدد'} | 📅 ${dateStr}
                            </div>
                        </td>
                        <td style="font-weight:bold;">${pur.total_cost} ج</td>
                        <td style="color:#10b981; font-weight:bold;">${pur.paid_amount} ج</td>
                        <td style="color:#ef4444; font-weight:bold;">
                            ${pur.remaining_debt > 0 ? pur.remaining_debt + ' ج' : 'خالص ✅'}
                        </td>
                    </tr>
                `;
            });
        }

        // تحديث الإحصائيات المالية فوق
        document.getElementById('total-expenses').innerText = `${totalPaidCash} ج`;
        document.getElementById('total-debts').innerText = `${totalRemainingDebt} ج`;

    } catch (err) {
        console.error("خطأ في جلب المشتريات:", err);
    }
}

async function savePurchaseRecord(e) {
    e.preventDefault();
    
    const totalCost = parseFloat(document.getElementById('pur-total').value) || 0;
    const paidAmount = parseFloat(document.getElementById('pur-paid').value) || 0;
    
    // حساب الدين أوتوماتيكياً (لو دفع أقل من الإجمالي)
    let remainingDebt = totalCost - paidAmount;
    if (remainingDebt < 0) remainingDebt = 0; 

    const payload = {
        description: document.getElementById('pur-desc').value.trim(),
        supplier_name: document.getElementById('pur-supplier').value.trim(),
        total_cost: totalCost,
        paid_amount: paidAmount,
        remaining_debt: remainingDebt
    };

    try {
        const { error } = await window.supabaseClient.from('kitchen_purchases').insert([payload]);
        if (error) throw error;

        alert('تم تسجيل المصروف بنجاح! 💸');
        document.getElementById('purchaseModal').hidden = true;
        loadPurchasesData(); // تحديث الجدول والأرقام فوراً
    } catch (err) {
        alert("حدث خطأ أثناء تسجيل المصروف.");
        console.error(err);
    }
}

// ==========================================
// دوال فتح وإغلاق النوافذ المنبثقة
// ==========================================
window.openInventoryModal = () => {
    document.getElementById('inventory-form').reset();
    document.getElementById('inventoryModal').hidden = false;
};

window.openPurchaseModal = () => {
    document.getElementById('purchase-form').reset();
    document.getElementById('purchaseModal').hidden = false;
};
