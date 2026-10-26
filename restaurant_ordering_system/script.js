// script.js – Simple client for order form
// Assumes a published Google Apps Script web‑app endpoint at /exec that
// returns the menu as JSON and accepts POSTed orders.

const MENU_ENDPOINT = "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?cmd=getMenu";
const ORDER_ENDPOINT = "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?cmd=submitOrder";

// Utility to get query param (e.g., table number from QR URL)
function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

document.addEventListener("DOMContentLoaded", async () => {
  const tableInput = document.getElementById("tableNo");
  const menuContainer = document.getElementById("menuContainer");

  // Pre‑fill table number if present in URL
  const tableFromUrl = getQueryParam("table");
  if (tableFromUrl) {
    tableInput.value = tableFromUrl;
  }

  // Load menu data
  try {
    const resp = await fetch(MENU_ENDPOINT);
    const menu = await resp.json(); // [{id, name, price, category}, ...]
    renderMenu(menu);
  } catch (e) {
    menuContainer.innerHTML = "<p>Failed to load menu.</p>";
    console.error(e);
  }

  // Handle form submit
  document.getElementById("orderForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const order = collectOrder();
    if (!order) return;
    try {
      const resp = await fetch(ORDER_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order),
      });
      const result = await resp.json();
      alert(result.message || "Order submitted!");
    } catch (err) {
      alert("Failed to submit order.");
      console.error(err);
    }
  });
});

function renderMenu(menu) {
  const container = document.getElementById("menuContainer");
  const categories = {};
  menu.forEach((item) => {
    if (!categories[item.category]) categories[item.category] = [];
    categories[item.category].push(item);
  });
  for (const cat of Object.keys(categories)) {
    const catDiv = document.createElement("div");
    const heading = document.createElement("h3");
    heading.textContent = cat;
    catDiv.appendChild(heading);
    categories[cat].forEach((item) => {
      const div = document.createElement("div");
      div.className = "menu-item";
      div.innerHTML = `
        <span>${item.name} – ₹${item.price}</span>
        <select data-price="${item.price}" data-id="${item.id}">
          <option value="0">0</option>
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
        </select>
      `;
      container.appendChild(div);
    });
  }
}

function collectOrder() {
  const tableNo = document.getElementById("tableNo").value.trim();
  if (!tableNo) {
    alert("Please enter table number.");
    return null;
  }
  const selections = [];
  document.querySelectorAll("select[data-id]").forEach((sel) => {
    const qty = parseInt(sel.value, 10);
    if (qty > 0) {
      selections.push({
        itemId: sel.dataset.id,
        quantity: qty,
        price: parseFloat(sel.dataset.price),
      });
    }
  });
  if (selections.length === 0) {
    alert("Select at least one item.");
    return null;
  }
  const total = selections.reduce((sum, s) => sum + s.price * s.quantity, 0);
  return {
    restaurantId: "1", // static for demo; replace with real ID
    tableNo,
    items: selections,
    totalAmount: total,
    timestamp: new Date().toISOString(),
  };
}
