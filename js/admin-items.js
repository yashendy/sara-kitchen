// js/admin-items.js

let allCategories = [];
let currentEditingItemId = null;
let selectedImageFile = null;

document.addEventListener("DOMContentLoaded", async () => {
    // تحميل التصنيفات والأصناف أول ما الصفحة تفتح
    await loadCategories();
    await loadItems();

    // ربط أزرار النوافذ المنبثقة
    document.getElementById('btn-add-item').addEventListener('click', openAddItemModal);
    document.getElementById('closeItemModalX').addEventListener('click', closeItemModal);
    document.getElementById('cancelItemModalBtn').addEventListener('click', closeItemModal);
    document.getElementById('saveItemBtn').addEventListener('click', saveItem);

    document.getElementById('btn-manage-categories').addEventListener('click', openCategoryModal);
    document.getElementById('closeCategoryModalX').addEventListener('click', closeCategoryModal);
    document.getElementById('cancelCategoryModalBtn').addEventListener('click', closeCategoryModal);
    document.getElementById('saveCategoryBtn').addEventListener('click', saveCategory);

    // ربط رفع الصورة
    const imageBtn = document.getElementById('itemImageBtn');
    const imageInput = document.getElementById('itemImageInput');
    if (imageBtn && imageInput) {
        imageBtn.addEventListener('click', () => imageInput.click());
        imageInput.addEventListener('change', handleImageSelect);
    }
});

// ==========================================
// 1. إدارة التصنيفات
// ==========================================
async function loadCategories() {
    try {
        const { data, error } = await window.supabaseClient.from('categories').select('*').order('name');
        if (error) throw error;
        allCategories = data;
        
        const filterSelect = document.getElementById('item-category-filter');
        const formSelect = document.getElementById('itemCategory');
        
        filterSelect.innerHTML = '<option value="ALL">كل التصنيفات</option>';
        formSelect.innerHTML = '<option value="">اختاري التصنيف</option>';
        
        data.forEach(cat => {
            filterSelect.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
            formSelect.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
        });
    } catch (err) {
        console.error("خطأ في تحميل التصنيفات", err);
    }
}

function openCategoryModal() {
    document.getElementById('categoryModal').hidden = false;
    renderCategoryList();
}

function closeCategoryModal() {
    document.getElementById('categoryModal').hidden = true;
}

