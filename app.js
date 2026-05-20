const firebaseConfig = {
  apiKey: "AIzaSyAZ4-dUBSKsHP3sTqRE8G9c2AjeclTlIik",
  authDomain: "fawatir-f5a13.firebaseapp.com",
  databaseURL: "https://fawatir-f5a13-default-rtdb.firebaseio.com",
  projectId: "fawatir-f5a13",
  storageBucket: "fawatir-f5a13.firebasestorage.app",
  messagingSenderId: "334207827614",
  appId: "1:334207827614:web:3c053434b04c1dd3ea858f",
  measurementId: "G-W42ECQR0LW"
};

const EMPLOYEES = [
  { name: "سلطان", code: "3731" },
  { name: "علي", code: "2027" },
  { name: "ناهده", code: "1234" },
  { name: "sanad", code: "2244" },
  { name: "nagla", code: "9999" },
  { name: "yousef", code: "2266" },
  { name: "أحمد حلمي", code: "2581" },
  { name: "رانيا فنون", code: "3333" },
  { name: "فاطمة", code: "4787" },
  { name: "صفوت", code: "2110" },
  { name: "ّIsmail", code: "4744" },
  { name: "رمزي", code: "1111" },
  { name: "محمود", code: "9774" },
  { name: "طارق", code: "8050" },
  { name: "أحمد شوشه", code: "5466" },
  { name: "نجلاء", code: "9516" }
];

const UNITS = [
  { ar: "حبة", en: "Piece" },
  { ar: "كيس", en: "Bag" },
  { ar: "درزن", en: "Dozen" },
  { ar: "لتر", en: "Liter" },
  { ar: "كيلو", en: "Kilo" },
  { ar: "جرام", en: "Gram" },
  { ar: "علبة", en: "Box" }
];

const WHATSAPP_PHONE = "639356113621";
const LOCAL_ORDERS_KEY = "shortageOrders.v1";

const state = {
  db: null,
  employee: null,
  branch: "",
  products: [],
  catalogLoading: true,
  catalogFilter: "all",
  cart: [],
  selectedItem: null,
  selectedUnit: null,
  qtyValue: "",
  adminVisible: false,
  remoteOrders: []
};

const els = {};

document.addEventListener("DOMContentLoaded", init);
window.addEventListener("pageshow", handlePageShow);

function init() {
  clearLegacySession();
  cacheElements();
  bindLogoFallbacks();
  initFirebase();
  bindEvents();
  const publicOrderId = new URLSearchParams(window.location.search).get("order");
  if (publicOrderId) {
    loadPublicOrder(publicOrderId);
    return;
  }
  renderNumpad();
  renderUnits();
  resetSessionOnLoad();
  loadCatalogData();
  listenRemoteOrders();
}

function handlePageShow(event) {
  const publicOrderId = new URLSearchParams(window.location.search).get("order");
  if (publicOrderId || !els.loginView) return;
  if (event.persisted || performance.getEntriesByType("navigation")[0]?.type === "back_forward") {
    resetSessionOnLoad();
  }
}

function clearLegacySession() {
  localStorage.removeItem("shortageSession.v1");
  sessionStorage.removeItem("shortageSession.v1");
}

function bindLogoFallbacks() {
  document.querySelectorAll("img[data-fallback-src]").forEach((image) => {
    image.addEventListener("error", () => {
      const fallback = image.dataset.fallbackSrc;
      if (fallback && image.src !== fallback) {
        image.src = fallback;
      }
    }, { once: true });
  });
}

