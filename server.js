/**
 * ╔═══════════════════════════════════════════════════════╗
 * ║   MAAHIS DESIGNER BOUTIQUE — AI AGENT SERVER v4.0    ║
 * ║   Real Emergent data · Tracking links · Proactive    ║
 * ║   Dashboard · Status Buttons · WhatsApp Auto-Send    ║
 * ╚═══════════════════════════════════════════════════════╝
 */

const express = require('express');
const Groq    = require('groq-sdk');
const path    = require('path');
require('dotenv').config();

const app  = express();
const cors = require('cors');
app.use(cors());
app.use(express.json());

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ── CONFIG ──────────────────────────────────────────────────
const EMERGENT_BASE   = process.env.EMERGENT_BASE_URL || 'https://app.emergent.sh';
const EMERGENT_KEY    = process.env.EMERGENT_API_KEY  || 'sk-emergent-d36F60d0dC8F919183';
const PUBLIC_URL      = process.env.PUBLIC_URL         || 'https://notices-opposite-priced-text.trycloudflare.com';
const PORT            = process.env.PORT               || 3000;
const WA_TOKEN        = process.env.WHATSAPP_TOKEN;
const WA_PHONE_ID     = process.env.WHATSAPP_PHONE_ID  || '1047193258471852';
const VERIFY_TOKEN    = process.env.VERIFY_TOKEN        || 'maahis_webhook_2024';

const MODEL_FAST = 'llama-3.1-8b-instant';
const MODEL_MAIN = 'llama-3.3-70b-versatile';

// ── EMERGENT API HELPER ─────────────────────────────────────
async function emergentFetch(path, method = 'GET', body = null) {
  const { default: fetch } = await import('node-fetch');
  const opts = {
    method,
    headers: {
      'Authorization': `Bearer ${EMERGENT_KEY}`,
      'x-api-key':     EMERGENT_KEY,
      'Content-Type':  'application/json'
    }
  };
  if (body) opts.body = JSON.stringify(body);
  try {
    const res  = await fetch(`${EMERGENT_BASE}${path}`, opts);
    const text = await res.text();
    try { return JSON.parse(text); }
    catch { return { raw: text, status: res.status }; }
  } catch (e) {
    return { error: e.message };
  }
}

// ── EMERGENT DATA FUNCTIONS ─────────────────────────────────

async function getOrdersByPhone(phone) {
  const clean = phone.replace(/\D/g, '');
  const attempts = await Promise.allSettled([
    emergentFetch(`/api/records?table=orders&phone=${clean}`),
    emergentFetch(`/api/data/orders?filter=phone:${clean}`),
    emergentFetch(`/api/v1/records/orders?phone=${clean}`),
    emergentFetch(`/api/orders?mobile=${clean}`)
  ]);
  for (const r of attempts) {
    if (r.status === 'fulfilled' && !r.value?.error) {
      const d = r.value;
      if (Array.isArray(d) && d.length > 0) return d;
      if (d?.records?.length) return d.records;
      if (d?.data?.length)    return d.data;
      if (d?.orders?.length)  return d.orders;
    }
  }
  return null;
}

async function getOrderByNumber(orderNumber) {
  const attempts = await Promise.allSettled([
    emergentFetch(`/api/records?table=orders&order_number=${orderNumber}`),
    emergentFetch(`/api/data/orders/${orderNumber}`),
    emergentFetch(`/api/v1/records/orders?order_id=${orderNumber}`)
  ]);
  for (const r of attempts) {
    if (r.status === 'fulfilled' && !r.value?.error) {
      const d = r.value;
      if (Array.isArray(d) && d.length > 0) return d[0];
      if (d?.record)       return d.record;
      if (d?.id || d?.order_number) return d;
    }
  }
  return null;
}

async function getCustomerByPhone(phone) {
  const clean = phone.replace(/\D/g, '');
  const attempts = await Promise.allSettled([
    emergentFetch(`/api/records?table=customers&phone=${clean}`),
    emergentFetch(`/api/data/customers?filter=phone:${clean}`),
    emergentFetch(`/api/v1/customers?mobile=${clean}`)
  ]);
  for (const r of attempts) {
    if (r.status === 'fulfilled' && !r.value?.error) {
      const d = r.value;
      if (Array.isArray(d) && d.length > 0) return d[0];
      if (d?.customer) return d.customer;
      if (d?.data)     return d.data;
    }
  }
  return null;
}

