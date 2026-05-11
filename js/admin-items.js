// js/admin-items.js
// إدارة الأصناف - مطبخ سارة

const itemsState = {
  products: [],
  categories: [],
  filters: {
    search: "",
    category: "ALL",
    availability: "ALL", 
    instant: "ALL",
  },
};

let currentEditedItem = null;
let currentImageFile = null; 
let currentImageUrl = null; 
let currentEditedCategoryId = null;

document.addEventListener("DOMContentLoaded", () => {
  if (!window.APP_CONFIG) return;

  const { url, anonKey } = window.APP_CONFIG.supabase;
  window.supabaseClient = supabase.createClient(url, anonKey);

  setupItemsFiltersUI();
  setupItemModalUI();
  setupCategoryModalUI();
  loadCategoriesAndProducts();
});

// ================================
// 1) تحميل التصنيفات والأصناف
// ================================
async function loadCategoriesAndProducts() {
  const container = document.getElementById("admin-items-container");
  if (container) container.innerHTML = '<p class="admin-orders-placeholder">جارٍ تحميل الأصناف...</p>';

  try {
    const [catRes, prodRes] = await Promise.all([
      window.supabaseClient.from("categories").select("id, name").order("name", { ascending: true }),
      // تم تعديل updated_at إلى created_at ليتوافق مع قاعدة البيانات
      window.supabaseClient.from("products")
        .select("id, name, price, is_instant, is_available, category_id, image_url, created_at, calories, in_offer, tags")
        .order("created_at", { ascending: false }),
    ]);

    itemsState.categories = catRes.data || [];
    itemsState.products = prodRes.data || [];

    populateCategoryFilters();
    renderItemsTable(applyItemFilters());
  } catch (err) {
    console.error(err);
  }
}

async function reloadCategoriesOnly() {
  const { data } = await window.supabaseClient.from("categories").select("id, name").order("name", { ascending: true });
  itemsState.categories = data || [];
  populateCategoryFilters();
  renderItemsTable(applyItemFilters());
  renderCategoryList();
}

function populateCategoryFilters() {
  const filterSelect = document.getElementById("item-category-filter");
  const modalSelect = document.getElementById("itemCategory");
  if (!filterSelect || !modalSelect) return;

  filterSelect.innerHTML = '<option value="ALL">كل التصنيفات</option>';
  modalSelect.innerHTML = '<option value="">اختاري التصنيف</option>';

  itemsState.categories.forEach((c) => {
    filterSelect.innerHTML += `<option value="${c.id}">${c.name}</option>`;
    modalSelect.innerHTML += `<option value="${c.id}">${c.name}</option>`;
  });
}

// ================================
// 2) الفلاتر والبحث
// ================================
function setupItemsFiltersUI() {
  document.getElementById("item-search-input")?.addEventListener("input", (e) => { itemsState.filters.search = e.target.value.trim(); renderItemsTable(applyItemFilters()); });
  document.getElementById("item-category-filter")?.addEventListener("change", (e) => { itemsState.filters.category = e.target.value || "ALL"; renderItemsTable(applyItemFilters()); });
  document.getElementById("item-availability-filter")?.addEventListener("change", (e) => { itemsState.filters.availability = e.target.value || "ALL"; renderItemsTable(applyItemFilters()); });
  
  document.getElementById("btn-add-item")?.addEventListener("click", openItemModalForCreate);
  document.getElementById("btn-manage-categories")?.addEventListener("click", openCategoryModal);

  document.getElementById("admin-items-container")?.addEventListener("click", (e) => {
    const editBtn = e.target.closest('[data-action="edit-item"]');
    const toggleBtn = e.target.closest('[data-action="toggle-availability"]');
    if (editBtn) openItemModalForEdit(editBtn.dataset.itemId);
    else if (toggleBtn) toggleItemAvailability(toggleBtn.dataset.itemId);
  });
}

function applyItemFilters() {
  let result = [...itemsState.products];
  if (itemsState.filters.search) result = result.filter(p => (p.name || "").toLowerCase().includes(itemsState.filters.search.toLowerCase()));
  if (itemsState.filters.category !== "ALL") result = result.filter(p => String(p.category_id) === itemsState.filters.category);
  if (itemsState.filters.availability === "AVAILABLE") result = result.filter(p => p.is_available === true);
  if (itemsState.filters.availability === "UNAVAILABLE") result = result.filter(p => p.is_available === false);
  return result;
}