function cacheElements() {
  [
    "loginView", "branchView", "catalogView", "adminView", "loginForm", "employeeCode",
    "loginError", "welcomeName", "branchOptions", "confirmBranch", "logoutFromBranch",
    "catalogEmployee", "catalogBranch", "backToBranch", "catalogFilters", "productSearch", "productGrid",
    "emptyState", "dataStatus", "productCount", "floatingCartBtn", "floatingCartCount",
    "qtyModal", "qtyClose", "qtyItemType", "qtyItemName", "qtyItemNameEn", "unitStrip",
    "qtyDisplay", "numpad", "qtyError", "qtyAdd", "cartModal", "cartClose", "cartItems",
    "cartTotalBadge", "sendRequest", "shareCanvas", "secretTapArea", "adminRevealBtn",
    "adminLoginModal", "adminLoginClose", "adminCode", "adminLoginError", "adminLoginBtn",
    "adminLogout", "ordersList", "adminSearch", "clearLocalOrders", "orderView",
    "publicOrderNumber", "publicOrderBody", "publicPdfBtn"
  ].forEach((id) => {
    els[id] = document.getElementById(id);
  });
}

function initFirebase() {
  if (!window.firebase) {
    setStatus("تعذر تحميل اتصال البيانات. سيتم عرض أي بيانات محفوظة فقط.");
    return;
  }
  try {
    const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(firebaseConfig);
    state.db = app.database();
  } catch (error) {
    setStatus("تعذر الاتصال بقاعدة البيانات.");
  }
}

function bindEvents() {
  els.loginForm.addEventListener("submit", handleLogin);
  els.employeeCode.addEventListener("input", normalizeCodeInput);
  els.branchOptions.addEventListener("click", handleBranchPick);
  els.confirmBranch.addEventListener("click", openCatalog);
  els.logoutFromBranch.addEventListener("click", logout);
  els.backToBranch.addEventListener("click", () => showView("branch"));
  els.catalogFilters.addEventListener("click", handleCatalogFilter);
  els.productSearch.addEventListener("input", renderProducts);
  els.productGrid.addEventListener("click", handleProductClick);
  els.floatingCartBtn.addEventListener("click", openCart);
  els.qtyClose.addEventListener("click", closeQtyModal);
  els.qtyAdd.addEventListener("click", addQtyToCart);
  els.cartClose.addEventListener("click", closeCart);
  els.cartItems.addEventListener("input", handleCartEdit);
  els.cartItems.addEventListener("change", handleCartEdit);
  els.cartItems.addEventListener("click", handleCartDelete);
  els.sendRequest.addEventListener("click", sendRequest);
  els.secretTapArea.addEventListener("click", handleSecretTap);
  els.adminRevealBtn.addEventListener("click", openAdminLogin);
  els.adminLoginClose.addEventListener("click", closeAdminLogin);
  els.adminLoginBtn.addEventListener("click", verifyAdmin);
  els.adminCode.addEventListener("keydown", (event) => {
    if (event.key === "Enter") verifyAdmin();
  });
  els.adminLogout.addEventListener("click", () => showView(state.employee ? "branch" : "login"));
  els.adminSearch.addEventListener("input", renderAdminOrders);
  els.clearLocalOrders.addEventListener("click", clearLocalOrders);
  els.publicPdfBtn.addEventListener("click", downloadPublicOrderPdf);
}

function normalizeCodeInput(event) {
  const input = event.target;
  const normalized = normalizeDigits(input.value);
  if (input.value !== normalized) {
    input.value = normalized;
  }
}

function handleLogin(event) {
  event.preventDefault();
  const code = normalizeDigits(els.employeeCode.value);
  const employee = EMPLOYEES.find((item) => item.code === code);
  if (!employee) {
    els.loginError.textContent = "الرمز غير صحيح";
    return;
  }
  els.loginError.textContent = "";
  state.employee = employee;
  state.branch = "";
  state.cart = [];
  els.welcomeName.textContent = `مرحبا ${employee.name}`;
  clearBranchSelection();
  showView("branch");
}

function handleBranchPick(event) {
  const button = event.target.closest("[data-branch]");
  if (!button) return;
  state.branch = button.dataset.branch;
  document.querySelectorAll("#branchOptions button").forEach((item) => {
    item.classList.toggle("active", item === button);
  });
  els.confirmBranch.disabled = false;
}

function openCatalog() {
  if (!state.branch) return;
  els.catalogEmployee.textContent = state.employee?.name || "-";
  els.catalogBranch.textContent = state.branch;
  showView("catalog");
  renderProducts();
  renderFloatingCart();
}

