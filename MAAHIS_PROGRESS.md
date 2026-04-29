# Maahis Designer Boutique — AI Middleware Progress Log
Last updated: April 27, 2026

---

## 🚀 WHAT'S LIVE & WORKING

### Railway Cloud Server
- **URL**: https://maahis-production.up.railway.app
- **Dashboard**: https://maahis-production.up.railway.app/dashboard
- **Permanent — no ngrok, no restarts needed**
- Railway project ID: fe6466f2-499e-4d42-b400-2dd83ce8b753

### Emergent App → Middleware (Working)
- New order webhook: `POST /api/new-order` ✅
- Status update webhook: `POST /api/status-update` ✅
- Both updated in Emergent's server.py to point to Railway URL
- Tested: 200 OK with advance_paid in payload

### Dashboard (boutique_dashboard_v3.html)
- Shows all orders live (polls every 5 seconds) ✅
- Shows Amount + Advance Paid + Balance per order ✅
- Status badge per order ✅
- 📋 Copy tracking link button ✅
- 💬 WA button — opens WhatsApp web with pre-written message ✅
- Live Agent Activity Feed (Agents tab) ✅
- Report generation ✅

### Customer Tracking Page
- URL format: `https://maahis-production.up.railway.app/track/{phone}/{order_number}`
- Shows order status, item name, delivery date ✅
- Fixed to check local orderStore first (no more "Checking...") ✅
- All old ngrok tracking links updated to Railway URL ✅

### AI Agent (server.js)
- Order status agent ✅
- Payment/balance agent ✅
- Off-topic deflection ✅
- Chat logs stored in memory, viewable in dashboard Agents tab ✅
- `/api/chat-logs` endpoint ✅

---

## ⏳ WHAT'S PENDING / NOT YET BUILT

### 1. WhatsApp Auto-Send (Error 133010)
- Code is ready — when new order hits `/api/new-order`, it tries to send WhatsApp tracking link
- **Blocked by**: Meta WhatsApp Business account not registered (error 133010)
- **Fix needed**: Go to developers.facebook.com → WhatsApp → Getting Started → verify the number
- Phone ID in use: 1047193258471852

### 2. New Customer Enquiry Agent (NOT BUILT YET)
- Planned flow:
  - New customer texts WhatsApp → router detects no existing order → Enquiry Agent
  - Agent handles: pricing questions, services offered, booking requests
  - Collects: name, garment type, budget, timeline
  - Shows lead on dashboard for owner to follow up
- **Needs from Sakthi**: garment types offered + price ranges + turnaround time
- Will add to server.js router + new ENQUIRY_AGENT handler

### 3. advance_paid on Old Orders
- Old orders (before April 27 afternoon) have advance_paid = 0
- New orders from Emergent will carry correct advance_paid going forward
- Old ones need manual update or Emergent resync

---

## 🔑 KEY CREDENTIALS & CONFIG

| Item | Value |
|------|-------|
| Railway URL | https://maahis-production.up.railway.app |
| Groq API Key | GROQ_API_KEY_REDACTED |
| WhatsApp Phone ID | 1047193258471852 |
| WhatsApp Token | EAAeUwZB8SJCA... (in .env) |
| Verify Token | maahis_webhook_2024 |
| Emergent API Key | sk-emergent-d36F60d0dC8F919183 |
| Local folder | ~/Desktop/maahis-middleware |

---

## 📁 KEY FILES

| File | Purpose |
|------|---------|
| server.js | Main Node.js middleware server |
| boutique_dashboard_v3.html | Owner dashboard |
| orders_store.json | Persisted order data (Railway has its own copy) |
| .env | Environment variables |
| MAAHIS_PROGRESS.md | This file — session memory |

---

## 🔄 HOW TO REDEPLOY

```bash
cd ~/Desktop/maahis-middleware
railway up
# Select "maahis" service → Enter
```

---

## 📋 NEXT SESSION TODO

1. Build **Enquiry Agent** for new customers (pricing / services / booking)
   - Get garment list + price ranges from Sakthi first
2. Fix **WhatsApp 133010** — Meta Business verification
3. Test full end-to-end: new order → dashboard → WA tracking link to customer
4. Consider: add "Leads" tab to dashboard for new customer enquiries

---

## 💬 CUSTOMER FLOW (Already Built)

Existing customer texts WhatsApp → Middleware → Router → Order/Payment Agent → AI reply on WhatsApp → Logged in dashboard

## 💬 NEW CUSTOMER FLOW (To Build)

New customer texts → Router detects no order → Enquiry Agent → Answers pricing/services → Collects details → Lead shown on dashboard
