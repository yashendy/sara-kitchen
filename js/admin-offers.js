// js/admin-offers.js

document.addEventListener('DOMContentLoaded', async () => {
    // التأكد من تسجيل الدخول كأدمن (نفس الطريقة المتبعة في باقي صفحاتك)
    // if (!window.admin) return;
    
    await loadCoupons();
});

// 1. جلب الكوبونات من قاعدة البيانات
async function loadCoupons() {
    try {
        const { data: coupons, error } = await window.supabaseClient
            .from('coupons')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        const tbody = document.getElementById('coupons-list');
        tbody.innerHTML = '';

        if (coupons.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">لا توجد كوبونات حالياً. أضيفي أول كوبون!</td></tr>';
            return;
        }

        coupons.forEach(coupon => {
            const discountText = coupon.discount_type === 'PERCENTAGE' 
                ? `${coupon.discount_value}%` 
                : `${coupon.discount_value} ج.م`;
            
            const statusClass = coupon.is_active ? 'status-active' : 'status-inactive';
            const statusText = coupon.is_active ? 'نشط' : 'موقوف';
            const expiryText = coupon.expires_at ? new Date(coupon.expires_at).toLocaleDateString('ar-EG') : 'مفتوح';

            tbody.innerHTML += `
                <tr>
                    <td><strong>${coupon.code}</strong></td>
                    <td>${discountText}</td>
                    <td>${coupon.min_order_amount} ج.م</td>
                    <td>${expiryText}</td>
                    <td>${coupon.used_count || 0}</td>
                    <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                    <td>
                        <button class="btn-secondary" style="padding: 4px 8px; font-size: 0.8rem;" onclick="toggleCouponStatus(${coupon.id}, ${coupon.is_active})">
                            ${coupon.is_active ? 'إيقاف 🛑' : 'تفعيل ✅'}
                        </button>
                        <button class="btn-secondary" style="padding: 4px 8px; font-size: 0.8rem; background-color: #dc3545; color: white;" onclick="deleteCoupon(${coupon.id})">
                            حذف 🗑️
                        </button>
                    </td>
                </tr>
            `;
        });
    } catch (err) {
        console.error("Error loading coupons:", err);
        alert("حدث خطأ في تحميل الكوبونات.");
    }
}

// 2. التحكم في النافذة المنبثقة (Modal)
function openCouponModal() {
    document.getElementById('couponForm').reset();
    document.getElementById('couponId').value = '';
    document.getElementById('couponModal').style.display = 'flex';
}

function closeCouponModal() {
    document.getElementById('couponModal').style.display = 'none';
}

// 3. حفظ الكوبون (إضافة جديد)
async function saveCoupon() {
    const code = document.getElementById('couponCode').value.trim().toUpperCase();
    const type = document.getElementById('discountType').value;
    const value = parseFloat(document.getElementById('discountValue').value);
    const minOrder = parseFloat(document.getElementById('minOrder').value) || 0;
    const expiry = document.getElementById('expiryDate').value;

    if (!code || !value) {
        alert("يرجى إدخال كود الخصم وقيمته.");
        return;
    }

    const couponData = {
        code: code,
        discount_type: type,
        discount_value: value,
        min_order_amount: minOrder,
        expires_at: expiry ? new Date(expiry).toISOString() : null,
        is_active: true
    };

    try {
        const { error } = await window.supabaseClient.from('coupons').insert([couponData]);
        
        if (error) {
            if(error.code === '23505') alert("هذا الكود موجود مسبقاً، يرجى اختيار كود آخر.");
            else throw error;
            return;
        }

        alert("تم حفظ الكوبون بنجاح!");
        closeCouponModal();
        await loadCoupons(); // تحديث الجدول فوراً

    } catch (err) {
        console.error("Error saving coupon:", err);
        alert("حدث خطأ أثناء الحفظ.");
    }
}

// 4. تغيير حالة الكوبون (تفعيل/إيقاف)
async function toggleCouponStatus(id, currentStatus) {
    try {
        const { error } = await window.supabaseClient
            .from('coupons')
            .update({ is_active: !currentStatus })
            .eq('id', id);

        if (error) throw error;
        await loadCoupons();
    } catch (err) {
        console.error("Error toggling status:", err);
    }
}

// 5. حذف كوبون
async function deleteCoupon(id) {
    if (!confirm("هل أنت متأكد من حذف هذا الكوبون نهائياً؟")) return;
    try {
        const { error } = await window.supabaseClient.from('coupons').delete().eq('id', id);
        if (error) throw error;
        await loadCoupons();
    } catch (err) {
        console.error("Error deleting coupon:", err);
    }
}
// === دمج دالة تحميل الإعدادات عند فتح الصفحة ===
document.addEventListener('DOMContentLoaded', async () => {
    await loadCoupons();
    await loadStoreSettings(); // استدعاء دالة جلب الإعدادات
});

// ==========================================
// قسم إعدادات المتجر (الولاء وخصم الطلبات)
// ==========================================

async function loadStoreSettings() {
    try {
        const { data, error } = await window.supabaseClient
            .from('store_settings')
            .select('*')
            .eq('id', 1)
            .single();

        if (error && error.code !== 'PGRST116') throw error; // تجاهل خطأ عدم وجود بيانات مبدئية

        if (data) {
            document.getElementById('set-points-per-egp').value = data.points_per_egp || 10;
            document.getElementById('set-discount-per-10-points').value = data.discount_per_10_points || 1;
            document.getElementById('set-bulk-threshold').value = data.bulk_threshold || 500;
            document.getElementById('set-bulk-percent').value = data.bulk_discount_percent || 10;
        }
    } catch (err) {
        console.error("Error loading store settings:", err);
    }
}

window.saveStoreSettings = async () => {
    const pointsPerEgp = parseFloat(document.getElementById('set-points-per-egp').value);
    const discountPer10 = parseFloat(document.getElementById('set-discount-per-10-points').value);
    const bulkThreshold = parseFloat(document.getElementById('set-bulk-threshold').value);
    const bulkPercent = parseFloat(document.getElementById('set-bulk-percent').value);

    if (isNaN(pointsPerEgp) || isNaN(discountPer10) || isNaN(bulkThreshold) || isNaN(bulkPercent)) {
        alert("يرجى إدخال أرقام صحيحة في جميع خانات الإعدادات.");
        return;
    }

    const payload = {
        id: 1,
        points_per_egp: pointsPerEgp,
        discount_per_10_points: discountPer10,
        bulk_threshold: bulkThreshold,
        bulk_discount_percent: bulkPercent
    };

    try {
        // نستخدم upsert عشان لو الجدول فاضي يعمل insert، ولو فيه بيانات يعمل لها update
        const { error } = await window.supabaseClient
            .from('store_settings')
            .upsert([payload]); 

        if (error) throw error;
        alert("تم حفظ إعدادات الولاء وخصومات الطلبات الكبيرة بنجاح! ✅");
    } catch (err) {
        console.error("Error saving settings:", err);
        alert("حدث خطأ أثناء حفظ الإعدادات.");
    }
};