function handleCatalogFilter(event) {
  const button = event.target.closest("[data-filter]");
  if (!button) return;
  state.catalogFilter = button.dataset.filter;
  els.catalogFilters.querySelectorAll("button").forEach((item) => {
    item.classList.toggle("active", item === button);
  });
  renderProducts();
}

function logout() {
  state.employee = null;
  state.branch = "";
  state.cart = [];
  els.employeeCode.value = "";
  showView("login");
}

function resetSessionOnLoad() {
  clearLegacySession();
  state.employee = null;
  state.branch = "";
  state.cart = [];
  if (els.employeeCode) els.employeeCode.value = "";
  if (els.loginError) els.loginError.textContent = "";
  if (els.catalogEmployee) els.catalogEmployee.textContent = "-";
  if (els.catalogBranch) els.catalogBranch.textContent = "-";
  clearBranchSelection();
  renderFloatingCart();
  showView("login");
}

function showView(name) {
  els.loginView.classList.toggle("hidden", name !== "login");
  els.branchView.classList.toggle("hidden", name !== "branch");
  els.catalogView.classList.toggle("hidden", name !== "catalog");
  els.adminView.classList.toggle("hidden", name !== "admin");
  els.orderView.classList.toggle("hidden", name !== "order");
  if (name === "admin") renderAdminOrders();
}

function clearBranchSelection() {
  state.branch = "";
  els.confirmBranch.disabled = true;
  document.querySelectorAll("#branchOptions button").forEach((item) => item.classList.remove("active"));
}

function selectBranchButton(branch) {
  document.querySelectorAll("#branchOptions button").forEach((item) => {
    item.classList.toggle("active", item.dataset.branch === branch);
  });
  els.confirmBranch.disabled = !branch;
}

function loadCatalogData() {
  state.catalogLoading = true;
  setStatus("جاري تحميل المنتجات...", true);
  renderProducts();

  if (!state.db) {
    state.catalogLoading = false;
    setStatus("لا يوجد اتصال بقاعدة البيانات.");
    renderProducts();
    return;
  }

  Promise.all([
    state.db.ref("products").once("value"),
    state.db.ref("stockMaterials").once("value")
  ]).then(([productsSnap, materialsSnap]) => {
    const products = mapFirebaseItems(productsSnap.val(), "product");
    const materials = mapFirebaseItems(materialsSnap.val(), "material");
    state.products = [...products, ...materials].sort((a, b) => getName(a).localeCompare(getName(b), "ar"));
    state.catalogLoading = false;
    setStatus(state.products.length ? "تم تحميل المنتجات ومواد المخزون" : "لم يتم العثور على منتجات في قاعدة البيانات");
    renderProducts();
  }).catch(() => {
    state.catalogLoading = false;
    setStatus("تعذر تحميل المنتجات من قاعدة البيانات.");
    renderProducts();
  });
}

function listenRemoteOrders() {
  if (!state.db) return;
  state.db.ref("shortageRequests").limitToLast(300).on("value", (snap) => {
    state.remoteOrders = Object.values(snap.val() || {})
      .filter((order) => order && order.id)
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    if (!els.adminView.classList.contains("hidden")) renderAdminOrders();
  }, () => {});
}

function mapFirebaseItems(data, type) {
  return Object.entries(data || {})
    .map(([id, item]) => ({
      id,
      type,
      nameAr: item.nameAr || item.name || item.arabicName || "",
      nameEn: item.nameEn || item.nameEnglish || item.englishName || item.name || "",
      code: item.code || item.productCode || item.barcode || "",
      raw: item
    }))
    .filter((item) => getName(item) || item.nameEn || item.code);
}

