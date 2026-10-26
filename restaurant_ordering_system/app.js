/**
 * LAANCE SaaS Engine - Multi-Step Interactive Flow
 * Step 1: Exact Cover ("Why Clients Trust Us / Studio Agatho") -> Click "OPEN"
 * Step 2: Restaurant Login & 1-Month Free Trial Setup -> Click "Login & Proceed"
 * Step 3: Add & Edit Food Items (Photos, Timings, Price, Desc) -> Click "Generate QR"
 * Step 4: Automatic Table QR Studio (Table 1, 2, 3.. with printable stands)
 * Step 5: Customer Dining Menu (Locked to scanned table, Tray, Confirm Order)
 * Step 6: Live Operations Hub (Google Sheets Ledger + WhatsApp Kitchen Alerts + 12 AM Report)
 */

// ----------------- STATE STORE -----------------
let currentStepNumber = 1;

let restaurantConfig = JSON.parse(localStorage.getItem("laance_restaurant")) || {
    name: "La Lune French Bistro",
    id: "REST-PARIS-01",
    whatsapp: "+91 98470 12345",
    subscription: "1-Month Free Trial Active"
};

const DEFAULT_DISHES = [
    {
        id: "DISH-01",
        name: "Soupe à l'Oignon Gratinée",
        category: "Appetizers",
        price: 490,
        time: "11:00 AM - 11:30 PM",
        status: "Available",
        image: "https://images.unsplash.com/photo-1541544741938-0af808871cc0?auto=format&fit=crop&w=800&q=80",
        desc: "Classic Parisian caramelized onion broth topped with crusty sourdough and melted golden Gruyère cheese."
    },
    {
        id: "DISH-02",
        name: "Canard Rôti au Jus (Duck Breast)",
        category: "Mains",
        price: 1150,
        time: "12:30 PM - 11:00 PM",
        status: "Available",
        image: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80",
        desc: "Pan-seared tender duck breast with crispy skin, roasted thyme baby potatoes, and natural savory jus."
    },
    {
        id: "DISH-03",
        name: "Canelés Bordelais Caramélisés",
        category: "Desserts",
        price: 380,
        time: "All Day",
        status: "Available",
        image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80",
        desc: "Traditional fluted pastry from Bordeaux with deeply caramelized exterior and delicate vanilla-rum custard interior."
    },
    {
        id: "DISH-04",
        name: "Café Crème & Almond Macarons",
        category: "Drinks",
        price: 320,
        time: "All Day",
        status: "Available",
        image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80",
        desc: "Rich double-shot Parisian espresso with steamed microfoam, served with two artisanal almond macarons."
    }
];

let dishesCatalog = JSON.parse(localStorage.getItem("laance_dishes_catalog")) || DEFAULT_DISHES;
let activeCustomerFilter = "All";
let selectedTableForQr = 1;
let customerLockedTableNum = 1;
let trayCart = [];

let liveOrdersLedger = JSON.parse(localStorage.getItem("laance_orders_ledger")) || [
    {
        orderId: "ORD-9821",
        restaurantId: "REST-PARIS-01",
        tableNo: "Table 01",
        customerPhone: "+91 98460 12345",
        itemsSummary: "Canard Rôti (x1), Canelés (x2)",
        totalPrice: 1910,
        orderTime: "10:15 AM",
        status: "Delivered"
    }
];

// ----------------- INIT ON LOAD -----------------
document.addEventListener("DOMContentLoaded", () => {
    // Check if table URL query parameter exists (e.g. from QR scan)
    const urlParams = new URLSearchParams(window.location.search);
    const tableParam = urlParams.get("table");
    if (tableParam) {
        customerLockedTableNum = parseInt(tableParam, 10);
        goToStepPage(5); // Open customer dining directly
    } else {
        goToStepPage(1); // Start on Exact Cover Screen
    }

    updateHeaderDisplay();
    renderCatalogList();
    renderCustomerMenuGrid();
    pickTable(1);
    renderSheetsTable();
    updateLiveStats();
});

