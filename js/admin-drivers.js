// js/admin-drivers.js

document.addEventListener('DOMContentLoaded', async () => {
    if (sessionStorage.getItem('is_admin') !== 'true') {
        window.location.href = 'admin-login.html';
        return;
    }

    await loadDriversData();
    setupForms();
});

// 1. الدالة المطورة لجلب المناديب وحساب "العهد المالية" (قبل وبعد التسوية)
async function loadDriversData() {
    try {
        const { data: drivers, error: dError } = await window.supabaseClient
            .from('users') // نعتمد على جدول users الموحد
            .select('*')
            .eq('role', 'DRIVER')
            .order('created_at', { ascending: false });

        if (dError) throw dError;

        // جلب الطلبات المسلمة التي "لم يتم توريد كاشها للمطبخ بعد"
        const { data: orders, error: oError } = await window.supabaseClient
            .from('orders')
            .select('*')
            .eq('status', 'DELIVERED')
            .eq('settled_with_admin', false); // 👈 الميزة الجديدة

        if (oError) throw oError;

        const listBody = document.getElementById('drivers-list-body');
        if (!listBody) return;
        listBody.innerHTML = '';

        drivers.forEach(driver => {
            // تصفية الطلبات الخاصة بالمندوب الحالي التي في عهدته
            // ملاحظة: نربط بـ customer_phone حالياً أو driver_id إذا كان مسجلاً
            const duesOrders = orders.filter(o => o.driver_id === driver.id || o.customer_phone === driver.phone);
            
            // حساب "الكاش الإجمالي" و "صافي المطبخ"
            let totalCash = 0;
            let totalCommission = 0;
            
            duesOrders.forEach(o => {
                totalCash += (o.total_amount + (o.delivery_commission || 30));
                totalCommission += (o.delivery_commission || 30);
            });

            const netToKitchen = totalCash - totalCommission;

            listBody.innerHTML += `
                <tr>
                    <td><strong>${driver.full_name}</strong></td>
                    <td>${driver.phone}</td>
                    <td style="text-align:center;">
                        <span style="font-weight:bold; color:#3b82f6;">${duesOrders.length}</span> طلبات معلقة
                    </td>
                    <td style="text-align:center;">
                        <div style="font-size:0.8rem; color:#64748b;">عهدة كاش: ${totalCash} ج</div>
                        <div style="font-weight:bold; color:#d97706; font-size:1.1rem;">صافي للمطبخ: ${netToKitchen} ج</div>
                    </td>
                    <td style="display:flex; gap:5px; justify-content:center;">
                        <button class="btn-primary" style="background:#10b981; border:none;" 
                                onclick="settleDriverAccount(${driver.id}, ${netToKitchen})">
                            استلام النقدية وتصفير 💰
                        </button>
                        <button class="btn-status" style="background:#3b82f6; color:white;" onclick="openHistoryModal(${driver.id}, '${driver.full_name}')">السجل</button>
                    </td>
                </tr>
            `;
        });

    } catch (err) {
        console.error("خطأ:", err);
    }
}

// 2. وظيفة "تصفير العداد" (التسوية المالية)
window.settleDriverAccount = async (driverId, netAmount) => {
    if (netAmount <= 0) return alert("المندوب ليس لديه مبالغ مستحقة حالياً.");
    
    if (!confirm(`هل استلمت مبلغ ${netAmount} ج.م من المندوب؟ سيتم تصفير عهدته الآن.`)) return;

    try {
        // تحديث كل الطلبات المسلمة والتابعة لهذا المندوب لتصبح "settled_with_admin = true"
        const { error } = await window.supabaseClient
            .from('orders')
            .update({ settled_with_admin: true })
            .eq('status', 'DELIVERED')
            .eq('settled_with_admin', false)
            .eq('driver_id', driverId);

        if (error) throw error;

        alert("تم استلام النقدية وتصفير عداد المندوب بنجاح ✅");
        loadDriversData(); // تحديث فوري للشاشة

    } catch (err) {
        alert("حدث خطأ أثناء التسوية.");
    }
};

// ... (باقي دوال النوافذ المنبثقة من كودك الأصلي) ...
function setupForms() { /* الأكواد الخاصة بالنماذج في ملفك الأصلي */ }