function renderProducts() {
  if (state.catalogLoading) {
    els.productGrid.innerHTML = "";
    els.emptyState.classList.add("hidden");
    els.productCount.textContent = "0 صنف";
    return;
  }

  const query = normalizeSearch(els.productSearch.value);
  const list = state.products.filter((item) => {
    if (state.catalogFilter !== "all" && item.type !== state.catalogFilter) return false;
    if (!query) return true;
    return [
      item.nameAr,
      item.nameEn,
      item.code,
      item.type === "material" ? "مواد مخزون stock material" : "منتج product"
    ].some((value) => normalizeSearch(value).includes(query));
  });

  els.productGrid.innerHTML = list.map((item) => `
    <article class="product-card">
      <div>
        <span class="product-type">${item.type === "material" ? "مادة مخزون" : "منتج"}</span>
        <h4>${escapeHtml(getName(item))}</h4>
        <p>${escapeHtml(item.nameEn || item.code || "Inventory item")}</p>
      </div>
      <button type="button" data-id="${escapeHtml(item.id)}" data-type="${item.type}">إضافة</button>
    </article>
  `).join("");

  els.emptyState.classList.toggle("hidden", list.length !== 0);
  els.productCount.textContent = `${list.length} صنف`;
}

function handleProductClick(event) {
  const button = event.target.closest("button[data-id]");
  if (!button) return;
  const item = state.products.find((entry) => entry.id === button.dataset.id && entry.type === button.dataset.type);
  if (!item) return;
  openQtyModal(item);
}

function openQtyModal(item) {
  state.selectedItem = item;
  state.qtyValue = "";
  state.selectedUnit = null;
  els.qtyError.textContent = "";
  els.qtyItemType.textContent = item.type === "material" ? "مادة مخزون" : "منتج";
  els.qtyItemName.textContent = getName(item);
  els.qtyItemNameEn.textContent = item.nameEn || item.code || "-";
  renderUnits();
  updateQtyDisplay();
  els.qtyModal.classList.remove("hidden");
}

function closeQtyModal() {
  els.qtyModal.classList.add("hidden");
  state.selectedItem = null;
}

function renderUnits() {
  els.unitStrip.innerHTML = UNITS.map((unit, index) => `
    <button type="button" class="${state.selectedUnit && unit.ar === state.selectedUnit.ar ? "active" : ""}" data-index="${index}">
      ${unit.ar} / ${unit.en}
    </button>
  `).join("");
  els.unitStrip.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedUnit = UNITS[Number(button.dataset.index)];
      els.qtyError.textContent = "";
      renderUnits();
    });
  });
}

function renderNumpad() {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"];
  els.numpad.innerHTML = keys.map((key) => `<button type="button" data-key="${key}">${key}</button>`).join("");
  els.numpad.addEventListener("click", (event) => {
    const button = event.target.closest("[data-key]");
    if (!button) return;
    const key = button.dataset.key;
    if (key === "⌫") {
      state.qtyValue = state.qtyValue.slice(0, -1);
    } else if (key === ".") {
      if (!state.qtyValue.includes(".")) state.qtyValue = state.qtyValue ? `${state.qtyValue}.` : "0.";
    } else {
      state.qtyValue = `${state.qtyValue}${key}`.replace(/^0+(?=\d)/, "");
    }
    updateQtyDisplay();
  });
}

function updateQtyDisplay() {
  els.qtyDisplay.textContent = state.qtyValue || "0";
}

function addQtyToCart() {
  const qty = Number(state.qtyValue || 0);
  if (!state.selectedItem) return;
  if (!state.selectedUnit) {
    els.qtyError.textContent = "لازم تختار الوحدة أولاً";
    return;
  }
  if (qty <= 0) {
    els.qtyError.textContent = "لازم تحدد الكمية أولاً";
    return;
  }
  const key = `${state.selectedItem.type}:${state.selectedItem.id}:${state.selectedUnit.ar}`;
  const existing = state.cart.find((item) => item.key === key);
  if (existing) {
    existing.qty = Number(existing.qty || 0) + qty;
  } else {
    state.cart.push({
      key,
      id: state.selectedItem.id,
      type: state.selectedItem.type,
      nameAr: state.selectedItem.nameAr,
      nameEn: state.selectedItem.nameEn,
      code: state.selectedItem.code,
      qty,
      unitAr: state.selectedUnit.ar,
      unitEn: state.selectedUnit.en
    });
  }
  renderFloatingCart();
  closeQtyModal();
}