// ----------------- STEP CONTROLLER -----------------
function goToStepPage(stepIndex) {
    currentStepNumber = stepIndex;

    const innerWrapper = document.getElementById("innerPagesWrapper");
    const coverPage = document.getElementById("step-page-1");

    if (stepIndex === 1) {
        // Pure Cover Screen - Hide inner wrapper completely!
        if (coverPage) coverPage.classList.add("active");
        if (innerWrapper) innerWrapper.style.display = "none";
        document.body.style.backgroundColor = "#000000";
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
    }

    // Inner Pages 2 to 6
    if (coverPage) coverPage.classList.remove("active");
    if (innerWrapper) innerWrapper.style.display = "block";

    // 1. Hide all inner step screens and show target screen
    document.querySelectorAll("#innerPagesWrapper .step-screen").forEach(s => s.classList.remove("active"));
    const targetScreen = document.getElementById(`step-page-${stepIndex}`);
    if (targetScreen) {
        targetScreen.classList.add("active");
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    // 2. Update navigation tracker pills
    for (let i = 1; i <= 6; i++) {
        const link = document.getElementById(`navStep${i}`);
        if (!link) continue;
        if (i === stepIndex) {
            link.classList.add("active");
        } else {
            link.classList.remove("active");
        }
    }

    // 3. Step hooks
    if (stepIndex === 3) renderCatalogList();
    if (stepIndex === 4) pickTable(selectedTableForQr);
    if (stepIndex === 5) {
        updateCustomerLockDisplay();
        renderCustomerMenuGrid();
    }
    if (stepIndex === 6) {
        renderSheetsTable();
        updateLiveStats();
    }
}

// ----------------- STEP 2: LOGIN & SETUP -----------------
function submitLoginPage(e) {
    e.preventDefault();
    const name = document.getElementById("restNameInput").value.trim();
    const id = document.getElementById("restIdInput").value.trim();
    const wa = document.getElementById("restWhatsAppInput").value.trim();

    restaurantConfig = {
        name: name || "La Lune French Bistro",
        id: id || "REST-PARIS-01",
        whatsapp: wa || "+91 98470 12345",
        subscription: "1-Month Free Trial Active"
    };

    localStorage.setItem("laance_restaurant", JSON.stringify(restaurantConfig));
    updateHeaderDisplay();
    showToast(`Welcome ${restaurantConfig.name}! 1-Month Free Subscription Active.`);

    // Advance to Step 3: Menu Builder
    goToStepPage(3);
}

function updateHeaderDisplay() {
    const headerTitle = document.getElementById("headerRestName");
    if (headerTitle && restaurantConfig.name) {
        headerTitle.textContent = `${restaurantConfig.name} (1 Mo Free)`;
    }
}

// ----------------- STEP 3: MENU BUILDER -----------------
function renderCatalogList() {
    const container = document.getElementById("catalogDishesList");
    const badge = document.getElementById("totalDishesCountBadge");
    if (!container) return;

    if (badge) badge.textContent = dishesCatalog.length;

    container.innerHTML = dishesCatalog.map(dish => `
        <div class="catalog-dish-item">
            <img class="catalog-dish-thumb" src="${dish.image}" alt="${dish.name}" />
            <div class="catalog-dish-details">
                <h4>${dish.name}</h4>
                <div class="meta">${dish.category} &middot; ⏰ ${dish.time} &middot; ${dish.status}</div>
                <div class="price">₹${dish.price}</div>
            </div>
            <div class="catalog-ctrl-btns">
                <button class="btn-ctrl-item" onclick="editDishInCatalog('${dish.id}')">✏️ Edit</button>
                <button class="btn-ctrl-item" onclick="deleteDishFromCatalog('${dish.id}')">🗑️</button>
            </div>
        </div>
    `).join("");
}

function saveDishItem(e) {
    e.preventDefault();
    const editId = document.getElementById("editDishId").value;
    const name = document.getElementById("dishNameInput").value.trim();
    const category = document.getElementById("dishCategorySelect").value;
    const price = parseFloat(document.getElementById("dishPriceInput").value);
    const time = document.getElementById("dishTimeInput").value.trim();
    const status = document.getElementById("dishStatusSelect").value;
    const photo = document.getElementById("dishPhotoInput").value.trim();
    const desc = document.getElementById("dishDescInput").value.trim();

    if (editId) {
        const idx = dishesCatalog.findIndex(d => d.id === editId);
        if (idx !== -1) {
            dishesCatalog[idx] = { id: editId, name, category, price, time, status, image: photo, desc };
            showToast(`Updated "${name}"!`);
        }
    } else {
        const newId = "DISH-" + Math.floor(10 + Math.random() * 90);
        dishesCatalog.unshift({ id: newId, name, category, price, time, status, image: photo, desc });
        showToast(`Added "${name}" to your restaurant menu!`);
    }

    localStorage.setItem("laance_dishes_catalog", JSON.stringify(dishesCatalog));
    resetDishForm();
    renderCatalogList();
    renderCustomerMenuGrid();
}

function editDishInCatalog(id) {
    const dish = dishesCatalog.find(d => d.id === id);
    if (!dish) return;

    document.getElementById("editDishId").value = dish.id;
    document.getElementById("dishNameInput").value = dish.name;
    document.getElementById("dishCategorySelect").value = dish.category;
    document.getElementById("dishPriceInput").value = dish.price;
    document.getElementById("dishTimeInput").value = dish.time;
    document.getElementById("dishStatusSelect").value = dish.status;
    document.getElementById("dishPhotoInput").value = dish.image;
    document.getElementById("dishDescInput").value = dish.desc;
    document.getElementById("dishEditorHeading").textContent = `Editing: ${dish.name}`;

    showToast(`Loaded "${dish.name}" in editor.`);
}

function deleteDishFromCatalog(id) {
    if (confirm("Delete this food delicacy from menu?")) {
        dishesCatalog = dishesCatalog.filter(d => d.id !== id);
        localStorage.setItem("laance_dishes_catalog", JSON.stringify(dishesCatalog));
        renderCatalogList();
        renderCustomerMenuGrid();
        showToast("Dish removed.");
    }
}

function resetDishForm() {
    document.getElementById("dishBuilderForm").reset();
    document.getElementById("editDishId").value = "";
    document.getElementById("dishEditorHeading").textContent = "Add New Food Item";
}

function applyPresetPhoto(type) {
    const photoField = document.getElementById("dishPhotoInput");
    if (type === 'appetizer') {
        photoField.value = "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=800&q=80";
    } else if (type === 'main') {
        photoField.value = "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80";
    } else if (type === 'dessert') {
        photoField.value = "https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=800&q=80";
    }
    showToast("Preset photo applied!");
}

// ----------------- STEP 4: TABLE QR STUDIO -----------------
function pickTable(tableNo) {
    selectedTableForQr = tableNo;

    // Highlight chip
    document.querySelectorAll(".btn-table-picker").forEach(btn => {
        if (btn.textContent.includes(`Table 0${tableNo}`) || btn.textContent.includes(`Table ${tableNo}`)) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });

    const origin = window.location.origin || "http://localhost:8000";
    const path = window.location.pathname.endsWith(".html") ? window.location.pathname : "/index.html";
    const scanUrl = `${origin}${path}?table=${tableNo}`;

    // Update form elements
    const urlInput = document.getElementById("targetScanUrlBox");
    const waDisplay = document.getElementById("connectedWaNumberText");
    const bistroName = document.getElementById("standBistroName");
    const tableTitle = document.getElementById("standTableTitle");
    const qrImg = document.getElementById("standQrImage");

    if (urlInput) urlInput.value = scanUrl;
    if (waDisplay) waDisplay.textContent = restaurantConfig.whatsapp;
    if (bistroName) bistroName.textContent = restaurantConfig.name.toUpperCase();
    if (tableTitle) tableTitle.textContent = `TABLE 0${tableNo}`;

    // Live dynamic QR generation
    const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(scanUrl)}&color=000000&bgcolor=ffffff`;
    if (qrImg) qrImg.src = qrSrc;
}

function simulateScan() {
    customerLockedTableNum = selectedTableForQr;
    showToast(`Scanning Table 0${customerLockedTableNum} QR code...`);
    setTimeout(() => {
        goToStepPage(5);
    }, 350);
}

// ----------------- STEP 5: CUSTOMER DINING -----------------
function updateCustomerLockDisplay() {
    const lockTitle = document.getElementById("lockedTableDisplay");
    if (lockTitle) lockTitle.textContent = `TABLE 0${customerLockedTableNum}`;

    const trayTitle = document.getElementById("trayTableLabel");
    if (trayTitle) trayTitle.textContent = `Table 0${customerLockedTableNum}`;
}

function filterCustomerDishes(cat) {
    activeCustomerFilter = cat;
    document.querySelectorAll(".btn-filter-category").forEach(btn => {
        if (btn.textContent.includes(cat) || (cat === "All" && btn.textContent.includes("All"))) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });
    renderCustomerMenuGrid();
}

function renderCustomerMenuGrid() {
    const grid = document.getElementById("customerDishesGrid");
    if (!grid) return;

    const filtered = activeCustomerFilter === "All"
        ? dishesCatalog
        : dishesCatalog.filter(d => d.category === activeCustomerFilter);

    grid.innerHTML = filtered.map(dish => `
        <div class="dish-card-luxury">
            <div class="dish-card-img">
                <img src="${dish.image}" alt="${dish.name}" loading="lazy" />
                <span class="dish-time-tag">⏰ ${dish.time}</span>
            </div>
            <div class="dish-card-info">
                <div class="head">
                    <h3>${dish.name}</h3>
                    <span class="price">₹${dish.price}</span>
                </div>
                <p>${dish.desc}</p>
                <div class="actions">
                    <span class="text-green" style="font-size:0.82rem; font-weight:600;">● ${dish.status}</span>
                    <button class="btn-add-to-tray-btn" onclick="addToDiningTray('${dish.id}')">+ Add to Tray</button>
                </div>
            </div>
        </div>
    `).join("");
}

function addToDiningTray(dishId) {
    const dish = dishesCatalog.find(d => d.id === dishId);
    if (!dish) return;

    const existing = trayCart.find(c => c.id === dishId);
    if (existing) {
        existing.qty += 1;
    } else {
        trayCart.push({ ...dish, qty: 1 });
    }

    refreshTrayDisplay();
    showToast(`Added ${dish.name} to Table 0${customerLockedTableNum} tray!`);
}

function updateTrayQuantity(dishId, delta) {
    const idx = trayCart.findIndex(c => c.id === dishId);
    if (idx === -1) return;

    trayCart[idx].qty += delta;
    if (trayCart[idx].qty <= 0) trayCart.splice(idx, 1);

    refreshTrayDisplay();
}

function refreshTrayDisplay() {
    const totalCount = trayCart.reduce((sum, item) => sum + item.qty, 0);
    const subtotal = trayCart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const loyaltyPoints = Math.floor(subtotal / 100);

    const badgeCount = document.getElementById("trayCountBadge");
    const badgeTotal = document.getElementById("trayTotalBadge");
    if (badgeCount) badgeCount.textContent = totalCount;
    if (badgeTotal) badgeTotal.textContent = subtotal.toFixed(2);

    const container = document.getElementById("trayItemsContainer");
    if (container) {
        if (trayCart.length === 0) {
            container.innerHTML = `<p style="text-align:center; color:#888; margin-top:2rem;">Your dining tray is empty.</p>`;
        } else {
            container.innerHTML = trayCart.map(item => `
                <div class="tray-item-row-card">
                    <div>
                        <h5 style="color:#ffffff; font-size:0.95rem;">${item.name}</h5>
                        <span style="color:var(--accent-gold); font-size:0.82rem; font-weight:600;">₹${item.price} &times; ${item.qty} = ₹${item.price * item.qty}</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:0.6rem;">
                        <button class="btn-qty-adj-btn" onclick="updateTrayQuantity('${item.id}', -1)">-</button>
                        <span>${item.qty}</span>
                        <button class="btn-qty-adj-btn" onclick="updateTrayQuantity('${item.id}', 1)">+</button>
                    </div>
                </div>
            `).join("");
        }
    }

    const subText = document.getElementById("traySubtotalText");
    const loyaltyText = document.getElementById("trayLoyaltyText");
    const grandText = document.getElementById("trayGrandTotalText");

    if (subText) subText.textContent = `₹${subtotal.toFixed(2)}`;
    if (loyaltyText) loyaltyText.textContent = `${loyaltyPoints} Points (₹100 = 1 Pt)`;
    if (grandText) grandText.textContent = `₹${subtotal.toFixed(2)}`;
}

function openTrayDrawer() {
    document.getElementById("cartTrayDrawer").classList.add("open");
    document.getElementById("trayOverlay").classList.add("open");
    updateCustomerLockDisplay();
}

function closeTrayDrawer() {
    document.getElementById("cartTrayDrawer").classList.remove("open");
    document.getElementById("trayOverlay").classList.remove("open");
}

// ----------------- STEP 6: LIVE OPERATIONS (SHEETS + WHATSAPP) -----------------
function confirmAndSendOrder() {
    if (trayCart.length === 0) {
        alert("Your dining tray is empty!");
        return;
    }

    const phone = document.getElementById("customerPhoneInput").value.trim() || "+91 98460 12345";
    const subtotal = trayCart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const itemsSummary = trayCart.map(i => `${i.name} (x${i.qty})`).join(", ");
    const newOrderId = "ORD-" + Math.floor(1000 + Math.random() * 9000);
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newOrder = {
        orderId: newOrderId,
        restaurantId: restaurantConfig.id,
        tableNo: `Table 0${customerLockedTableNum}`,
        customerPhone: phone,
        itemsSummary: itemsSummary,
        totalPrice: subtotal,
        orderTime: nowTime,
        status: "Active & Cooking"
    };

    // 1. Add to live Google Sheets store
    liveOrdersLedger.unshift(newOrder);
    localStorage.setItem("laance_orders_ledger", JSON.stringify(liveOrdersLedger));

    // Dispatch to real Google Sheets Webhook
    const savedRest = JSON.parse(localStorage.getItem('laance_restaurant')) || {};
    const sheetUrl = savedRest.googleSheetId || localStorage.getItem('laance_restaurant_sheet_url');
    if (sheetUrl && sheetUrl.startsWith('http')) {
        const payload = {
            orderId: newOrder.orderId,
            tableNo: newOrder.tableNo,
            customerPhone: newOrder.customerPhone,
            itemsSummary: newOrder.itemsSummary,
            totalPrice: newOrder.totalPrice,
            orderTime: newOrder.orderTime,
            status: newOrder.status,
            type: 'new_order',
            data: newOrder,
            timestamp: new Date().toISOString()
        };
        try {
            fetch(sheetUrl, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload)
            });
        } catch(e) { console.log('Sheet dispatch error:', e); }
    }

    // 2. Clear Cart & Close Drawer
    trayCart = [];
    refreshTrayDisplay();
    closeTrayDrawer();

    // 3. Post to WhatsApp Live Feed
    dispatchWhatsAppAlert(newOrder);

    // 4. Advance to Step 6
    showToast(`Order #${newOrderId} sent to Kitchen & logged in Google Sheets!`);
    goToStepPage(6);
}

