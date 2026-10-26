# QR-Code Restaurant Ordering & Loyalty System – Full Plan

## 1. System Architecture & Components

- **Database Layer**: Google Sheets (Menu, Orders, Loyalty) – serves as the central data store.
- **Frontend (Customer Side)**: Simple web page served via static hosting. Customers scan a QR code at their table, which opens the order page with the table number pre‑filled.
- **Backend & Automation**: Google Apps Script attached to the sheets handles:
  - Order recording
  - Loyalty points calculation
  - Free‑food eligibility
  - Weekly summary email to the restaurant owner
  - WhatsApp/email notifications (optional via webhook)

## 2. Database Structure (Google Sheets)

| Sheet | Columns |
|-------|---------|
| **Menu** | `Item_ID`, `Item_Name`, `Category`, `Price`, `Restaurant_ID`, `Status`, `Offer_Active` |
| **Orders** | `Order_ID`, `Restaurant_ID`, `Table_No`, `Customer_ID`, `Items` (JSON), `Total_Amount`, `Order_Time`, `Status` |
| **Loyalty** | `Customer_ID`, `Total_Points`, `Free_Food_Eligibility` |

## 3. Core Features & Logic

### 3.1 Menu & Offer Management
- Restaurant owner logs into a **Management Dashboard** (Google Apps Script UI) to add/edit menu items, toggle availability, and set promotional offers.

### 3.2 QR‑Code Table Ordering
1. Generate a QR code per table: `https://<your‑domain>/order.html?restaurant=1&table=5`.
2. Customer scans, lands on the order page where the table number is pre‑filled.
3. Customer selects items, quantity, and submits.
4. Apps Script records the order in the **Orders** sheet and returns an order confirmation.

### 3.3 Loyalty & Free‑Food System
- For every ₹100 spent, award 1 loyalty point.
- When `Total_Points >= 500`, set `Free_Food_Eligibility = Yes` and show a *Free Dish* option on the next order.
- After a free dish is redeemed, reset points to `0`.

### 3.4 Notifications & Reporting
- **Instant Notification**: On order submit, Apps Script can trigger a webhook to a WhatsApp/Biz‑API or send an email to the kitchen.
- **Weekly Report**: Time‑driven trigger (`Every Sunday 11:00 AM`) compiles total revenue, number of orders, top‑selling items, and loyalty stats, then emails the owner.

## 4. Implementation Steps

1. **Create Google Sheet** – `Restaurant_Database` with the three tabs described above.
2. **Deploy Google Apps Script** – attach to the sheet, enable the following functions:
   - `recordOrder(e)` – called from the web app via `google.script.run`.
   - `calculateLoyalty(customerId, amount)` – updates points.
   - `sendWeeklyReport()` – email summary.
   - `sendNotification(order)` – optional WhatsApp/email webhook.
3. **Build Static Frontend** – `index.html`, `script.js`, `style.css` (see accompanying files). Host on any static site (GitHub Pages, Netlify, Firebase Hosting).
4. **Generate QR Codes** – use any free QR generator (e.g., `https://api.qrserver.com/v1/create-qr-code/?data=…`). Embed the QR image on each table.
5. **Configure Triggers** – in Apps Script UI, add a *Time‑driven* trigger for `sendWeeklyReport`.
6. **Test End‑to‑End** – place a test order, verify sheet entry, points update, and email receipt.

## 5. Deployment Checklist
- [ ] Google Sheet created with correct column headers.
- [ ] Apps Script deployed as a *Web App* (Execute as **Me**, Who has access: **Anyone**).
- [ ] Frontend files uploaded to a static host and the URL matches the QR code parameters.
- [ ] QR codes printed and placed at each table.
- [ ] Weekly reporting trigger active.
- [ ] Optional: WhatsApp webhook credentials configured.

---

*This markdown can be exported to PDF via any markdown‑to‑PDF tool (e.g., `pandoc`, VS Code extension, or online converters). The files in the `restaurant_ordering_system` folder constitute the full software package.*
