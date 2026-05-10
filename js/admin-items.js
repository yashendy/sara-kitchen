// js/admin-items.js

document.addEventListener('DOMContentLoaded', async () => {
    // 1. التحقق من صلاحية الأدمن
    if (sessionStorage.getItem('is_admin') !== 'true') {
        window.location.href = 'admin-login.html';
        return;
    }

    // 2. تحميل المنتجات عند فتح الصفحة
    await loadProducts();

    // 3. معالجة نموذج "إضافة وجبة جديدة"
    document.getElementById('add-product-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const product = {
            name: document.getElementById('p-name').value,
            description: document.getElementById('p-desc').value,
            price: parseFloat(document.getElementById('p-price').value),
            image_url: document.getElementById('p-image').value,
            is_available: true
        };

        const { error } = await window.supabaseClient.from('products').insert([product]);

        if (error) {
            alert('خطأ في الإضافة: ' + error.message);
        } else {
            alert('تمت إضافة الوجبة بنجاح! 🥘');
            hideAddItemForm();
            await loadProducts();
        }
    });

    // 4. معالجة نموذج "تعديل وجبة"
    document.getElementById('edit-product-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-p-id').value;
        const updatedData = {
            name: document.getElementById('edit-p-name').value,
            description: document.getElementById('edit-p-desc').value,
            price: parseFloat(document.getElementById('edit-p-price').value),
            image_url: document.getElementById('edit-p-image').value,
            is_available: document.getElementById('edit-p-available').checked
        };

        const { error } = await window.supabaseClient
            .from('products')
            .update(updatedData)
            .eq('id', id);

        if (error) {
            alert('خطأ في التحديث: ' + error.message);
        } else {
            alert('تم تحديث بيانات الوجبة بنجاح ✅');
            hideEditItemForm();
            await loadProducts();
        }
    });
});

// دالة جلب وعرض المنتجات في الجدول
async function loadProducts() {
    const { data: products, error } = await window.supabaseClient
        .from('products')
        .select('*')
        .order('id', { ascending: false });

    if (error) return;

    const list = document.getElementById('admin-products-list');
    list.innerHTML = '';

    products.forEach(p => {
        list.innerHTML += `
            <tr>
                <td><img src="${p.image_url || 'https://via.placeholder.com/50'}" width="50" height="50" style="border-radius:5px; object-fit:cover;"></td>
                <td><strong>${p.name}</strong></td>
                <td>${window.formatCurrency(p.price)}</td>
                <td>
                    <span class="status-badge ${p.is_available ? 'status-DELIVERED' : 'status-PENDING'}">
                        ${p.is_available ? 'متاح' : 'غير متاح'}
                    </span>
                </td>
                <td>
                    <button onclick="openEditModal(${p.id})" class="btn-primary" style="padding: 5px 12px; font-size: 0.8rem; cursor:pointer;">تعديل</button>
                    <button onclick="deleteProduct(${p.id})" class="btn-remove" style="padding: 5px 12px; font-size: 0.8rem; background:#e74c3c; color:white; border:none; border-radius:5px; cursor:pointer;">حذف</button>
                </td>
            </tr>
        `;
    });
}

// وظائف التحكم في ظهور النوافذ (Modals)
window.showAddItemForm = () => document.getElementById('add-item-modal').style.display = 'flex';
window.hideAddItemForm = () => document.getElementById('add-item-modal').style.display = 'none';

window.openEditModal = async (id) => {
    const { data, error } = await window.supabaseClient
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

    if (data) {
        document.getElementById('edit-p-id').value = data.id;
        document.getElementById('edit-p-name').value = data.name;
        document.getElementById('edit-p-desc').value = data.description;
        document.getElementById('edit-p-price').value = data.price;
        document.getElementById('edit-p-image').value = data.image_url;
        document.getElementById('edit-p-available').checked = data.is_available;
        
        document.getElementById('edit-item-modal').style.display = 'flex';
    }
};

window.hideEditItemForm = () => document.getElementById('edit-item-modal').style.display = 'none';

// دالة حذف منتج
window.deleteProduct = async (id) => {
    if (confirm('هل أنتِ متأكدة من حذف هذه الوجبة نهائياً؟')) {
        const { error } = await window.supabaseClient
            .from('products')
            .delete()
            .eq('id', id);
        
        if (!error) {
            await loadProducts();
        } else {
            alert('خطأ في الحذف: ' + error.message);
        }
    }
};
