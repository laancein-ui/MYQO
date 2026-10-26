"""
MYQO / LAANCE SaaS Backend — Render Deployment
Real-time order pipeline: Supabase + Pusher Channels
"""

import os
import json
from datetime import datetime, timezone

from flask import Flask, request, jsonify
from flask_cors import CORS
import pusher
from dotenv import load_dotenv

load_dotenv()

# ─── Flask App ───────────────────────────────────────────────
app = Flask(__name__)

# Allow requests from your Cloudflare Pages frontend
FRONTEND_URL = os.getenv("FRONTEND_URL", "*")
CORS(app, origins=[FRONTEND_URL] if FRONTEND_URL != "*" else ["*"])

# ─── Pusher Client ───────────────────────────────────────────
pusher_client = pusher.Pusher(
    app_id=os.getenv("PUSHER_APP_ID"),
    key=os.getenv("PUSHER_KEY"),
    secret=os.getenv("PUSHER_SECRET"),
    cluster=os.getenv("PUSHER_CLUSTER", "ap2"),
    ssl=True
)

# ─── Supabase Client (optional — gracefully skip if not configured) ─
supabase = None
try:
    from supabase import create_client
    sb_url = os.getenv("SUPABASE_URL")
    sb_key = os.getenv("SUPABASE_KEY")
    if sb_url and sb_key:
        supabase = create_client(sb_url, sb_key)
        print("✅ Supabase connected")
    else:
        print("⚠️  Supabase not configured — orders will still broadcast via Pusher")
except Exception as e:
    print(f"⚠️  Supabase init skipped: {e}")


# ─── HEALTH CHECK ────────────────────────────────────────────
@app.route("/", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "service": "MYQO Real-Time Order API",
        "pusher": "connected",
        "supabase": "connected" if supabase else "not configured",
        "timestamp": datetime.now(timezone.utc).isoformat()
    })


# ─── SUBMIT NEW ORDER ───────────────────────────────────────
@app.route("/api/order", methods=["POST"])
def create_order():
    """
    Receives a new order from the customer frontend.
    1. Saves to Supabase (if configured)
    2. Triggers Pusher event → Kitchen screen gets instant alert
    """
    try:
        data = request.get_json(force=True)

        # Build order object
        order = {
            "order_id": data.get("orderId", f"ORD-{int(datetime.now().timestamp()) % 10000}"),
            "client_id": data.get("clientId", "DEFAULT"),
            "restaurant_id": data.get("restaurantId", "REST-01"),
            "table_no": data.get("tableNo", "Table 01"),
            "customer_phone": data.get("customerPhone", "N/A"),
            "items_summary": data.get("itemsSummary", ""),
            "items": data.get("items", []),
            "total_price": float(data.get("totalPrice", 0)),
            "order_time": data.get("orderTime", datetime.now().strftime("%I:%M %p")),
            "status": "Active & Cooking",
            "created_at": datetime.now(timezone.utc).isoformat()
        }

        # ── Step 1: Save to Supabase ──
        if supabase:
            try:
                supabase.table("orders").insert({
                    "order_id": order["order_id"],
                    "client_id": order["client_id"],
                    "restaurant_id": order["restaurant_id"],
                    "table_no": order["table_no"],
                    "customer_phone": order["customer_phone"],
                    "items_summary": order["items_summary"],
                    "items": json.dumps(order["items"]),
                    "total_price": order["total_price"],
                    "order_time": order["order_time"],
                    "status": order["status"],
                    "created_at": order["created_at"]
                }).execute()
                print(f"✅ Order {order['order_id']} saved to Supabase")
            except Exception as db_err:
                print(f"⚠️  Supabase save error: {db_err}")

        # ── Step 2: Trigger Pusher → Kitchen gets instant notification ──
        # This is the MAGIC LINE — delivers to kitchen screen in < 20ms!
        pusher_response = pusher_client.trigger(
            "orders",           # Channel name
            "new-order",        # Event name
            {
                "orderId": order["order_id"],
                "clientId": order["client_id"],
                "restaurantId": order["restaurant_id"],
                "tableNo": order["table_no"],
                "customerPhone": order["customer_phone"],
                "itemsSummary": order["items_summary"],
                "totalPrice": order["total_price"],
                "orderTime": order["order_time"],
                "status": order["status"]
            }
        )
        print(f"⚡ Pusher triggered for {order['order_id']}")

        return jsonify({
            "success": True,
            "message": f"Order {order['order_id']} received & dispatched to kitchen!",
            "orderId": order["order_id"]
        }), 201

    except Exception as e:
        print(f"❌ Order error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


# ─── UPDATE ORDER STATUS ────────────────────────────────────
@app.route("/api/order/<order_id>/status", methods=["PATCH"])
def update_order_status(order_id):
    """
    Kitchen staff marks order as Ready / Served.
    Pushes status update to all connected clients.
    """
    try:
        data = request.get_json(force=True)
        new_status = data.get("status", "Ready for Table")

        # Update in Supabase
        if supabase:
            try:
                supabase.table("orders").update({
                    "status": new_status
                }).eq("order_id", order_id).execute()
            except Exception as db_err:
                print(f"⚠️  Supabase update error: {db_err}")

        # Broadcast status change to all screens
        pusher_client.trigger("orders", "order-status-update", {
            "orderId": order_id,
            "status": new_status
        })

        return jsonify({"success": True, "orderId": order_id, "status": new_status})

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ─── GET ALL ORDERS (for initial page load) ─────────────────
@app.route("/api/orders", methods=["GET"])
def get_orders():
    """Fetch today's orders from Supabase for initial dashboard load."""
    try:
        if supabase:
            today = datetime.now().strftime("%Y-%m-%d")
            result = supabase.table("orders") \
                .select("*") \
                .gte("created_at", f"{today}T00:00:00") \
                .order("created_at", desc=True) \
                .execute()
            return jsonify({"success": True, "orders": result.data})
        else:
            return jsonify({"success": True, "orders": [], "note": "Supabase not configured"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ─── RUN ─────────────────────────────────────────────────────
if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