// ================================
// 3) عرض جدول الأصناف
// ================================
function renderItemsTable(items) {
  const container = document.getElementById("admin-items-container");
  if (!items.length) { container.innerHTML = '<p class="admin-orders-placeholder">لا توجد أصناف مطابقة.</p>'; return; }

  const rows = items.map((p) => {
    const catName = itemsState.categories.find(c => String(c.id) === String(p.category_id))?.name || "-";
    const instantText = p.is_instant ? "⚡ فوري" : "عادي";
    const availText = p.is_available ? "✅ متاح" : "❌ موقوف";
    const imageCell = p.image_url ? `<img src="${p.image_url}" width="40" height="40" style="border-radius:5px; object-fit:cover;">` : "-";
    
    // الأيقونات الجديدة (العرض، السعرات، الكلمات)
    const offerBadge = p.in_offer ? `<span class="badge-offer">🏷️ في العرض</span>` : '';
    const caloriesBadge = p.calories ? `<span class="badge-calories">🔥 ${p.calories} كالوري</span>` : '';
    const tagsBadge = p.tags ? `<span class="badge-tags">🍃 ${p.tags}</span>` : '';

    return `
      <tr>
        <td>
            <strong>${p.name}</strong> ${offerBadge}
            ${caloriesBadge}
            ${tagsBadge}
        </td>
        <td>${catName}</td>
        <td>${Number(p.price || 0).toFixed(2)} ج.م</td>
        <td>${instantText}</td>
        <td>${availText}</td>
        <td>${imageCell}</td>
        <td>
          <button class="btn-secondary" data-action="edit-item" data-item-id="${p.id}">تعديل</button>
          <button class="btn-secondary" data-action="toggle-availability" data-item-id="${p.id}">
            ${p.is_available ? "إيقاف" : "تفعيل"}
          </button>
        </td>
      </tr>
    `;
  }).join("");

  container.innerHTML = `<table class="admin-table"><thead><tr><th>الصنف والتفاصيل</th><th>التصنيف</th><th>السعر</th><th>التحضير</th><th>الحالة</th><th>صورة</th><th>إجراء</th></tr></thead><tbody>${rows}</tbody></table>`;
}

// ================================
// 4) مودال الأصناف (إضافة/تعديل)
// ================================
function setupItemModalUI() {
  const modal = document.getElementById("itemModal");
  document.getElementById("closeItemModalX")?.addEventListener("click", closeItemModal);
  document.getElementById("cancelItemModalBtn")?.addEventListener("click", closeItemModal);
  document.getElementById("saveItemBtn")?.addEventListener("click", saveItemForm);
  
  const imageInput = document.getElementById("itemImageInput");
  document.getElementById("itemImageBtn")?.addEventListener("click", () => imageInput.click());
  
  imageInput?.addEventListener("change", (e) => {
    const file = e.target.files[0];
    currentImageFile = file || null;
    const fileNameSpan = document.getElementById("itemImageFileName");
    if (fileNameSpan) fileNameSpan.textContent = file ? file.name : "لم يتم اختيار صورة";
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        document.getElementById("itemImagePreview").querySelector("img").src = ev.target.result;
        document.getElementById("itemImagePreview").hidden = false;
      };
      reader.readAsDataURL(file);
    }
  });
}

function closeItemModal() {
  document.getElementById("itemModal").hidden = true;
  document.getElementById("itemForm").reset();
  document.getElementById("itemImagePreview").hidden = true;
  const fileNameSpan = document.getElementById("itemImageFileName");
  if (fileNameSpan) fileNameSpan.textContent = "لم يتم اختيار صورة";
  currentEditedItem = null; currentImageFile = null; currentImageUrl = null;
}

function openItemModalForCreate() {
  closeItemModal();
  document.getElementById("itemModalTitle").textContent = "إضافة صنف جديد";
  document.getElementById("itemModal").hidden = false;
}

// 1. تعبئة البيانات عند فتح التعديل (محدثة لتقرأ رابط الصورة)
function openItemModalForEdit(itemId) {
  const item = itemsState.products.find(p => String(p.id) === String(itemId));
  if (!item) return;

  currentEditedItem = item;
  document.getElementById("itemModalTitle").textContent = "تعديل صنف";
  
  document.getElementById("itemName").value = item.name || "";
  document.getElementById("itemCategory").value = item.category_id || "";
  document.getElementById("itemPrice").value = item.price || "";
  document.getElementById("itemInstant").checked = !!item.is_instant;
  document.getElementById("itemAvailable").checked = !!item.is_available;
  
  // تعبئة البيانات الجديدة
  document.getElementById("itemCalories").value = item.calories || "";
  document.getElementById("itemInOffer").checked = !!item.in_offer;
  document.getElementById("itemTags").value = item.tags || "";

  // تعبئة خانة رابط الصورة
  const imgUrlInput = document.getElementById("itemImageUrl");
  if (imgUrlInput) imgUrlInput.value = item.image_url || "";

  if (item.image_url) {
    currentImageUrl = item.image_url;
    document.getElementById("itemImagePreview").querySelector("img").src = item.image_url;
    document.getElementById("itemImagePreview").hidden = false;
    const fileNameSpan = document.getElementById("itemImageFileName");
    if (fileNameSpan) fileNameSpan.textContent = "يوجد صورة مسجلة";
  } else {
    document.getElementById("itemImagePreview").hidden = true;
  }

  document.getElementById("itemModal").hidden = false;
}

