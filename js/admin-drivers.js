// js/admin-drivers.js

document.addEventListener('DOMContentLoaded', async () => {
    if (sessionStorage.getItem('is_admin') !== 'true') {
        window.location.href = 'login.html';
        return;
    }
    await loadDriversData();
});

async function loadDriversData() {
    try {
        const { data: drivers, error: dError } = await window.supabaseClient
            .from('users')
            .select('*')
            .eq('role', 'DRIVER')
            .order('created_at', { ascending: false });
        if (dError) throw dError;

        const { data: orders, error: oError } = await window.supabaseClient
            .from('orders')
            .select('*')
            .eq('status', 'DELIVERED');
        if (oError) throw oError;

        const listBody = document.getElementById('drivers-list-body');
        if (!listBody) return;
        listBody.innerHTML = '';

        drivers.forEach(driver => {
            const driverOrders = orders.filter(o => o.driver_id === driver.id || o.customer_phone === driver.phone);
            
            let totalCashInHand = 0;
            let totalCommission = 0;
            let alreadyPaidToAdmin = 0;
            let unsettledOrdersCount = 0; // 👈 عداد الطلبات اللي لسه متوردتش بالكامل
            
            driverOrders.forEach(o => {
                const comm = o.delivery_commission || 30;
                // التصحيح المحاسبي: الفاتورة شاملة التوصيل، فمش هنجمع العمولة مرتين
                totalCashInHand += o.total_amount; 
                totalCommission += comm;
                alreadyPaidToAdmin += (o.admin_received_amount || 0);

                // لو الأوردر ده لسه المطبخ مخدش حقه الكامل فيه، نعده
                const kitchenShareForThisOrder = o.total_amount - comm;
                if ((o.admin_received_amount || 0) < kitchenShareForThisOrder) {
                    unsettledOrdersCount++;
                }
            });

            // صافي المطبخ = (إجمالي الفواتير - العمولات)
            const totalKitchenShare = totalCashInHand - totalCommission;
            // المتبقي = حق المطبخ - اللي اتورد قبل كده
            const remainingBalance = totalKitchenShare - alreadyPaidToAdmin;

            listBody.innerHTML += `
                <tr>
                    <td><strong>${driver.full_name}</strong></td>
                    <td>${driver.phone}</td>
                    <td style="text-align:center; font-weight:bold; color:#3b82f6;">${unsettledOrdersCount} طلبات</td>
                    <td style="text-align:center;">
                        <div style="color:#64748b; font-size:0.85rem;">إجمالي للمطبخ: ${totalKitchenShare} ج</div>
                        <div style="font-weight:800; color:${remainingBalance > 0 ? '#ef4444' : '#10b981'}; font-size:1.1rem; margin-top:5px;">
                            ${remainingBalance > 0 ? 'المتبقي عليه: ' + remainingBalance + ' ج' : 'خالص ✅'}
                        </div>
                    </td>
                    <td style="display:flex; gap:5px; justify-content:center;">
                        <button class="btn-primary" style="background:${remainingBalance > 0 ? '#10b981' : '#cbd5e1'}; border:none; padding:8px;" 
                                onclick="receivePartialPayment(${driver.id}, ${remainingBalance})" ${remainingBalance <= 0 ? 'disabled' : ''}>
                            استلام كاش 💰
                        </button>
                        <button class="btn-status" style="background:#3b82f6; color:white; padding:8px; border:none;" 
                                onclick="openHistoryModal(${driver.id}, '${driver.full_name}')">
                            السجل 📅
                        </button>
                    </td>
                </tr>
            `;
        });
    } catch (err) {
        console.error("خطأ:", err);
    }
}

window.receivePartialPayment = async (driverId, currentBalance) => {
    if (currentBalance <= 0) return alert("العداد مصفر، لا توجد مبالغ مستحقة على هذا المندوب! ✅");
    
    const amountStr = prompt(`المبلغ المتبقي على المندوب: ${currentBalance} ج.م\nأدخلي المبلغ الذي تم استلامه منه الآن:`);
    if (!amountStr) return;
    
    let payment = parseFloat(amountStr);
    if (isNaN(payment) || payment <= 0) return alert("عذراً، يرجى إدخال مبلغ صحيح.");
    if (payment > currentBalance) return alert("المبلغ المدخل أكبر من المديونية!");

    try {
        const { data: unsettledOrders, error } = await window.supabaseClient
            .from('orders')
            .select('*')
            .eq('status', 'DELIVERED')
            .eq('driver_id', driverId)
            .order('created_at', { ascending: true }); 

        if (error) throw error;

        for (let order of unsettledOrders) {
            if (payment <= 0) break; 
            
            const comm = order.delivery_commission || 30;
            const kitchenNet = order.total_amount - comm;
            const alreadyPaid = order.admin_received_amount || 0;
            const remainingForOrder = kitchenNet - alreadyPaid;

            if (remainingForOrder > 0) {
                let amountToApply = Math.min(payment, remainingForOrder);
                payment -= amountToApply;

                await window.supabaseClient.from('orders')
                    .update({ admin_received_amount: alreadyPaid + amountToApply })
                    .eq('id', order.id);
            }
        }
        
        alert("تم تسجيل المبلغ بنجاح وخصمه من عهدة المندوب! 💸");
        loadDriversData(); 

    } catch (err) {
        alert("حدث خطأ أثناء التسوية.");
        console.error(err);
    }
};

let currentHistoryDriverId = null;

window.openHistoryModal = (driverId, driverName) => {
    currentHistoryDriverId = driverId;
    document.getElementById('historyDriverName').innerText = `سجل طلبات: ${driverName}`;
    
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('history-start-date').value = today;
    document.getElementById('history-end-date').value = today;
    
    document.getElementById('historyModal').hidden = false;
    document.getElementById('historyModal').style.display = 'flex';
    filterDriverHistory();
};

window.closeHistoryModal = () => {
    document.getElementById('historyModal').hidden = true;
    document.getElementById('historyModal').style.display = 'none';
};

window.filterDriverHistory = async () => {
    const start = document.getElementById('history-start-date').value;
    const end = document.getElementById('history-end-date').value;
    if (!start || !end) return;

    const startDate = new Date(start); startDate.setHours(0,0,0,0);
    const endDate = new Date(end); endDate.setHours(23,59,59,999);

    try {
        const { data: orders, error } = await window.supabaseClient
            .from('orders')
            .select('*')
            .eq('driver_id', currentHistoryDriverId)
            .eq('status', 'DELIVERED')
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString())
            .order('created_at', { ascending: false });

        if (error) throw error;

        const tbody = document.getElementById('history-table-body');
        tbody.innerHTML = '';
        let totalCommission = 0;

        if (!orders || orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">لا توجد طلبات في هذه الفترة 📭</td></tr>';
        } else {
            orders.forEach(order => {
                const commission = order.delivery_commission || 30;
                totalCommission += commission;
                const time = new Date(order.created_at).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' });
                
                tbody.innerHTML += `
                    <tr>
                        <td style="font-weight:bold;">${order.order_code}</td>
                        <td style="font-size:0.9rem; color:#475569;">${time}</td>
                        <td>${order.total_amount} ج.م</td>
                        <td style="color:#10b981; font-weight:bold;">+ ${commission} ج</td>
                    </tr>
                `;
            });
        }
        document.getElementById('history-total-commission').innerText = `${totalCommission} ج.م`;

    } catch (err) {
        console.error("خطأ:", err);
    }
};
