// js/admin-items.js

document.addEventListener('DOMContentLoaded', async () => {
    if (sessionStorage.getItem('is_admin') !== 'true') {
        window.location.href = 'admin-login.html';
        return;
    }
    await loadProducts();

    // معالجة إضافة منتج جديد
    document.getElementById('add-product-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const product = {
            name: document.getElementById('p-name').value,
            description: document.getElementById('p-desc').value,
            price: parseFloat(document.getElementById('p-price').value),
            image_url: document.getElementById('p-image').value,
            is_available: true
        };

        const { error } = await window.supabaseClient
            .from('products')
            .insert([product]);

        if (error) {
            alert('خطأ في الإضافة: ' + error.message);
        } else {
            alert('تمت إضافة الوجبة للمنيو بنجاح! 🥘');
            hideAddItemForm();
            loadProducts();
        }
    });
});

async function loadProducts() {
    const { data, error } = await window.supabaseClient
        .from('products')
        .select('*')
        .order('id', { ascending: false });

    if (error) return;

    const list = document.getElementById('admin-products-list');
    list.innerHTML = '';

    data.forEach(p => {
        list.innerHTML += `
            <tr>
                <td><img src="${p.image_url || 'https://via.placeholder.com/50'}" width="50" style="border-radius:5px;"></td>
                <td>${p.name}</td>
                <td>${window.formatCurrency(p.price)}</td>
                <td>${p.is_available ? '✅ متاح' : '❌ غير متاح'}</td>
                <td>
                    <button onclick="deleteProduct(${p.id})" class="btn-remove">حذف</button>
                </td>
            </tr>
        `;
    });
}

window.deleteProduct = async (id) => {
    if (confirm('هل أنت متأكد من حذف هذه الوجبة؟')) {
        const { error } = await window.supabaseClient
            .from('products')
            .delete()
            .eq('id', id);
        
        if (!error) loadProducts();
    }
};

window.showAddItemForm = () => document.getElementById('add-item-modal').style.display = 'flex';
window.hideAddItemForm = () => document.getElementById('add-item-modal').style.display = 'none';