async function getAllActiveOrders() {
  const attempts = await Promise.allSettled([
    emergentFetch(`/api/records?table=orders&status=active`),
    emergentFetch(`/api/data/orders?filter=status:pending`),
    emergentFetch(`/api/v1/orders?status=in_progress`),
    emergentFetch(`/api/records?table=orders`)
  ]);
  for (const r of attempts) {
    if (r.status === 'fulfilled' && !r.value?.error) {
      const d = r.value;
      if (Array.isArray(d)) return d;
      if (d?.records) return d.records;
      if (d?.data)    return d.data;
    }
  }
  return [];
}

// ── WHATSAPP SENDER ──────────────────────────────────────────
async function sendWhatsApp(toPhone, message) {
  if (!WA_TOKEN) { console.log('[WA] No token — skipping send'); return { skipped: true }; }
  const { default: fetch } = await import('node-fetch');
  let phone = toPhone.replace(/\D/g, '');
  if (phone.startsWith('0')) phone = '91' + phone.slice(1);
  if (!phone.startsWith('91') && phone.length === 10) phone = '91' + phone;

  const payload = {
    messaging_product: 'whatsapp',
    to: phone,
    type: 'text',
    text: { body: message }
  };

  try {
    const res  = await fetch(`https://graph.facebook.com/v19.0/${WA_PHONE_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WA_TOKEN}`,
        'Content-Type':  'application/json'
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.messages) {
      console.log(`[WA ✓] Sent to ${phone} | msgId: ${data.messages[0]?.id}`);
    } else {
      console.log(`[WA ✗] Error:`, JSON.stringify(data));
    }
    return data;
  } catch (e) {
    console.error('[WA ERR]', e.message);
    return { error: e.message };
  }
}

// ── TRACKING LINK ────────────────────────────────────────────
function generateTrackingLink(phone, orderNumber) {
  const clean = phone.replace(/\D/g, '');
  return `${PUBLIC_URL}/track/${clean}/${orderNumber}`;
}

// ── STATUS EMOJI MAP ─────────────────────────────────────────
function getStatusEmoji(status) {
  const map = {
    'new':        '🆕 New Order',
    'received':   '✅ Order Received',
    'cutting':    '✂️  Cutting',
    'stitching':  '🧵 Stitching',
    'embroidery': '🌸 Embroidery',
    'trial':      '👗 Trial Ready',
    'finishing':  '✨ Final Finishing',
    'ready':      '📦 Ready for Pickup',
    'dispatched': '🚚 Dispatched',
    'delivered':  '🎉 Delivered'
  };
  return map[(status||'').toLowerCase()] || `📋 ${status}`;
}

// ── PERSISTENT ORDER STORE ───────────────────────────────────
const fs          = require('fs');
const { Pool }    = require('pg');
const ORDERS_FILE = path.join(__dirname, 'orders_store.json');

// ── POSTGRES (Railway) ────────────────────────────────────────
let pgPool = null;
if (process.env.DATABASE_URL) {
  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  pgPool.query(`
    CREATE TABLE IF NOT EXISTS chat_logs (
      id SERIAL PRIMARY KEY,
      timestamp TIMESTAMPTZ DEFAULT NOW(),
      phone TEXT,
      agent TEXT,
      intent TEXT,
      customer_msg TEXT,
      ai_reply TEXT,
      data JSONB
    )
  `).then(() => console.log('[PG] chat_logs table ready'))
    .catch(e => console.error('[PG] Table init error:', e.message));
}

function loadOrders() {
  try {
    if (fs.existsSync(ORDERS_FILE)) {
      const data = JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8'));
      console.log(`[STORE] Loaded ${data.length} orders from disk`);
      return data;
    }
  } catch(e) { console.error('[STORE] Load error:', e.message); }
  return [];
}

function saveOrders() {
  try { fs.writeFileSync(ORDERS_FILE, JSON.stringify(orderStore, null, 2)); }
  catch(e) { console.error('[STORE] Save error:', e.message); }
}

// ── MEMORY ──────────────────────────────────────────────────
const memory     = new Map();
const orderStore = loadOrders();