function renderFloatingCart() {
  const count = state.cart.length;
  els.floatingCartBtn.classList.toggle("hidden", count === 0);
  els.floatingCartCount.textContent = count;
}

function openCart() {
  renderCart();
  els.cartModal.classList.remove("hidden");
}

function closeCart() {
  els.cartModal.classList.add("hidden");
}

function renderCart() {
  els.cartTotalBadge.textContent = `${state.cart.length} صنف`;
  if (!state.cart.length) {
    els.cartItems.innerHTML = `<div class="empty-state"><strong>السلة فارغة</strong><span>أضف المنتجات المطلوبة أولا.</span></div>`;
    return;
  }

  els.cartItems.innerHTML = state.cart.map((item, index) => `
    <article class="cart-row" data-index="${index}">
      <div>
        <h4>${escapeHtml(item.nameAr || item.nameEn || item.code || "-")}</h4>
        <p>${escapeHtml(item.nameEn || item.code || "-")}</p>
      </div>
      <div class="cart-controls">
        <input type="number" min="0.01" step="0.01" value="${item.qty}" data-field="qty" />
        <select data-field="unit">
          ${UNITS.map((unit) => `<option value="${unit.ar}" ${unit.ar === item.unitAr ? "selected" : ""}>${unit.ar} / ${unit.en}</option>`).join("")}
        </select>
        <button type="button" data-delete="${index}" aria-label="حذف">×</button>
      </div>
    </article>
  `).join("");
}

function handleCartEdit(event) {
  const row = event.target.closest(".cart-row");
  if (!row) return;
  const item = state.cart[Number(row.dataset.index)];
  if (!item) return;
  if (event.target.dataset.field === "qty") {
    item.qty = Math.max(0.01, Number(event.target.value || 0.01));
  }
  if (event.target.dataset.field === "unit") {
    const unit = UNITS.find((entry) => entry.ar === event.target.value) || UNITS[0];
    item.unitAr = unit.ar;
    item.unitEn = unit.en;
    item.key = `${item.type}:${item.id}:${unit.ar}`;
  }
}

function handleCartDelete(event) {
  const button = event.target.closest("[data-delete]");
  if (!button) return;
  state.cart.splice(Number(button.dataset.delete), 1);
  renderCart();
  renderFloatingCart();
}

async function sendRequest() {
  if (!state.cart.length) return;
  const order = buildOrder();
  await persistOrder(order);
  const orderLink = buildOrderLink(order);
  const text = buildWhatsappText(order, orderLink);
  openWhatsapp(text);

  state.cart = [];
  renderFloatingCart();
  closeCart();
}

function buildOrder() {
  return {
    id: `SR-${Date.now()}`,
    orderNumber: `SR-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${String(Date.now()).slice(-5)}`,
    createdAt: new Date().toISOString(),
    employeeName: state.employee?.name || "-",
    employeeCode: state.employee?.code || "-",
    branch: state.branch || "-",
    items: state.cart.map((item) => ({ ...item }))
  };
}

function persistOrder(order) {
  const localOrders = readLocalOrders();
  localOrders.unshift(order);
  localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(localOrders.slice(0, 500)));
  if (state.db) {
    return state.db.ref(`shortageRequests/${order.id}`).set(order).catch(() => {});
  }
  return Promise.resolve();
}

