// js/menu.js

document.addEventListener('DOMContentLoaded', async () => {
    await fetchCategories();
    await fetchProducts();

    const searchInput = document.getElementById('menu-search');
    if(searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterProducts(e.target.value);
        });
    }
});

let allProducts = [];

// 1. جلب التصنيفات
async function fetchCategories() {
    const { data, error } = await window.supabaseClient.from('categories').select('*');
    if (error) return;

    const categoryList = document.getElementById('category-list');
    if(!categoryList) return;
    
    data.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'filter-btn';
        btn.textContent = cat.name;
        btn.onclick = () => filterByCategory(cat.id, btn);
        categoryList.appendChild(btn);
    });
}

// 2. جلب الأصناف
async function fetchProducts() {
    const { data, error } = await window.supabaseClient
        .from('products')
        .select('*')
        .eq('is_available', true); // بنجيب المتاح للطلب بس

    if (error) {
        const container = document.getElementById('products-container');
        if(container) container.innerHTML = '<p style="text-align:center;">عذراً، حدث خطأ أثناء تحميل القائمة.</p>';
        return;
    }

    allProducts = data || [];
    displayProducts(allProducts);
}

// 3. دالة العرض الذكية (التي تفرق بين الصنف العادي والمتعدد الأحجام)
function displayProducts(products) {
    const container = document.getElementById('products-container');
    if(!container) return;
    container.innerHTML = '';

    if (products.length === 0) {
        container.innerHTML = '<p style="text-align:center; width:100%;">لا توجد وجبات متاحة في هذا التصنيف حالياً.</p>';
        return;
    }

    products.forEach(product => {
        let priceSection = '';
        let actionSection = '';
        
        // التحقق مما إذا كان الصنف يمتلك أحجام مسجلة (Variants)
        const hasVariants = product.variants && Array.isArray(product.variants) && product.variants.length > 0;

        if (hasVariants) {
            // لو ليه أحجام: بنعمل قائمة منسدلة
            const optionsHtml = product.variants.map((v, index) => {
                return `<option value="${index}">${v.name} - ${v.price} ج.م</option>`;
            }).join('');

            priceSection = `
                <div style="margin-top: 10px; margin-bottom: 10px;">
                    <select id="variant-select-${product.id}" style="width: 100%; padding: 8px; border-radius: 5px; border: 1px solid #cbd5e1; font-family: inherit; font-size: 0.9rem; background-color: #f8fafc;">
                        ${optionsHtml}
                    </select>
                </div>
            `;
            
            // زرار الإضافة بيشغل دالة جديدة مخصصة للأحجام
            actionSection = `
                <button class="btn-add-cart" style="width: 100%; justify-content: center;" onclick="addVariantToCart(${product.id}, '${product.name.replace(/'/g, "\\'")}', '${product.image_url || 'default-food.png'}')">
                    أضف للسلة 🛒
                </button>
            `;
        } else {
            // لو صنف عادي (سعر ثابت)
            let formattedPrice = window.formatCurrency ? window.formatCurrency(product.price) : `${product.price} ج.م`;
            priceSection = `<span class="product-price">${formattedPrice}</span>`;
            actionSection = `
                <button class="btn-add-cart" onclick="window.addToCart(${product.id}, '${product.name.replace(/'/g, "\\'")}', ${product.price}, '${product.image_url || 'default-food.png'}')">
                    أضف للسلة 🛒
                </button>
            `;
        }

        // إظهار السعرات والكلمات الدلالية لو المطبخ سجلها
        let tagsHtml = '';
        if (product.tags) {
            tagsHtml += `<span style="font-size:0.75rem; color:#10b981; background:#ecfdf5; padding:3px 6px; border-radius:12px; margin-left:5px; border:1px solid #a7f3d0;">🍃 ${product.tags}</span>`;
        }
        if (product.calories) {
            tagsHtml += `<span style="font-size:0.75rem; color:#ef4444; background:#fef2f2; padding:3px 6px; border-radius:12px; border:1px solid #fecaca;">🔥 ${product.calories} كالوري</span>`;
        }
        
        let offerHtml = product.in_offer ? `<div style="position:absolute; top:10px; right:10px; background:#f59e0b; color:white; font-size:0.8rem; padding:3px 8px; border-radius:12px; font-weight:bold;">عروض سارة</div>` : '';

        const card = `
            <div class="product-card" style="position:relative;">
                ${offerHtml}
                <img src="${product.image_url || 'default-food.png'}" alt="${product.name}" class="product-img" style="object-fit: cover;">
                <div class="product-info">
                    <h3 class="product-title" style="margin-bottom: 8px;">${product.name}</h3>
                    <div style="margin-bottom: 10px;">${tagsHtml}</div>
                    
                    ${hasVariants ? priceSection : ''}

                    <div class="product-footer" style="${hasVariants ? 'display:block; margin-top:10px;' : ''}">
                        ${hasVariants ? '' : priceSection}
                        ${actionSection}
                    </div>
                </div>
            </div>
        `;
        container.innerHTML += card;
    });
}

// 4. دالة مخصصة لإضافة الأحجام للسلة
window.addVariantToCart = (productId, baseName, imageUrl) => {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;

    // بنقرأ الحجم اللي العميل اختاره من القائمة
    const selectEl = document.getElementById(`variant-select-${productId}`);
    const selectedIndex = selectEl.value;
    const selectedVariant = product.variants[selectedIndex];

    // دمج اسم الصنف الأساسي مع اسم الحجم (مثال: محشي كرنب (حلة وسط))
    const finalName = `${baseName} (${selectedVariant.name})`;
    const finalPrice = selectedVariant.price;
    
    // نعمل ID فريد للحجم ده عشان لو طلب كذا حجم مختلفين ميخشوش في بعض في السلة
    const compositeId = `${productId}-${selectedIndex}`;

    // الاعتماد على الدالة العالمية في app.js لو موجودة
    if (typeof window.addToCart === 'function') {
        window.addToCart(compositeId, finalName, finalPrice, imageUrl);
    } else {
        // حماية إضافية لو الدالة مش موجودة
        let cart = JSON.parse(localStorage.getItem('cart')) || [];
        const existingItem = cart.find(item => item.id === compositeId || item.name === finalName);
        
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.push({ id: compositeId, name: finalName, price: finalPrice, image: imageUrl, quantity: 1 });
        }
        
        localStorage.setItem('cart', JSON.stringify(cart));
        alert('تمت الإضافة للسلة بنجاح! 🛒');
        if (typeof updateCartCount === 'function') updateCartCount();
    }
};

// 5. دوال الفلترة والبحث
function filterProducts(query) {
    if(!query) {
        displayProducts(allProducts);
        return;
    }
    const filtered = allProducts.filter(p => p.name.includes(query) || (p.description && p.description.includes(query)));
    displayProducts(filtered);
}

function filterByCategory(catId, btn) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const filtered = (catId === 'all') ? allProducts : allProducts.filter(p => p.category_id === catId);
    displayProducts(filtered);
}
