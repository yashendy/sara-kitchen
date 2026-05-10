// js/menu.js

document.addEventListener('DOMContentLoaded', async () => {
    // جلب المنتجات عند تحميل الصفحة
    await fetchCategories();
    await fetchProducts();

    // إعداد البحث
    document.getElementById('menu-search').addEventListener('input', (e) => {
        filterProducts(e.target.value);
    });
});

let allProducts = [];

// 1. جلب التصنيفات من جدول categories
async function fetchCategories() {
    const { data, error } = await window.supabaseClient
        .from('categories')
        .select('*');

    if (error) {
        console.error('Error fetching categories:', error);
        return;
    }

    const categoryList = document.getElementById('category-list');
    data.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'filter-btn';
        btn.textContent = cat.name;
        btn.onclick = () => filterByCategory(cat.id, btn);
        categoryList.appendChild(btn);
    });
}

// 2. جلب المنتجات من جدول products
async function fetchProducts() {
    const { data, error } = await window.supabaseClient
        .from('products')
        .select('*')
        .eq('is_available', true); // جلب المتاح فقط

    if (error) {
        console.error('Error fetching products:', error);
        document.getElementById('products-container').innerHTML = '<p>عذراً، حدث خطأ أثناء تحميل القائمة.</p>';
        return;
    }

    allProducts = data;
    displayProducts(allProducts);
}

// 3. عرض المنتجات في الصفحة
function displayProducts(products) {
    const container = document.getElementById('products-container');
    container.innerHTML = '';

    if (products.length === 0) {
        container.innerHTML = '<p>لا توجد وجبات متاحة حالياً بهذا التصنيف.</p>';
        return;
    }

    products.forEach(product => {
        const card = `
            <div class="product-card">
                <img src="${product.image_url || 'https://via.placeholder.com/300x200?text=Sara+Kitchen'}" alt="${product.name}" class="product-img">
                <div class="product-info">
                    <h3 class="product-title">${product.name}</h3>
                    <p class="product-desc">${product.description || ''}</p>
                    <div class="product-footer">
                        <span class="product-price">${window.formatCurrency(product.price)}</span>
                        <button class="btn-add-cart" onclick="addToCart(${product.id})">أضف للسلة</button>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML += card;
    });
}

// 4. الفلترة حسب البحث
function filterProducts(query) {
    const filtered = allProducts.filter(p => p.name.includes(query) || (p.description && p.description.includes(query)));
    displayProducts(filtered);
}

// 5. الفلترة حسب القسم
function filterByCategory(catId, btn) {
    // تحديث شكل الأزرار
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const filtered = allProducts.filter(p => p.category_id === catId);
    displayProducts(filtered);
}

// وظيفة مؤقتة للسلة (سنطورها في صفحة السلة)
window.addToCart = (productId) => {
    window.showAlert('تم إضافة الوجبة للسلة بنجاح! 🥘');
    // هنا سنضيف لاحقاً منطق الـ LocalStorage للسلة
};