async function createOrderImage(order) {
  const canvas = els.shareCanvas;
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const rowHeight = 72;
  const dynamicHeight = Math.max(1600, 620 + order.items.length * rowHeight);
  canvas.height = dynamicHeight;

  ctx.fillStyle = "#fffaf1";
  ctx.fillRect(0, 0, width, dynamicHeight);
  ctx.fillStyle = "#1d1a16";
  ctx.fillRect(0, 0, width, 210);
  ctx.fillStyle = "#b9892f";
  ctx.fillRect(0, 206, width, 8);

  await drawLogo(ctx, 70, 46, 118);
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 48px Cairo, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("طلب نواقص الأفرع", width - 70, 82);
  ctx.font = "700 30px Inter, sans-serif";
  ctx.fillText("Branch Shortage Request", width - 70, 128);
  ctx.font = "600 25px Inter, sans-serif";
  ctx.fillStyle = "#ead19a";
  ctx.fillText(order.orderNumber, width - 70, 170);

  const created = new Date(order.createdAt);
  const meta = [
    ["اسم الموظف", order.employeeName, "Employee"],
    ["الفرع المطلوب التحويل إليه", order.branch, "Target Branch"],
    ["التاريخ والوقت", created.toLocaleString("ar-KW"), "Date & Time"]
  ];

  let y = 280;
  ctx.textAlign = "right";
  meta.forEach(([ar, value, en]) => {
    roundRect(ctx, 70, y, width - 140, 86, 22, "#ffffff", "#eee0c8");
    ctx.fillStyle = "#7a561d";
    ctx.font = "800 25px Cairo, sans-serif";
    ctx.fillText(ar, width - 102, y + 33);
    ctx.font = "700 20px Inter, sans-serif";
    ctx.fillText(en, width - 102, y + 62);
    ctx.fillStyle = "#1d1a16";
    ctx.font = "800 31px Cairo, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(value, 105, y + 51);
    ctx.textAlign = "right";
    y += 104;
  });

  y += 12;
  roundRect(ctx, 70, y, width - 140, 70, 18, "#167b6f", null);
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 25px Cairo, sans-serif";
  ctx.fillText("الصنف", width - 105, y + 44);
  ctx.textAlign = "center";
  ctx.fillText("الكمية", 250, y + 44);
  ctx.textAlign = "right";
  y += 86;

  order.items.forEach((item, index) => {
    roundRect(ctx, 70, y, width - 140, 62, 16, index % 2 ? "#fbf4e8" : "#ffffff", "#eee0c8");
    ctx.fillStyle = "#1d1a16";
    ctx.font = "800 23px Cairo, sans-serif";
    ctx.fillText(item.nameAr || item.nameEn || "-", width - 100, y + 25);
    ctx.font = "600 17px Inter, sans-serif";
    ctx.fillStyle = "#6d665c";
    ctx.fillText(item.nameEn || item.code || "-", width - 100, y + 50);
    ctx.textAlign = "center";
    ctx.fillStyle = "#1d1a16";
    ctx.font = "800 24px Inter, sans-serif";
    ctx.fillText(`${formatQty(item.qty)} ${item.unitAr}`, 250, y + 27);
    ctx.font = "600 17px Inter, sans-serif";
    ctx.fillStyle = "#6d665c";
    ctx.fillText(item.unitEn, 250, y + 51);
    ctx.textAlign = "right";
    y += rowHeight;
  });

  ctx.fillStyle = "#7a561d";
  ctx.font = "700 22px Cairo, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("تم إنشاء الطلب من نظام طلب نواقص الأفرع", width / 2, dynamicHeight - 70);
  ctx.font = "600 18px Inter, sans-serif";
  ctx.fillText("Generated by Branch Shortage Request System", width / 2, dynamicHeight - 42);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png", 0.96));
  return blob ? new File([blob], `${order.orderNumber}.png`, { type: "image/png" }) : null;
}

function drawLogo(ctx, x, y, size) {
  return new Promise((resolve) => {
    const image = new Image();
    let triedFallback = false;
    image.onload = () => {
      ctx.save();
      roundRect(ctx, x, y, size, size, 28, "#ffffff", null);
      ctx.drawImage(image, x + 8, y + 8, size - 16, size - 16);
      ctx.restore();
      resolve();
    };
    image.onerror = () => {
      if (!triedFallback) {
        triedFallback = true;
        image.src = "لاخذ البيانات/logo.png";
        return;
      }
      resolve();
    };
    image.src = "logo.png";
  });
}

