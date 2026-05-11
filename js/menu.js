// js/menu.js

document.addEventListener('DOMContentLoaded', async () => {
    await fetchCategories();
    await fetchProducts();

    document.getElementById('menu-search').addEventListener('input', (e) => {
        filterProducts(e.target.value);
    });
});

let allProducts = [];

async function fetchCategories() {
    const { data, error } = await window.supabaseClient.from('categories').select('*');
    if (error) return;

    const categoryList = document.getElementById('category-list');
    data.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'filter-btn';
        btn.textContent = cat.name;
        btn.onclick = () => filterByCategory(cat.id, btn);
        categoryList.appendChild(btn);
    });
}

async function fetchProducts() {
    const { data, error } = await window.supabaseClient
        .from('products')
        .select('*')
        .eq('is_available', true);

    if (error) {
        document.getElementById('products-container').innerHTML = '<p>عذراً، حدث خطأ أثناء تحميل القائمة.</p>';
        return;
    }

    allProducts = data;
    displayProducts(allProducts);
}

function displayProducts(products) {
    const container = document.getElementById('products-container');
    container.innerHTML = '';

    if (products.length === 0) {
        container.innerHTML = '<p>لا توجد وجبات متاحة حالياً.</p>';
        return;
    }

    products.forEach(product => {
        // نمرر كل البيانات لدالة addToCart لكي تظهر في السلة
        const card = `
            <div class="product-card">
                <img src="${product.image_url || 'default-food.png'}" alt="${product.name}" class="product-img">
                <div class="product-info">
                    <h3 class="product-title">${product.name}</h3>
                    <p class="product-desc">${product.description || ''}</p>
                    <div class="product-footer">
                        <span class="product-price">${window.formatCurrency(product.price)}</span>
                        <button class="btn-add-cart" onclick="window.addToCart(${product.id}, '${product.name}', ${product.price}, '${product.image_url}')">
                            أضف للسلة 🛒
                        </button>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML += card;
    });
}

function filterProducts(query) {
    const filtered = allProducts.filter(p => p.name.includes(query) || (p.description && p.description.includes(query)));
    displayProducts(filtered);
}

function filterByCategory(catId, btn) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const filtered = (catId === 'all') ? allProducts : allProducts.filter(p => p.category_id === catId);
    displayProducts(filtered);
}

// تم حذف دالة addToCart المكررة من هنا للاعتماد على الموجودة في app.js