function renderCategoryList() {
    const container = document.getElementById('categoryListContainer');
    container.innerHTML = allCategories.map(c => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; border-bottom:1px solid #eee; background:#f8fafc; margin-bottom:5px; border-radius:5px;">
            <strong style="color:#334155;">${c.name}</strong>
            <button onclick="deleteCategory(${c.id})" style="color:white; background:#ef4444; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">حذف 🗑️</button>
        </div>
    `).join('');
}

async function saveCategory() {
    const name = document.getElementById('categoryName').value.trim();
    if(!name) return alert("اكتبي اسم التصنيف الأول");
    try {
        await window.supabaseClient.from('categories').insert([{name}]);
        document.getElementById('categoryName').value = '';
        await loadCategories();
        renderCategoryList();
    } catch(err) { console.error(err); }
}

window.deleteCategory = async (id) => {
    if(!confirm("هل متأكدة من حذف التصنيف؟")) return;
    await window.supabaseClient.from('categories').delete().eq('id', id);
    await loadCategories();
    renderCategoryList();
}

// ==========================================
// 2. إدارة الأحجام (Variants)
// ==========================================
window.addVariantRow = (name = '', price = '') => {
    const container = document.getElementById('variants-container');
    const row = document.createElement('div');
    row.className = 'variant-row';
    row.style.display = 'flex';
    row.style.gap = '10px';
    row.style.marginBottom = '10px';
    row.innerHTML = `
        <input type="text" placeholder="اسم الحجم (مثال: طبق عائلي)" value="${name}" class="var-name" style="flex:2; padding: 8px; border: 1px solid #cbd5e1; border-radius: 5px; font-family: inherit;">
        <input type="number" placeholder="السعر" value="${price}" class="var-price" style="flex:1; padding: 8px; border: 1px solid #cbd5e1; border-radius: 5px; font-family: inherit;">
        <button type="button" onclick="this.parentElement.remove()" style="background: #ef4444; color: white; border: none; padding: 8px 12px; border-radius: 5px; cursor: pointer;">X</button>
    `;
    container.appendChild(row);
};

window.getVariantsData = () => {
    const rows = document.querySelectorAll('.variant-row');
    let variants = [];
    rows.forEach(row => {
        const vName = row.querySelector('.var-name').value.trim();
        const vPrice = parseFloat(row.querySelector('.var-price').value);
        if (vName && !isNaN(vPrice)) {
            variants.push({ name: vName, price: vPrice });
        }
    });
    return variants;
};

// ==========================================
// 3. إدارة الأصناف
// ==========================================
async function loadItems() {
    const container = document.getElementById('admin-items-container');
    container.innerHTML = '<p class="admin-orders-placeholder">جاري تحميل الأصناف...</p>';
    try {
        const { data, error } = await window.supabaseClient
            .from('products')
            .select('*, categories(name)')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if(data.length === 0) {
            container.innerHTML = '<p style="text-align:center; padding:20px;">لا توجد أصناف، أضيفي صنفك الأول! 🍲</p>';
            return;
        }

        let html = '<table class="admin-table"><thead><tr><th>صورة</th><th>الاسم</th><th>السعر / الأحجام</th><th>التصنيف</th><th>الحالة</th><th>إجراءات</th></tr></thead><tbody>';
        
        data.forEach(item => {
            let priceDisplay = `<strong>${item.price} ج.م</strong>`;
            
            // لو في أحجام، نعرض عددها كمعلومة
            if (item.variants && item.variants.length > 0) {
                priceDisplay = `<span style="color:#d97706; font-weight:bold; font-size:0.9rem;">له ${item.variants.length} أحجام</span>`;
            }

            html += `
                <tr>
                    <td><img src="${item.image_url || 'default-food.png'}" style="width:50px; height:50px; border-radius:8px; object-fit:cover; border:1px solid #eee;"></td>
                    <td><strong>${item.name}</strong></td>
                    <td>${priceDisplay}</td>
                    <td><span style="background:#e2e8f0; padding:3px 8px; border-radius:12px; font-size:0.8rem;">${item.categories ? item.categories.name : 'بدون'}</span></td>
                    <td>
                        ${item.is_available ? '<span class="badge-tags">متاح ✅</span>' : '<span class="badge-calories">غير متاح ❌</span>'}
                        ${item.in_offer ? '<span class="badge-offer">في العرض</span>' : ''}
                    </td>
                    <td>
                        <button class="btn-primary" style="padding:5px 10px; font-size:0.8rem;" onclick='editItem(${JSON.stringify(item).replace(/'/g, "&#39;")})'>تعديل ✏️</button>
                        <button class="btn-secondary" style="background:#ef4444; color:white; padding:5px 10px; border:none; font-size:0.8rem;" onclick="deleteItem(${item.id})">حذف 🗑️</button>
                    </td>
                </tr>
            `;
        });
        html += '</tbody></table>';
        container.innerHTML = html;
    } catch (err) {
        console.error("خطأ في تحميل الأصناف", err);
    }
}

function openAddItemModal() {
    currentEditingItemId = null;
    document.getElementById('itemForm').reset();
    document.getElementById('itemModalTitle').innerText = 'إضافة صنف جديد';
    document.getElementById('variants-container').innerHTML = ''; // تفريغ الأحجام
    document.getElementById('itemImagePreview').hidden = true;
    document.getElementById('itemImageFileName').innerText = 'لم يتم اختيار صورة';
    selectedImageFile = null;
    document.getElementById('itemModal').hidden = false;
}

window.editItem = (item) => {
    currentEditingItemId = item.id;
    document.getElementById('itemModalTitle').innerText = 'تعديل الصنف';
    
    document.getElementById('itemName').value = item.name;
    document.getElementById('itemPrice').value = item.price;
    document.getElementById('itemCategory').value = item.category_id;
    document.getElementById('itemCalories').value = item.calories || '';
    document.getElementById('itemTags').value = item.tags || '';
    document.getElementById('itemInstant').checked = item.is_instant;
    document.getElementById('itemInOffer').checked = item.in_offer;
    document.getElementById('itemAvailable').checked = item.is_available;
    document.getElementById('itemImageUrl').value = item.image_url || '';
    
    // تحميل الأحجام إن وجدت
    const varContainer = document.getElementById('variants-container');
    varContainer.innerHTML = '';
    if (item.variants && Array.isArray(item.variants)) {
        item.variants.forEach(v => addVariantRow(v.name, v.price));
    }

    if (item.image_url) {
        document.getElementById('itemImagePreview').hidden = false;
        document.getElementById('itemImagePreview').querySelector('img').src = item.image_url;
    } else {
        document.getElementById('itemImagePreview').hidden = true;
    }

    document.getElementById('itemModal').hidden = false;
};

function closeItemModal() {
    document.getElementById('itemModal').hidden = true;
}

function handleImageSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    selectedImageFile = file;
    document.getElementById('itemImageFileName').innerText = file.name;
}

// الدالة الأهم: حفظ الصنف في قاعدة البيانات
async function saveItem(e) {
    e.preventDefault();
    const btn = document.getElementById('saveItemBtn');
    btn.innerText = 'جاري الحفظ... ⏳';
    btn.disabled = true;

    try {
        let finalImageUrl = document.getElementById('itemImageUrl').value;

        // رفع الصورة لو اختار ملف
        if (selectedImageFile) {
            const fileExt = selectedImageFile.name.split('.').pop();
            const fileName = `${Date.now()}.${fileExt}`;
            
            const { error: uploadError } = await window.supabaseClient.storage
                .from('product-images')
                .upload(fileName, selectedImageFile);
                
            if (uploadError) throw uploadError;

            // جلب الرابط العام للصورة بعد الرفع
            const { data } = window.supabaseClient.storage
                .from('product-images')
                .getPublicUrl(fileName);
                
            finalImageUrl = data.publicUrl;
        }

        // تجميع الأحجام
        const itemVariants = getVariantsData();

        // تجهيز البيانات للحفظ
        const payload = {
            name: document.getElementById('itemName').value,
            price: parseFloat(document.getElementById('itemPrice').value) || 0,
            category_id: document.getElementById('itemCategory').value,
            calories: parseInt(document.getElementById('itemCalories').value) || null,
            tags: document.getElementById('itemTags').value,
            is_instant: document.getElementById('itemInstant').checked,
            in_offer: document.getElementById('itemInOffer').checked,
            is_available: document.getElementById('itemAvailable').checked,
            image_url: finalImageUrl,
            variants: itemVariants // 👈 السحر هنا، حفظنا الأحجام كـ JSON
        };

        if (currentEditingItemId) {
            const { error } = await window.supabaseClient.from('products').update(payload).eq('id', currentEditingItemId);
            if (error) throw error;
        } else {
            const { error } = await window.supabaseClient.from('products').insert([payload]);
            if (error) throw error;
        }

        closeItemModal();
        await loadItems();
        alert('تم حفظ الصنف بنجاح! ✅');
    } catch (err) {
        console.error("Save Error:", err);
        alert('حدث خطأ أثناء الحفظ');
    } finally {
        btn.innerText = 'حفظ الصنف';
        btn.disabled = false;
        selectedImageFile = null;
        document.getElementById('itemImageFileName').innerText = 'لم يتم اختيار صورة';
    }
}

window.deleteItem = async (id) => {
    if (!confirm('هل أنت متأكد من حذف هذا الصنف نهائياً؟')) return;
    try {
        await window.supabaseClient.from('products').delete().eq('id', id);
        await loadItems();
    } catch(err) {
        alert("حدث خطأ أثناء الحذف");
    }
}