function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function buildWhatsappText(order, orderLink) {
  const branchEn = getBranchEnglish(order.branch);
  const lines = [
    `New shortage order from ${branchEn}.`,
    "Please click the link below to view the full request details and item list:",
    orderLink,
    "",
    `Request No: ${order.orderNumber}`,
    `Employee: ${order.employeeName}`,
    `Target branch: ${branchEn}`,
    "",
    "Thank you."
  ];
  return lines.join("\n");
}

function buildOrderLink(order) {
  const url = new URL(window.location.href);
  url.hash = "";
  url.search = "";
  url.searchParams.set("order", order.id);
  return url.toString();
}

function getBranchEnglish(branch) {
  if (branch === "اليرموك") return "Yarmouk branch";
  if (branch === "ابو الحصانية") return "Abu Al Hasaniya branch";
  return `${branch || "the selected branch"}`;
}

function loadPublicOrder(orderId) {
  showView("order");
  els.publicOrderNumber.textContent = orderId;
  const localOrder = readLocalOrders().find((order) => order.id === orderId);
  if (localOrder) {
    renderPublicOrder(localOrder);
  }

  if (!state.db) {
    if (!localOrder) renderPublicOrderError();
    return;
  }

  state.db.ref(`shortageRequests/${orderId}`).once("value")
    .then((snap) => {
      const order = snap.val();
      if (order) {
        renderPublicOrder(order);
      } else if (!localOrder) {
        renderPublicOrderError();
      }
    })
    .catch(() => {
      if (!localOrder) renderPublicOrderError();
    });
}

function renderPublicOrder(order) {
  const created = new Date(order.createdAt || Date.now());
  const items = order.items || [];
  els.publicOrderNumber.textContent = order.orderNumber || order.id || "-";
  els.publicOrderBody.innerHTML = `
    <div class="public-section-title">
      <strong>بيانات الطلب</strong>
      <span>Order Information</span>
    </div>
    <div class="public-meta-grid">
      <div>
        <span>رقم الطلب</span>
        <small>Request No.</small>
        <strong>${escapeHtml(order.orderNumber || order.id || "-")}</strong>
      </div>
      <div>
        <span>اسم الموظف</span>
        <small>Employee Name</small>
        <strong>${escapeHtml(order.employeeName || "-")}</strong>
      </div>
      <div>
        <span>رمز الموظف</span>
        <small>Employee Code</small>
        <strong>${escapeHtml(order.employeeCode || "-")}</strong>
      </div>
      <div>
        <span>الفرع المطلوب التحويل إليه</span>
        <small>Target Branch</small>
        <strong>${escapeHtml(order.branch || "-")}</strong>
      </div>
      <div>
        <span>التاريخ والوقت</span>
        <small>Date & Time</small>
        <strong>${escapeHtml(created.toLocaleString("ar-KW"))}</strong>
      </div>
      <div>
        <span>عدد الأصناف</span>
        <small>Total Items</small>
        <strong>${items.length}</strong>
      </div>
    </div>
    <div class="public-section-title">
      <strong>قائمة المنتجات</strong>
      <span>Items List</span>
    </div>
    <div class="public-table-wrap">
      <table class="public-items-table">
        <thead>
          <tr>
            <th>م<br><small>No.</small></th>
            <th>اسم الصنف بالعربي<br><small>Arabic Item Name</small></th>
            <th>اسم الصنف بالإنجليزي<br><small>English Item Name</small></th>
            <th>الكمية<br><small>Quantity</small></th>
            <th>الوحدة<br><small>Unit</small></th>
          </tr>
        </thead>
        <tbody>
          ${items.map((item, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${escapeHtml(item.nameAr || "-")}</td>
              <td dir="ltr">${escapeHtml(item.nameEn || item.code || "-")}</td>
              <td dir="ltr">${formatQty(item.qty)}</td>
              <td>${escapeHtml(item.unitAr || "-")}<br><small>${escapeHtml(item.unitEn || "-")}</small></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
    <footer class="public-order-footer">
      <span>تم إنشاء هذا الطلب من نظام طلب نواقص الأفرع</span>
      <strong>Generated by Branch Shortage Request System</strong>
    </footer>
  `;
}

