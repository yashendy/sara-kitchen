// js/index.js

document.addEventListener('DOMContentLoaded', async () => {
    await loadStorefrontData();
});

// دالة سحرية لفصل الإيموجي عن النص
function parseCategoryName(fullName) {
    // كود بيبحث عن أي إيموجي في النص
    const emojiRegex = /\p{Emoji_Presentation}/gu;
    const match = fullName.match(emojiRegex);
    
    let emoji = '🍽️'; // الإيموجي الافتراضي لو نضيتي تكتبي إيموجي
    let text = fullName;

    if (match) {
        emoji = match[0]; // بياخد أول إيموجي يلاقيه
        text = fullName.replace(emoji, '').trim(); // بيمسح الإيموجي من الاسم عشان يكتبه تحت صافي
    }
    return { emoji, text };
}

async function loadStorefrontData() {
    try {
        // 1. جلب التصنيفات
        const { data: categories, error: catError } = await window.supabaseClient.from('categories').select('*');

        if (!catError && categories) {
            const catContainer = document.getElementById('categories-carousel');
            catContainer.innerHTML = '';
            
            // إضافة زر "الكل"
            catContainer.innerHTML += `
                <a href="menu.html" class="cat-mini-card">
                    <div class="cat-icon-wrapper" style="background: var(--primary); color: white; font-size: 2.2rem; border: none;">
                        🍽️
                    </div>
                    <span>الكل</span>
                </a>
            `;
            
            categories.forEach(cat => {
                // استخدام الدالة السحرية لفصل الإيموجي عن النص
                const parsed = parseCategoryName(cat.name);
                
                catContainer.innerHTML += `
                    <a href="menu.html?cat=${cat.id}" class="cat-mini-card">
                        <div class="cat-icon-wrapper" style="font-size: 2.2rem; background: #f8fafc;">
                            ${parsed.emoji}
                        </div>
                        <span>${parsed.text}</span>
                    </a>
                `;
            });
        }

        // 2. جلب الأصناف الفورية
        const { data: instantItems, error: itemsError } = await window.supabaseClient
            .from('products')
            .select('*')
            .eq('is_instant', true)
            .eq('is_available', true)
            .limit(10); 

        if (!itemsError && instantItems) {
            const itemsContainer = document.getElementById('instant-items-carousel');
            itemsContainer.innerHTML = '';
            
            if (instantItems.length === 0) {
                itemsContainer.innerHTML = '<p style="color:#64748b; padding:20px;">لا توجد أصناف فورية حالياً، تصفحي المنيو للطلب.</p>';
            } else {
                instantItems.forEach(item => {
                    let itemPrice = item.price;
                    let hasVariants = item.variants && item.variants.length > 0;
                    let priceDisplay = hasVariants ? '<span style="font-size:0.8rem;">تبدأ من</span> ' + (item.variants[0].price) + ' ج' : `${itemPrice} ج`;

                    let btnHtml = hasVariants 
                        ? `<button class="btn-add-mini btn-menu-mini" onclick="window.location.href='menu.html?highlight=${item.id}'">اختر الحجم ⚙️</button>`
                        : `<button class="btn-add-mini" onclick="window.addToCart(${item.id}, '${item.name}', ${itemPrice}, '${item.image_url}')">أضف للسلة 🛒</button>`;

                    itemsContainer.innerHTML += `
                        <div class="product-mini-card">
                            <img src="${item.image_url || 'logo-sara-kitchen.png'}" alt="${item.name}">
                            <div class="pmc-body">
                                <h4 class="pmc-title">${item.name}</h4>
                                <div class="pmc-price">${priceDisplay}</div>
                                ${btnHtml}
                            </div>
                        </div>
                    `;
                });
            }
        }

    } catch (err) {
        console.error("Error loading storefront:", err);
    }
}

// 3. البحث السريع
window.handleQuickSearch = (e) => {
    if (e.key === 'Enter') {
        const query = e.target.value.trim();
        if (query) {
            window.location.href = `menu.html?search=${encodeURIComponent(query)}`;
        }
    }
};