function dispatchWhatsAppAlert(order) {
    const stream = document.getElementById("phoneChatStream");
    if (!stream) return;

    const waText = `🍽️ *NEW ORDER - ${order.tableNo}*\nOrder ID: ${order.orderId}\nItems: ${order.itemsSummary}\nTotal: ₹${order.totalPrice.toFixed(2)}\nCustomer: ${order.customerPhone}`;
    const cleanNumber = restaurantConfig.whatsapp.replace(/[^0-9]/g, "");
    const directWaLink = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(waText)}`;

    const bubble = document.createElement("div");
    bubble.className = "whatsapp-bubble-view";
    bubble.innerHTML = `
        <div class="title">⚡ <b>NEW ORDER &middot; ${order.tableNo}</b></div>
        <div class="body">
            <b>Order ID:</b> ${order.orderId}<br>
            <b>Items:</b> ${order.itemsSummary}<br>
            <b>Total:</b> ₹${order.totalPrice.toFixed(2)}<br>
            <b>Customer:</b> ${order.customerPhone}<br>
            <a href="${directWaLink}" target="_blank" style="display:inline-block; margin-top:5px; color:#25d366; font-weight:700; text-decoration:underline;">
                📲 Open Real WhatsApp Chat &rarr;
            </a>
        </div>
        <div class="time">${order.orderTime} ✓✓</div>
    `;

    stream.prepend(bubble);
}

function renderSheetsTable() {
    const tbody = document.getElementById("sheetsOrdersTbody");
    if (!tbody) return;

    tbody.innerHTML = liveOrdersLedger.map((order, idx) => `
        <tr>
            <td style="color:#888;">${idx + 1}</td>
            <td><strong style="color:#d4af37;">${order.orderId}</strong></td>
            <td>${order.restaurantId}</td>
            <td><span style="background:#1e1e24; padding:3px 8px; border-radius:4px; font-weight:600;">${order.tableNo}</span></td>
            <td>${order.customerPhone}</td>
            <td style="max-width:280px; overflow:hidden; text-overflow:ellipsis;">${order.itemsSummary}</td>
            <td style="color:#10b981; font-weight:700;">₹${order.totalPrice.toFixed(2)}</td>
            <td>${order.orderTime}</td>
            <td><span style="color:#10b981;">● ${order.status}</span></td>
        </tr>
    `).join("");
}

function updateLiveStats() {
    const totalRev = liveOrdersLedger.reduce((sum, o) => sum + o.totalPrice, 0);
    const countEl = document.getElementById("statsOrdersCount");
    const revEl = document.getElementById("statsRevenueCount");
    const waAlertsEl = document.getElementById("statsWhatsAppCount");
    const waNumEl = document.getElementById("statsWhatsAppNumberDisplay");

    if (countEl) countEl.textContent = liveOrdersLedger.length;
    if (revEl) revEl.textContent = `₹${totalRev.toLocaleString()}`;
    if (waAlertsEl) waAlertsEl.textContent = liveOrdersLedger.length;
    if (waNumEl) waNumEl.textContent = restaurantConfig.whatsapp;
}

function injectSampleOrder() {
    const randomDish = dishesCatalog[Math.floor(Math.random() * dishesCatalog.length)];
    const tableNum = Math.floor(1 + Math.random() * 6);
    const newOrder = {
        orderId: "ORD-" + Math.floor(1000 + Math.random() * 9000),
        restaurantId: restaurantConfig.id,
        tableNo: `Table 0${tableNum}`,
        customerPhone: "+91 98" + Math.floor(10000000 + Math.random() * 89999999),
        itemsSummary: `${randomDish.name} (x1)`,
        totalPrice: randomDish.price,
        orderTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: "Active & Cooking"
    };

    liveOrdersLedger.unshift(newOrder);
    localStorage.setItem("laance_orders_ledger", JSON.stringify(liveOrdersLedger));
    dispatchWhatsAppAlert(newOrder);
    renderSheetsTable();
    updateLiveStats();
    showToast(`Test Order ${newOrder.orderId} added to Sheets and WhatsApp!`);
}

function triggerMidnightReport() {
    const totalRev = liveOrdersLedger.reduce((sum, o) => sum + o.totalPrice, 0);
    const stream = document.getElementById("phoneChatStream");
    if (!stream) return;

    const reportBubble = document.createElement("div");
    reportBubble.className = "whatsapp-bubble-view midnight-view";
    reportBubble.innerHTML = `
        <div class="title">🌙 <b>12:00 AM &middot; AUTOMATED DAILY SALES REPORT</b></div>
        <div class="body">
            🏪 <b>Restaurant:</b> ${restaurantConfig.name}<br>
            🍽️ <b>Total Orders:</b> ${liveOrdersLedger.length}<br>
            💰 <b>Total Gross Sales:</b> ₹${totalRev.toLocaleString()}<br>
            ⭐ <b>Loyalty Points Distributed:</b> ${Math.floor(totalRev / 100)} Pts<br>
            📊 <b>Google Sheets Sync:</b> 100% Up-to-Date
        </div>
        <div class="time">12:00 AM ✓✓</div>
    `;

    stream.prepend(reportBubble);
    showToast("12:00 AM Midnight WhatsApp Report Generated in Live Feed!");
}

// ----------------- TOAST UTILITY -----------------
function showToast(msg) {
    const toast = document.getElementById("toastNotification");
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => {
        toast.classList.remove("show");
    }, 3200);
}