function renderPublicOrderError() {
  els.publicOrderBody.innerHTML = `
    <div class="empty-state">
      <strong>تعذر العثور على الطلب</strong>
      <span>Order not found or the link is no longer available.</span>
    </div>
  `;
}

function downloadPublicOrderPdf() {
  window.print();
}

function openWhatsapp(text) {
  window.location.href = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(text)}`;
}

function downloadImageFromCanvas(orderNumber) {
  const link = document.createElement("a");
  link.download = `${orderNumber}.png`;
  link.href = els.shareCanvas.toDataURL("image/png");
  link.click();
}

function handleSecretTap() {
  const now = Date.now();
  state.tapTimes = (state.tapTimes || []).filter((time) => now - time < 1600);
  state.tapTimes.push(now);
  if (state.tapTimes.length >= 5) {
    els.adminRevealBtn.classList.remove("hidden");
    state.tapTimes = [];
  }
}

function openAdminLogin() {
  els.adminLoginModal.classList.remove("hidden");
  els.adminCode.value = "";
  els.adminLoginError.textContent = "";
  setTimeout(() => els.adminCode.focus(), 80);
}

function closeAdminLogin() {
  els.adminLoginModal.classList.add("hidden");
}

function verifyAdmin() {
  if (normalizeDigits(els.adminCode.value) !== "5466") {
    els.adminLoginError.textContent = "رمز الأدمن غير صحيح";
    return;
  }
  closeAdminLogin();
  showView("admin");
}

function renderAdminOrders() {
  const query = normalizeSearch(els.adminSearch.value);
  const merged = mergeOrders(readLocalOrders(), state.remoteOrders);
  const orders = merged.filter((order) => {
    if (!query) return true;
    const haystack = [
      order.employeeName,
      order.branch,
      order.orderNumber,
      ...(order.items || []).flatMap((item) => [item.nameAr, item.nameEn])
    ].join(" ");
    return normalizeSearch(haystack).includes(query);
  });

  if (!orders.length) {
    els.ordersList.innerHTML = `<div class="empty-state"><strong>لا توجد طلبات محفوظة</strong><span>ستظهر الطلبات هنا بعد الإرسال.</span></div>`;
    return;
  }

  els.ordersList.innerHTML = orders.map((order) => {
    const created = new Date(order.createdAt);
    return `
      <article class="order-card">
        <div class="order-card-head">
          <div>
            <h3>${escapeHtml(order.employeeName)} - ${escapeHtml(order.branch)}</h3>
            <div class="meta">${escapeHtml(order.orderNumber)}</div>
          </div>
          <time>${created.toLocaleString("ar-KW")}</time>
        </div>
        <ul>
          ${(order.items || []).map((item) => `
            <li>
              <span>${escapeHtml(item.nameAr || item.nameEn || "-")}</span>
              <strong>${formatQty(item.qty)} ${escapeHtml(item.unitAr || "")}</strong>
            </li>
          `).join("")}
        </ul>
      </article>
    `;
  }).join("");
}

function mergeOrders(localOrders, remoteOrders) {
  const map = new Map();
  [...remoteOrders, ...localOrders].forEach((order) => {
    if (!order?.id) return;
    map.set(order.id, order);
  });
  return Array.from(map.values())
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

function clearLocalOrders() {
  if (!confirm("هل تريد مسح الطلبات المحفوظة على هذا الجهاز؟")) return;
  localStorage.removeItem(LOCAL_ORDERS_KEY);
  renderAdminOrders();
}

function readLocalOrders() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_ORDERS_KEY) || "[]");
  } catch {
    return [];
  }
}

function getName(item) {
  return item?.nameAr || item?.raw?.nameAr || item?.raw?.name || item?.nameEn || item?.code || "-";
}

function setStatus(text, loading = false) {
  els.dataStatus.textContent = text;
  els.dataStatus.classList.toggle("loading-status", loading);
}

function normalizeDigits(value) {
  return String(value || "")
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/\D/g, "");
}

function normalizeSearch(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/[ىي]/g, "ي")
    .trim();
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatQty(value) {
  return Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
}