// ── CHAT LOG (in-memory + Postgres) ──────────────────────────
const chatLog = [];
async function addChatLog(entry) {
  const full = { ...entry, timestamp: new Date().toISOString() };
  chatLog.unshift(full);
  if (chatLog.length > 200) chatLog.pop();

  if (pgPool) {
    try {
      await pgPool.query(
        `INSERT INTO chat_logs (timestamp, phone, agent, intent, customer_msg, ai_reply, data)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          full.timestamp,
          full.phone   || null,
          full.agent   || null,
          full.intent  || null,
          full.customer_msg || null,
          full.ai_reply     || null,
          JSON.stringify(full)
        ]
      );
    } catch(e) { console.error('[PG] Insert error:', e.message); }
  }
}

function getHistory(phone)             { return memory.get(phone) || []; }
function saveHistory(phone, role, msg) {
  const h = getHistory(phone);
  h.push({ role, content: msg });
  if (h.length > 12) h.splice(0, 2);
  memory.set(phone, h);
}

// ── LEADS STORE (Supabase) ───────────────────────────────────
if (pgPool) {
  pgPool.query(`
    CREATE TABLE IF NOT EXISTS leads (
      id SERIAL PRIMARY KEY,
      timestamp TIMESTAMPTZ DEFAULT NOW(),
      phone TEXT,
      name TEXT,
      interest TEXT,
      message TEXT,
      status TEXT DEFAULT 'new',
      language TEXT DEFAULT 'en'
    )
  `).then(() => console.log('[PG] leads table ready'))
    .catch(e => console.error('[PG] Leads table error:', e.message));
}

async function saveLead({ phone, name, interest, message, language }) {
  if (!pgPool) return;
  try {
    await pgPool.query(
      `INSERT INTO leads (phone, name, interest, message, language)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT DO NOTHING`,
      [phone, name || null, interest || null, message || null, language || 'en']
    );
    console.log(`[LEAD] Saved: ${phone} | ${interest}`);
  } catch(e) { console.error('[PG] Lead save error:', e.message); }
}

// ── AGENT PROMPTS ────────────────────────────────────────────
const MAAHIS_KB = `
MAAHIS DESIGNER BOUTIQUE — KNOWLEDGE BASE
==========================================
Location: Guduvanchery (physical store) | Also available: Designer visits your home — book a slot!
Hours: Mon–Sat 10AM–8PM | Sunday: By appointment only
Contact: +91 8608080103 | Maps: https://maps.app.goo.gl/Da5gVYAxQKKh87u66

SERVICES & PRICING:
- Basic Blouse Stitching: ₹800 onwards
- Princess Cut Blouse: ₹950 onwards
- Designer Blouse: ₹900 onwards
- Full Suit Stitching: ₹1000 onwards
- Gown: ₹1250 onwards (varies by design)
- Full Lehenga Set: ₹2500 onwards (varies by design)
- Embroidery: Aari, maggam, mirror, zardosi, machine — prices on request
- Alterations: Only along with new orders
- Bulk/Bridal Party: Discounts available, contact us

TURNAROUND TIME:
- Basic orders: 3–5 working days
- Designer/bridal wear: 10–15 working days
- Express delivery: Available (extra charges apply)

KEY POLICIES:
- Bring your own fabric OR we have select fabrics available
- Reference images welcome (Pinterest, WhatsApp, etc.)
- Doorstep pickup & delivery available (charges may apply)
- Ships worldwide from boutique to your doorstep
- Free one-time alteration for fit issues within 2 days of delivery
- Measurements stored securely for future orders — no need to revisit!
- Appointment reschedule/cancel: 24 hours advance notice required

PAYMENT: UPI / Google Pay / PhonePe / Bank Transfer / Cash

GREETING: "Hello! I'm MaahisBot 🌸 Your personal fashion assistant from Maahis Designer Boutique. How can I help you today?"
`;

const SYSTEM = {
  router: `You are a strict message classifier for Maahis Designer Boutique (India).
Classify the message. Reply ONLY with valid JSON — no extra text:
{"agent":"<data|action|alert|owner|enquiry>","intent":"<ORDER_STATUS|MEASUREMENT|DELIVERY|PAYMENT|NEW_ORDER|TRACKING|COMPLAINT|OWNER_QUERY|STAFF_UPDATE|ENQUIRY|OFF_TOPIC>","summary":"<5 words>","is_new_customer":<true|false>}
- data     = existing customer wants order info, measurements, delivery date, tracking
- action   = wants to confirm, update, reschedule existing order
- alert    = complaint, angry, urgent, problem with existing order
- owner    = from boutique owner (reports, summaries)
- enquiry  = NEW customer asking about services, prices, booking, location, fabric, timelines — anything pre-order
- OFF_TOPIC = completely unrelated to boutique/clothing/fashion
Reply with JSON only.`,

  data: `You are the Data Agent for Maahis Designer Boutique, a premium women's fashion boutique in India owned by Sakthi.
STRICT RULES:
1. ONLY answer questions about Maahis boutique — orders, measurements, deliveries, payments. Nothing else.
2. If asked anything unrelated, say: "I can only help with your Maahis boutique orders 😊"
3. ALWAYS use the [LIVE DATA] section — never guess or invent order details.
4. If no data found, say: "I couldn't find your order. Please share your order number."
5. Reply in customer's language (English or Tamil). Short — WhatsApp format.
6. When giving tracking link, always show: Order # + tracking link together.
7. Warm, friendly tone. Use emojis naturally.`,

  action: `You are the Action Agent for Maahis Designer Boutique.
STRICT RULES:
1. Only handle boutique actions (order changes, delivery updates, confirmations).
2. Use REAL DATA from [LIVE DATA] only — never invent details.
3. Be clear. Confirm with ✅.
4. Reply in customer's language. WhatsApp format.
5. Nothing unrelated to boutique.`,

  alert: `You are the Alert Agent for Maahis Designer Boutique.
STRICT RULES:
1. Handle complaints, delays, urgent issues for boutique only.
2. Acknowledge the issue first. Then give clear next step.
3. For serious issues, start reply with [OWNER_ALERT].
4. Use REAL DATA from [LIVE DATA] only.
5. Stay calm, empathetic, solution-focused.`,

  owner: `You are the Owner Intelligence Agent reporting to Sakthi (boutique owner).
STRICT RULES:
1. Data-backed summaries only. No guessing.
2. Use REAL DATA from [LIVE DATA].
3. WhatsApp format with emoji sections.
4. Flag issues with ⚠️.
5. End with one clear recommended action.`,

  enquiry: `You are MaahisBot 🌸 — the warm, elegant virtual assistant for Maahis Designer Boutique, Chennai.
You help NEW customers discover our services, pricing, and book appointments.

KNOWLEDGE BASE:
${MAAHIS_KB}

STRICT RULES:
1. ONLY answer about Maahis boutique services — never go off-topic.
2. Detect language: if customer writes in Tamil, reply in Tamil. Otherwise reply in English.
3. Be warm, friendly, and elegant — like a boutique stylist, not a chatbot.
4. Use emojis naturally 🌸✨👗.
5. WhatsApp format — short paragraphs, no walls of text.
6. If customer asks to book/visit/order → ask for their NAME and what garment they need.
7. If customer shares name + interest → confirm you'll pass it to the team and alert Sakthi.
8. Never invent prices — always say "onwards" or "varies by design".
9. For location: always share the Google Maps link.
10. End EVERY first reply with: "Want to book a slot or get a custom quote? Just tell me your name and what you need! 😊"`
};

// ── ROUTER ──────────────────────────────────────────────────
async function routeMessage(message, isOwner) {
  if (isOwner) return { agent: 'owner', intent: 'OWNER_QUERY', summary: message.slice(0,40) };
  try {
    const res = await groq.chat.completions.create({
      model: MODEL_FAST, max_tokens: 100, temperature: 0,
      messages: [
        { role: 'system', content: SYSTEM.router },
        { role: 'user',   content: message }
      ]
    });
    return JSON.parse(res.choices[0].message.content.trim());
  } catch {
    return { agent: 'data', intent: 'GENERAL', summary: message.slice(0,40) };
  }
}

// ── FETCH LIVE DATA ─────────────────────────────────────────
async function buildLiveData(phone, intent) {
  const liveData = {};
  if (['ORDER_STATUS','DELIVERY','TRACKING','MEASUREMENT','PAYMENT','GENERAL'].includes(intent)) {
    const [orders, customer] = await Promise.all([
      getOrdersByPhone(phone),
      getCustomerByPhone(phone)
    ]);
    liveData.customer = customer;
    if (Array.isArray(orders)) {
      liveData.orders = orders.map(o => ({
        ...o,
        status_display: getStatusEmoji(o.status || o.order_status),
        tracking_link:  generateTrackingLink(phone, o.order_number || o.id)
      }));
    }
  }
  if (intent === 'OWNER_QUERY') {
    liveData.allActiveOrders = await getAllActiveOrders();
  }
  return liveData;
}

// ── AGENT REPLY ─────────────────────────────────────────────
async function getReply(agentName, phone, message, routeInfo, liveData) {
  const history = getHistory(phone);
  const dataCtx = Object.keys(liveData).length > 0
    ? `\n\n[LIVE DATA FROM EMERGENT APP]\n${JSON.stringify(liveData, null, 2)}\n[END LIVE DATA]`
    : '\n\n[LIVE DATA: No records found for this phone number]';

  const res = await groq.chat.completions.create({
    model: MODEL_MAIN, max_tokens: 400, temperature: 0.4,
    messages: [
      { role: 'system', content: SYSTEM[agentName] || SYSTEM.data },
      ...history,
      { role: 'user', content: `[Intent: ${routeInfo.intent}]\n\n${message}${dataCtx}` }
    ]
  });
  return res.choices[0].message.content.trim();
}

// ── TRACKING PAGE ────────────────────────────────────────────
app.get('/track/:phone/:orderNumber', async (req, res) => {
  const { phone, orderNumber } = req.params;

  // Check local orderStore first (Railway), then fall back to Emergent API
  const localOrder = orderStore.find(o => o.order_number === orderNumber);
  const order = localOrder || await getOrderByNumber(orderNumber);

  const status = order ? getStatusEmoji(order.status || order.order_status) : '📋 Order Received';
  const name   = order?.customer_name || order?.name || 'Customer';
  const item   = order?.order_type || order?.item || order?.product || order?.garment || 'Your Order';
  const due    = order?.delivery_date || order?.due_date || 'To be confirmed';

  res.send(`<!DOCTYPE html><html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Maahis Order Tracker</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',sans-serif;background:#0f0a1a;color:#f0e8f5;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
.card{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:20px;padding:32px;max-width:380px;width:100%}
.logo{font-size:26px;font-weight:800;background:linear-gradient(135deg,#f472b6,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:4px}
.tag{font-size:10px;color:rgba(255,255,255,.35);letter-spacing:2px;text-transform:uppercase;margin-bottom:28px}
.oid{font-size:11px;color:rgba(255,255,255,.35);margin-bottom:4px}
.item{font-size:20px;font-weight:700;margin-bottom:20px}
.box{background:rgba(244,114,182,.08);border:1px solid rgba(244,114,182,.2);border-radius:12px;padding:16px;margin-bottom:12px;text-align:center}
.blabel{font-size:10px;color:rgba(255,255,255,.35);letter-spacing:1px;text-transform:uppercase;margin-bottom:6px}
.bval{font-size:17px;font-weight:700;color:#f9a8c9}
.due{font-size:12px;color:rgba(255,255,255,.4);text-align:center;margin-top:12px}
.footer{font-size:10px;color:rgba(255,255,255,.2);text-align:center;margin-top:24px}
</style></head>
<body><div class="card">
<div class="logo">Maahis</div>
<div class="tag">Designer Boutique · Order Tracker</div>
<div class="oid">Order #${orderNumber}</div>
<div class="item">${item}</div>
<div class="box"><div class="blabel">Current Status</div><div class="bval">${status}</div></div>
<div class="due">📅 Expected: ${due}</div>
<div class="footer">Maahis Designer Boutique · Where Elegance Meets Perfection</div>
</div></body></html>`);
});

// ── MAIN CHAT WEBHOOK ────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  const { phone, message, owner = false } = req.body;
  if (!phone || !message)
    return res.status(400).json({ error: 'phone and message required' });

  console.log(`\n[IN]  ${phone} | owner:${owner} | "${message.slice(0,60)}"`);

  try {
    const route = await routeMessage(message, owner);
    console.log(`[→]   agent:${route.agent} | intent:${route.intent}`);

    if (route.intent === 'OFF_TOPIC') {
      return res.json({
        reply: "I can only help with Maahis boutique services, orders, and appointments 😊",
        agent: 'router', intent: 'OFF_TOPIC', phone
      });
    }

    // ── ENQUIRY AGENT ────────────────────────────────────────
    if (route.agent === 'enquiry' || route.intent === 'ENQUIRY') {
      const history = getHistory(phone);
      const res2 = await groq.chat.completions.create({
        model: MODEL_MAIN, max_tokens: 500, temperature: 0.5,
        messages: [
          { role: 'system', content: SYSTEM.enquiry },
          ...history,
          { role: 'user', content: message }
        ]
      });
      const reply = res2.choices[0].message.content.trim();

      saveHistory(phone, 'user', message);
      saveHistory(phone, 'assistant', reply);

      // ── LEAD CAPTURE: detect name + interest in message ──
      const lowerMsg = message.toLowerCase();
      const interestKeywords = ['blouse','suit','lehenga','gown','bridal','embroidery','aari','maggam','partywe','fitting','appointment','book','order','stitch'];
      const detectedInterest = interestKeywords.find(k => lowerMsg.includes(k));
      const nameMatch = message.match(/(?:my name is|i am|i'm|iam)\s+([A-Za-z]+)/i) ||
                        message.match(/^([A-Z][a-z]+)\s+(here|this side|speaking)/i);
      const detectedName = nameMatch ? nameMatch[1] : null;

      if (detectedInterest || detectedName) {
        await saveLead({
          phone,
          name: detectedName,
          interest: detectedInterest || 'general enquiry',
          message: message.slice(0, 300),
          language: route.language || 'en'
        });

        // Alert Sakthi on WhatsApp for hot leads
        if (detectedName && detectedInterest) {
          const alertMsg = `🌸 *New Lead Alert!*\n\n👤 Name: ${detectedName}\n📱 Phone: ${phone}\n👗 Interest: ${detectedInterest}\n💬 Message: "${message.slice(0,100)}"\n\n_Reply to follow up_`;
          await sendWhatsApp('918608080103', alertMsg);
        }
      }

      addChatLog({ phone, customer_msg: message, ai_reply: reply, agent: 'enquiry', intent: 'ENQUIRY' });
      console.log(`[OUT] ${reply.slice(0,100)}`);
      return res.json({ reply, agent: 'enquiry', intent: 'ENQUIRY', phone });
    }

    const liveData = await buildLiveData(phone, route.intent);
    console.log(`[DATA] keys: ${Object.keys(liveData).join(', ') || 'none'}`);

    const reply = await getReply(route.agent, phone, message, route, liveData);

    saveHistory(phone, 'user', message);
    saveHistory(phone, 'assistant', reply);

    // Log for dashboard activity viewer
    addChatLog({ phone, customer_msg: message, ai_reply: reply, agent: route.agent, intent: route.intent });

    console.log(`[OUT] ${reply.slice(0,100)}`);
    return res.json({ reply, agent: route.agent, intent: route.intent, phone });

  } catch (err) {
    console.error('[ERR]', err.message);
    return res.status(500).json({
      reply: "Sorry, technical issue. Please try again in a moment! 🙏",
      error: err.message
    });
  }
});

// ── STAFF STATUS UPDATE WEBHOOK ──────────────────────────────
app.post('/api/status-update', async (req, res) => {
  const { order_number, phone, new_status, customer_name } = req.body;
  console.log(`[STATUS UPDATE] #${order_number} → ${new_status}`);

  // Update in local orderStore too
  const local = orderStore.find(o => o.order_number === order_number);
  if (local) { local.status = new_status; saveOrders(); } // ← persist status change

  const trackLink = generateTrackingLink(phone, order_number);
  const whatsapp_message =
`Hi ${customer_name || 'there'}! 👋

Your Maahis order update:
📦 Order #${order_number}
${getStatusEmoji(new_status)}
🔗 Track: ${trackLink}

Questions? Just reply here 😊
— Maahis Designer Boutique`;

  let wa_result = null;
  if (phone) {
    wa_result = await sendWhatsApp(phone, whatsapp_message);
  }

  res.json({
    success: true,
    whatsapp_message,
    whatsapp_sent: !!wa_result?.messages,
    wa_result,
    phone, order_number, status: new_status, tracking_link: trackLink
  });
});

// ── NEW ORDER WEBHOOK (Emergent triggers this) ────────────────
app.post('/api/new-order', async (req, res) => {
  const { order_number, customer_phone, phone: _phone, customer_name, item, delivery_date } = req.body;
  const phone = _phone || customer_phone;
  if (!order_number || !phone)
    return res.status(400).json({ error: 'order_number and phone required' });

  console.log(`[NEW ORDER] #${order_number} | ${phone} | ${customer_name}`);

  // Check if order already exists
  const exists = orderStore.find(o => o.order_number === order_number);
  if (!exists) {
    orderStore.push({
      order_number,
      phone,
      customer_name,
      order_type: req.body.order_type || item || 'Order',
      amount: parseFloat(req.body.amount || 0),
      advance_paid: parseFloat(req.body.advance_paid || 0),
      notes: req.body.notes || '',
      status: 'received',
      source: 'emergent',
      created_at: new Date().toISOString(),
      tracking_link: generateTrackingLink(phone, order_number)
    });
    saveOrders(); // ← persist to disk immediately
  }

  const trackLink = generateTrackingLink(phone, order_number);
  const message =
`Hi ${customer_name || 'there'}! 🎉

Your order has been received at *Maahis Designer Boutique*!

📦 Order #${order_number}
👗 ${item || 'Your outfit'}
📅 Expected: ${delivery_date || "We will confirm soon"}
🆕 Status: Order Received

🔗 Track your order live:
${trackLink}

We'll update you at every step!
Thank you for choosing Maahis ✨
— Maahis Designer Boutique`;

  const wa_result = await sendWhatsApp(phone, message);

  res.json({
    success: true,
    message_sent: !!wa_result?.messages,
    tracking_link: trackLink,
    wa_result,
    order_number, phone, customer_name
  });
});

// ── ALL ORDERS (Emergent + Local merged) ─────────────────────
app.get('/api/all-orders', async (req, res) => {
  try {
    const emergentRaw = await getAllActiveOrders();
    const emergentOrders = (emergentRaw || []).map(o => {
      const localMatch = orderStore.find(l => l.order_number === (o.order_number || o.id));
      return {
        order_number:  o.order_number || o.id || 'N/A',
        customer_name: o.customer_name || o.name || 'Unknown',
        phone:         o.phone || o.mobile || '',
        order_type:    o.order_type || o.item || o.garment || 'Order',
        amount:        parseFloat(localMatch?.amount || o.amount || 0),
        advance_paid:  parseFloat(localMatch?.advance_paid || o.advance_paid || 0),
        status:        localMatch?.status || o.status || 'new',
        notes:         o.notes || '',
        source:        'emergent',
        created_at:    o.created_at || o.date || new Date().toISOString(),
        tracking_link: generateTrackingLink(o.phone || o.mobile || '', o.order_number || o.id || '')
      };
    });

    // Merge: local orders not already in Emergent
    const merged = [...emergentOrders];
    for (const local of orderStore) {
      if (!merged.find(e => e.order_number === local.order_number)) {
        merged.push({ ...local, source: local.source || 'local' });
      }
    }

    // Sort newest first
    merged.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json({
      orders: merged,
      total: merged.length,
      from_emergent: emergentOrders.length,
      from_local: merged.length - emergentOrders.length,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    // Fallback to local store if Emergent is unreachable
    res.json({
      orders: orderStore,
      total: orderStore.length,
      from_emergent: 0,
      from_local: orderStore.length,
      timestamp: new Date().toISOString(),
      warning: 'Emergent unreachable, showing local orders only'
    });
  }
});

// ── LIVE ORDERS FROM EMERGENT ONLY ──────────────────────────
app.get('/api/orders-live', async (req, res) => {
  const orders = await getAllActiveOrders();
  res.json({
    orders: (orders || []).map(o => ({
      order_number:  o.order_number || o.id || 'N/A',
      customer_name: o.customer_name || o.name || 'Unknown',
      phone:         o.phone || o.mobile || '',
      order_type:    o.item || o.garment || o.order_type || 'Order',
      amount:        parseFloat(o.amount || 0),
      status:        o.status || 'active',
      notes:         o.notes || '',
      source:        'emergent',
      tracking_link: generateTrackingLink(o.phone || o.mobile || '', o.order_number || o.id || '')
    }))
  });
});

// ── LOCAL ORDER STORE ─────────────────────────────────────────
app.get('/api/orders', (req, res) => res.json({ orders: orderStore }));

// ── PROACTIVE FOLLOWUP CHECK ─────────────────────────────────
app.get('/api/followup-check', async (req, res) => {
  const orders = await getAllActiveOrders();
  if (!orders?.length) return res.json({ message: 'No active orders', alerts: [] });

  const HOURS24 = 24 * 60 * 60 * 1000;
  const now     = Date.now();
  const alerts  = orders
    .filter(o => o.updated_at || o.last_updated)
    .filter(o => now - new Date(o.updated_at || o.last_updated).getTime() > HOURS24)
    .map(o => ({
      order_number: o.order_number || o.id,
      customer:     o.customer_name || o.name,
      phone:        o.phone || o.mobile,
      status:       o.status,
      hours_stale:  Math.floor((now - new Date(o.updated_at || o.last_updated).getTime()) / 3600000),
      alert:        `⚠️ Order #${o.order_number || o.id} (${o.customer_name}) stale for ${Math.floor((now - new Date(o.updated_at || o.last_updated).getTime()) / 3600000)}h`
    }));

  res.json({ total_active: orders.length, needs_attention: alerts.length, alerts });
});

// ── LEADS API ────────────────────────────────────────────────
app.get('/api/leads', async (req, res) => {
  if (!pgPool) return res.json({ leads: [], total: 0 });
  try {
    const result = await pgPool.query(
      `SELECT * FROM leads ORDER BY timestamp DESC LIMIT 100`
    );
    res.json({ leads: result.rows, total: result.rows.length });
  } catch(e) {
    console.error('[PG] Leads fetch error:', e.message);
    res.json({ leads: [], total: 0, error: e.message });
  }
});

app.patch('/api/leads/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!pgPool) return res.status(503).json({ error: 'DB not connected' });
  try {
    await pgPool.query(`UPDATE leads SET status=$1 WHERE id=$2`, [status, id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── OWNER DAILY REPORT ────────────────────────────────────────
app.get('/api/chat-logs', async (req, res) => {
  const agent = req.query.agent;
  if (pgPool) {
    try {
      const q = agent
        ? `SELECT data FROM chat_logs WHERE agent=$1 ORDER BY timestamp DESC LIMIT 200`
        : `SELECT data FROM chat_logs ORDER BY timestamp DESC LIMIT 200`;
      const params = agent ? [agent] : [];
      const result = await pgPool.query(q, params);
      const logs = result.rows.map(r => r.data);
      return res.json({ logs: logs.slice(0, 50), total: logs.length });
    } catch(e) { console.error('[PG] Read error:', e.message); }
  }
  // fallback to in-memory
  const logs = agent ? chatLog.filter(l => l.agent === agent) : chatLog;
  res.json({ logs: logs.slice(0, 50), total: logs.length });
});

app.get('/api/owner-report', async (req, res) => {
  try {
    // Use merged orders (local store has status updates + advance_paid)
    const allOrders = orderStore.length > 0 ? orderStore : (await getAllActiveOrders() || []);
    const summary = allOrders.map(o => ({
      order: o.order_number,
      customer: o.customer_name,
      item: o.order_type,
      amount: o.amount,
      advance_paid: o.advance_paid || 0,
      balance: (o.amount || 0) - (o.advance_paid || 0),
      status: o.status,
      date: o.created_at?.slice(0,10)
    }));
    const r = await groq.chat.completions.create({
      model: MODEL_MAIN, max_tokens: 600, temperature: 0.4,
      messages: [
        { role: 'system', content: SYSTEM.owner },
        { role: 'user',   content: `Generate a clear end-of-day business report for Maahis Designer Boutique. Include: total orders, revenue, pending payments, orders by status. Orders data:\n${JSON.stringify(summary)}` }
      ]
    });
    res.json({ report: r.choices[0].message.content.trim() });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── WHATSAPP WEBHOOK VERIFICATION ────────────────────────────
app.get('/webhook', (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[WA WEBHOOK] ✅ Verified by Meta');
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// ── WHATSAPP INCOMING MESSAGES ────────────────────────────────
app.post('/webhook', async (req, res) => {
  // Always respond 200 immediately so Meta doesn't retry
  res.sendStatus(200);

  try {
    const body = req.body;
    if (body.object !== 'whatsapp_business_account') return;

    const messages = body.entry?.[0]?.changes?.[0]?.value?.messages;
    if (!messages?.length) return;

    const msg  = messages[0];
    const from = msg.from; // customer's phone (e.g. "919876543210")
    const text = msg.type === 'text' ? msg.text?.body?.trim() : null;
    if (!text) return;

    console.log(`\n[WA IN] From: ${from} | "${text.slice(0, 80)}"`);

    // Check if owner is messaging (last 10 digits match a known owner number)
    const isOwner = false; // Extend later if needed

    // Route & reply
    const route = await routeMessage(text, isOwner);
    console.log(`[→] agent:${route.agent} intent:${route.intent}`);

    if (route.intent === 'OFF_TOPIC') {
      await sendWhatsApp(from, "I can only help with your Maahis boutique orders 😊");
      return;
    }

    const liveData = await buildLiveData(from, route.intent);
    const reply    = await getReply(route.agent, from, text, route, liveData);

    saveHistory(from, 'user',      text);
    saveHistory(from, 'assistant', reply);

    await sendWhatsApp(from, reply);
    console.log(`[WA OUT] → ${from} | "${reply.slice(0, 80)}"`);
  } catch (err) {
    console.error('[WA WEBHOOK ERR]', err.message);
  }
});

// ── DASHBOARD ─────────────────────────────────────────────────
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'boutique_dashboard_v3.html'));
});

// ── HEALTH ───────────────────────────────────────────────────
app.get('/health', (_, res) => res.json({
  status: 'ok', boutique: 'Maahis Designer Boutique', version: '4.0',
  whatsapp_configured: !!WA_TOKEN,
  features: ['live-emergent-data','merged-orders','dashboard','status-buttons','tracking-links','whatsapp-auto-send','proactive-alerts']
}));

// ── START ────────────────────────────────────────────────────
app.listen(PORT, () => console.log(`
╔═══════════════════════════════════════════════════╗
║   🛍️  Maahis AI Agent Server v4.0 — LIVE          ║
║   Dashboard : GET  /dashboard                     ║
║   All Orders: GET  /api/all-orders                ║
║   Chat      : POST /api/chat                      ║
║   NewOrder  : POST /api/new-order                 ║
║   Track     : GET  /track/:phone/:order           ║
║   Status    : POST /api/status-update             ║
║   Followup  : GET  /api/followup-check            ║
║   Report    : GET  /api/owner-report              ║
╚═══════════════════════════════════════════════════╝`));
