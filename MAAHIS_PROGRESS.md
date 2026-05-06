# Maahis + Neetu Designer Boutiques — AI Middleware Progress Log
Last updated: May 6, 2026

---

## ✅ EVERYTHING LIVE & WORKING

### Railway Cloud Server v4.1
- **URL**: https://maahis-production.up.railway.app
- **Dashboard**: https://maahis-production.up.railway.app/dashboard
- **Permanent — no ngrok, no restarts needed**

### Core Middleware
- New order webhook: `POST /api/new-order` ✅
- Status update webhook: `POST /api/status-update` ✅
- Both Maahi's + Neetu's supported via `boutique_id`

### Dashboard (boutique_dashboard_v3.html)
- Live orders (polls every 5s) ✅
- Amount + Advance Paid + Balance ✅
- Status badges + copy tracking link + WA button ✅
- Live Agent Activity Feed ✅
- Reports ✅
- **Leads tab** ✅ — New customer enquiries shown here

### AI Agents (server.js)
- Order Status Agent ✅
- Payment/Balance Agent ✅
- **Enquiry Agent** ✅ — New customers, pricing, booking
- Owner Query Agent ✅
- Off-topic deflection ✅
- Chat logs in dashboard ✅

### Enquiry Agent — Knowledge Base (MAAHIS_KB)
- Blouse: ₹800–₹950 onwards | Suit: ₹1000 | Gown: ₹1250 | Lehenga: ₹2500
- Turnaround: 3–5 days basic, 10–15 days bridal/designer
- Express available | Doorstep pickup/delivery | Ships worldwide
- Aari, maggam, mirror, zardosi, machine embroidery
- Free alteration within 2 days of delivery

### Leads System ✅
- Enquiry Agent auto-captures leads (name + interest) to PostgreSQL
- Owner gets WhatsApp alert for hot leads
- Dashboard Leads tab: New / Followed Up / Converted / Lost

### Customer Auth — Threadoria App ✅ (v4.1 — added May 6)
- `POST /api/customer/register` — phone + name + 6-digit PIN
- `POST /api/customer/login` — returns customer profile + all orders
- `GET  /api/customer/orders/:phone` — order list with tracking links
- `GET  /api/customer/profile/:phone` — profile info
- `PATCH /api/customer/profile/:phone` — update name or PIN
- `customers` table created in PostgreSQL

---

## ⏳ PENDING (Out of our control)

### WhatsApp Auto-Send (Error 133010)
- Code is ready and deployed
- **Blocked by**: Meta WhatsApp Business account under review
- Both Maahi's + Neetu's Meta accounts currently under review
- Will auto-work once Meta clears the review — no action needed from us

---

## 📱 THREADORIA APP (Emergent)
- App name: **Threadoria** | Slug: threadoria
- Bundle ID: com.threadoria.boutique
- Login screen: Mobile Number + 6-digit PIN
- Covers both boutiques (Maahi's + Neetu's)
- APK build in progress (as of May 6, 2026)
- Backend: Railway server at https://maahis-production.up.railway.app

---

## 🔑 KEY CREDENTIALS & CONFIG

| Item | Value |
|------|-------|
| Railway URL | https://maahis-production.up.railway.app |
| WhatsApp Phone ID (Maahi's) | 1047193258471852 |
| Verify Token | maahis_webhook_2024 |
| Emergent API Key | sk-emergent-d36F60d0dC8F919183 |
| Local folder | ~/Desktop/maahis-middleware |

---

## 🔄 HOW TO REDEPLOY

```bash
cd ~/Desktop/maahis-middleware
railway up
# Select "maahis" service → Enter
```

---

## 📁 KEY FILES

| File | Purpose |
|------|---------|
| server.js | Main Node.js middleware (v4.1) |
| boutique_dashboard_v3.html | Owner dashboard |
| orders_store.json | Local order cache (Railway has primary copy) |
| .env | Environment variables |
| MAAHIS_PROGRESS.md | This file — session memory |
| threadoria-app/ | React Native source (built via Emergent) |