// 2. دالة رفع الصورة (كما هي)
async function uploadItemImage(file, productId) {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const filePath = `${productId}/${Date.now()}.${ext}`;
  const { error } = await window.supabaseClient.storage.from("product-images").upload(filePath, file, { upsert: true });
  if (error) throw error;
  return window.supabaseClient.storage.from("product-images").getPublicUrl(filePath).data.publicUrl;
}

// 3. دالة الحفظ المحدثة (تدمج بين الرابط والرفع من الجهاز)
async function saveItemForm(e) {
  e.preventDefault();
  const name = document.getElementById("itemName").value.trim();
  const category_id = document.getElementById("itemCategory").value;
  const price = Number(document.getElementById("itemPrice").value);
  
  if (!name || !category_id || isNaN(price)) return alert("يرجى إكمال البيانات الأساسية.");

  // قراءة الرابط من الخانة الجديدة
  let finalImageUrl = "";
  const imgUrlInput = document.getElementById("itemImageUrl");
  if (imgUrlInput) finalImageUrl = imgUrlInput.value.trim();

  // جمع البيانات الجديدة
  const payload = {
    name, category_id, price,
    is_instant: document.getElementById("itemInstant").checked,
    is_available: document.getElementById("itemAvailable").checked,
    in_offer: document.getElementById("itemInOffer").checked,
    calories: Number(document.getElementById("itemCalories").value) || null,
    tags: document.getElementById("itemTags").value.trim() || null,
    image_url: finalImageUrl || null // استخدام الرابط لو لم يتم رفع ملف
  };

  try {
    let savedItem;
    if (currentEditedItem) {
      // لو اختار ملف من جهازه، نرفعه ونستبدل الرابط
      if (currentImageFile) {
        payload.image_url = await uploadItemImage(currentImageFile, currentEditedItem.id);
      }
      
      const { data, error } = await window.supabaseClient.from("products").update(payload).eq("id", currentEditedItem.id).select().single();
      if (error) throw error;
      savedItem = data;
    } else {
      const { data: inserted, error: insertErr } = await window.supabaseClient.from("products").insert(payload).select().single();
      if (insertErr) throw insertErr;
      
      let finalItem = inserted;
      if (currentImageFile) {
        const image_url = await uploadItemImage(currentImageFile, inserted.id);
        const { data: updated } = await window.supabaseClient.from("products").update({ image_url }).eq("id", inserted.id).select().single();
        finalItem = updated;
      }
      savedItem = finalItem;
    }

    alert("تم حفظ الصنف بنجاح!");
    closeItemModal();
    await loadCategoriesAndProducts();
  } catch (err) {
    console.error(err);
    alert("حدث خطأ أثناء الحفظ.");
  }
}

// 4. دالة التفعيل والإيقاف (كما هي)
async function toggleItemAvailability(itemId) {
  const item = itemsState.products.find(p => String(p.id) === String(itemId));
  const { error } = await window.supabaseClient.from("products").update({ is_available: !item.is_available }).eq("id", item.id);
  if (!error) loadCategoriesAndProducts();
}

// ================================
// 5) إدارة التصنيفات (مختصرة للتركيز)
// ================================
function setupCategoryModalUI() {
  document.getElementById("closeCategoryModalX")?.addEventListener("click", () => document.getElementById("categoryModal").hidden = true);
  document.getElementById("cancelCategoryModalBtn")?.addEventListener("click", () => document.getElementById("categoryModal").hidden = true);
  document.getElementById("newCategoryBtn")?.addEventListener("click", () => { document.getElementById("categoryName").value = ""; currentEditedCategoryId = null; });
  document.getElementById("saveCategoryBtn")?.addEventListener("click", saveCategoryForm);
}

function openCategoryModal() {
  document.getElementById("categoryName").value = "";
  currentEditedCategoryId = null;
  renderCategoryList();
  document.getElementById("categoryModal").hidden = false;
}

function renderCategoryList() {
  const html = itemsState.categories.map(c => `<tr><td>${c.name}</td><td><button class="btn-secondary" onclick="editCategory(${c.id}, '${c.name}')">تعديل</button></td></tr>`).join("");
  document.getElementById("categoryListContainer").innerHTML = `<table class="admin-table"><tbody>${html}</tbody></table>`;
}

window.editCategory = (id, name) => {
  currentEditedCategoryId = id;
  document.getElementById("categoryName").value = name;
};

async function saveCategoryForm() {
  const name = document.getElementById("categoryName").value.trim();
  if (!name) return;
  if (currentEditedCategoryId) {
    await window.supabaseClient.from("categories").update({ name }).eq("id", currentEditedCategoryId);
  } else {
    await window.supabaseClient.from("categories").insert({ name });
  }
  document.getElementById("categoryName").value = "";
  reloadCategoriesOnly();
}
