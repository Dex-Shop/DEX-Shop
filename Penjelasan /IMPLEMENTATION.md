# Draw Skin Shop - Implementation Guide

## 1. ANTI-SCREENSHOT PROTECTION SYSTEM

### Konsep Dasar

Tidak seperti implementasi client-side yang bisa di-bypass, sistem ini menggunakan backend rendering untuk proteksi maksimal:

```
Customer Request → Backend Canvas Render → Watermark Applied → Grid Pattern Added → Cache Headers Set → Send to Client
```

### Backend Implementation (server.js)

#### Endpoint `/api/images/protected`

```javascript
const canvas = createCanvas(width, height);
const ctx = canvas.getContext('2d');
```

**Step 1: Load Original Image**
- Terima base64 image dari frontend
- Decode menjadi buffer
- Load ke canvas menggunakan canvas library

**Step 2: Apply Text Watermark**
```javascript
const watermarkText = 'Draw Skin Shop';
ctx.font = 'bold 24px Arial';
ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';  // Opacity 15% = semi-transparent
ctx.globalAlpha = 0.08;  // Extra transparency untuk grid
```

Grid placement: 3x3 array across image
- Watermark di 9 posisi berbeda mencegah crop hanya 1 area
- Opacity rendah = tidak merusak view, tapi terlihat jelas di screenshot

**Step 3: Add Grid Pattern Overlay**
```javascript
for (let i = 0; i < width; i += 40) {
  ctx.beginPath();
  ctx.moveTo(i, 0);
  ctx.lineTo(i, height);
  ctx.stroke();
}
```

Pattern 40px grid mencegah seamless cut-out:
- Horizontal lines setiap 40px
- Vertical lines setiap 40px  
- Opacity: 5% = hampir invisible tapi muncul di screenshot/crop
- Prevents clean extraction

**Step 4: Security Headers**
```javascript
res.setHeader('X-Content-Type-Options', 'nosniff');
res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
res.setHeader('Pragma', 'no-cache');
res.setHeader('X-Frame-Options', 'DENY');
res.setHeader('Content-Security-Policy', 'script-src \'self\'');
```

- `no-cache`: Browser tidak boleh cache
- `X-Frame-Options`: Prevent embed di iframe
- `CSP`: Block inline scripts

### Frontend Implementation (index.html)

#### Canvas-based Image Rendering

Setiap skin card menggunakan `<canvas>` instead of `<img>`:

```html
<div class="thumb-box">
  <canvas id="thumb-${s.id}"></canvas>
</div>
```

Prevent right-click save:
```javascript
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('keydown', e => {
  if(e.key === 'PrintScreen' || 
     e.ctrlKey && e.shiftKey && e.key === 's' || 
     e.ctrlKey && e.key === 'p') 
    e.preventDefault();
});
```

#### CSS Protections

```css
img {
  pointer-events: none;
  -webkit-user-drag: none;
  user-drag: none;
  user-select: none;
  -webkit-user-select: none;
}
```

- `pointer-events: none`: Disable copy via drag
- `-webkit-user-select`: Prevent text selection
- CSS tidak bisa fully protect, tapi combine dengan backend + JS effective

### Why Backend Rendering?

| Protection Method | Security Level | Bypass Difficulty |
|------------------|---------------|--------------------|
| Pure CSS/JS | ⭐ Low | Trivial (DevTools) |
| Canvas + JS | ⭐⭐ Medium | Easy (screenshot tools) |
| Backend Rendering + Headers | ⭐⭐⭐⭐ High | Very Hard (require network proxy) |

Backend approach advantages:
1. Watermark applied sebelum client receive → tidak bisa remove via CSS
2. Grid pattern embedded di image pixel → permanent
3. Every request create new watermark → screenshot always include it
4. Security headers prevent caching → can't store locally

---

## 2. PAYMENT SYSTEM - WhatsApp Verification Flow

### Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│ Customer Browse Skins                               │
├─────────────────────────────────────────────────────┤
│ Click "Ambil Skin Ini" → Open Detail Modal          │
├─────────────────────────────────────────────────────┤
│ Click "Ambil Skin Ini" → Open Payment Modal         │
├─────────────────────────────────────────────────────┤
│ Show QRIS Image (from /api/images/qris)             │
│ Customer Scan QRIS, Transfer Money                  │
├─────────────────────────────────────────────────────┤
│ Click "Verifikasi via WhatsApp"                     │
│   ↓                                                  │
│ POST /api/orders/verify (save order state)          │
│ window.open(WhatsApp link with template message)    │
├─────────────────────────────────────────────────────┤
│ Admin Receive Message di WhatsApp                   │
│ Customer Upload Bukti QRIS di WhatsApp              │
├─────────────────────────────────────────────────────┤
│ Admin Login Dashboard → Orders Tab                  │
│ Review Order → Click "Approve" / "Reject"           │
├─────────────────────────────────────────────────────┤
│ If Approved: Order status = verified                │
│ If Rejected: Order deleted                          │
└─────────────────────────────────────────────────────┘
```

### Implementation Details

#### 1. QRIS Display (Frontend)

```javascript
function openPayment(id){
  // ... modal setup
  const overlay = document.createElement('div');
  overlay.innerHTML = `
    <div class="qris-img-wrap">
      <img src="/api/images/qris" alt="QRIS">
    </div>
  `;
  document.body.appendChild(overlay);
}
```

Flow:
- `<img src="/api/images/qris">` → GET request ke backend
- Backend cek file `public/qris.png` exist
- Jika ada: serve image dengan cache headers
- Jika tidak: generate placeholder canvas "QRIS belum di-upload"

#### 2. WhatsApp Contact Button

```javascript
function contactAdminVerify(id, name){
  const message = `Halo Admin Draw Skin Shop!\n\nAku mau verifikasi pembayaran untuk skin:\n*Nama Skin:* ${name}\n\nBerikut aku lampirkan bukti QRIS transfer-nya ya. Ditunggu file downloadnya!`;
  
  const waLink = `https://api.whatsapp.com/send?phone=${ADMIN_WA}&text=${encodeURIComponent(message)}`;
  window.open(waLink, '_blank');
}
```

**Message Template Structure:**
```
Halo Admin Draw Skin Shop!

Aku mau verifikasi pembayaran untuk skin:
*Nama Skin:* [Auto-filled]

Berikut aku lampirkan bukti QRIS transfer-nya ya. Ditunggu file downloadnya!
```

Customer workflow:
1. Click button → WhatsApp Web/App terbuka
2. Pre-filled message siap dikirim
3. Customer add screenshot QRIS transfer
4. Send message

#### 3. Order Tracking (Backend)

```javascript
app.post('/api/orders/verify', (req, res) => {
  const { orderId, skinName, amount } = req.body;
  
  let orders = [];
  if (fs.existsSync(ordersFile)) {
    orders = JSON.parse(fs.readFileSync(ordersFile, 'utf8'));
  }

  const order = {
    id: orderId || 'order_' + Date.now(),
    skinName,
    amount,
    status: 'pending',
    verifiedAt: null,
    createdAt: Date.now()
  };

  orders.push(order);
  fs.writeFileSync(ordersFile, JSON.stringify(orders, null, 2));
  
  res.json({ success: true, order });
});
```

**Data saved di `/data/orders.json`:**
```json
[
  {
    "id": "order_1234567890",
    "skinName": "Skin Naruto",
    "amount": 0,
    "status": "pending",
    "verifiedAt": null,
    "createdAt": 1690000000000
  }
]
```

#### 4. Admin Verification (Dashboard)

Admin login → Orders tab:

```javascript
function renderOrdersList(){
  let orders = JSON.parse(localStorage.getItem(LS_ORDERS) || '[]');
  
  const list = document.getElementById('orders-list');
  list.innerHTML = orders.length ? orders.map(o => `
    <div class="admin-list-item">
      <div class="info">
        <div class="name">${o.skinName}</div>
        <div class="meta">ID: ${o.id} | Status: ${o.status}</div>
      </div>
      <div class="actions">
        <button class="btn-sm" onclick="approveOrder('${o.id}')">✅ Approve</button>
        <button class="btn-sm btn-danger" onclick="rejectOrder('${o.id}')">❌ Reject</button>
      </div>
    </div>
  `).join('') : '<div>Belum ada order</div>';
}

function approveOrder(id){
  let orders = JSON.parse(localStorage.getItem(LS_ORDERS) || '[]');
  const o = orders.find(x => x.id === id);
  if(o){
    o.status = 'approved';
    o.verifiedAt = Date.now();
    localStorage.setItem(LS_ORDERS, JSON.stringify(orders));
    renderOrdersList();
    showToast('✅ Order disetujui');
  }
}
```

Admin actions:
- **Approve**: Change status dari "pending" → "approved", set verifiedAt timestamp
- **Reject**: Delete order dari list

### Color Scheme Rationale

**Why Cream + Abu-abu?**

Old color (Dark mode):
```css
--bg: #0a0b0f (deep black)
--text: #eceef3 (light)
```

New color (Light mode):
```css
--bg: #f5f3f0 (cream/warm white)
--card: #a8a39c (warm gray/brown)
--text: #2a2622 (dark brown)
```

Benefits:
1. **Reduces eye strain** - Cream background lebih lembut dari pure white
2. **Better contrast** - Dark brown text on cream lebih readable than light text on dark
3. **Professional look** - Warm palette lebih sophisticated
4. **AMOLED friendly** - Less power drain pada dark OLED screens (bukan pure black)
5. **Print-friendly** - Jika customer print, color jadi natural

### Configuration Files

#### Admin Settings (localStorage)

```javascript
// Default values
localStorage.ADMIN_WA = '6285236894690';
localStorage.DRAW_THANKS_MSG = 'Makasih udah dukung, semoga suka skinnya!';
localStorage.ADMIN_PASS_DSS = 'admin123';
```

Admin bisa update via Settings tab tanpa hardcode ulang.

---

## 3. QRIS MANAGEMENT

### Upload Flow (Admin)

1. Admin login → Payment tab
2. Select QRIS image file
3. Preview render di modal
4. Click "Upload QRIS"
5. File dibaca via FileReader API
6. Convert to base64
7. Save ke localStorage dengan key `DRAW_QRIS`
8. Frontend next request GET `/api/images/qris` → return image

### Backend QRIS Serving

```javascript
app.get('/api/images/qris', (req, res) => {
  const qrisPath = path.join(__dirname, 'public', 'qris.png');
  
  if (!fs.existsSync(qrisPath)) {
    // Generate placeholder
    const canvas = createCanvas(300, 300);
    // ... render placeholder text
    res.send(canvas.toBuffer('image/png'));
  } else {
    res.sendFile(qrisPath);  // Serve actual file
  }
});
```

**Dual mode:**
- **File exists**: Serve dari disk dengan cache headers
- **File not found**: Generate placeholder "QRIS belum di-upload"

### Production QRIS Management

Untuk production, gunakan cloud storage:

```javascript
// AWS S3 example
const AWS = require('aws-sdk');
const s3 = new AWS.S3();

app.post('/api/qris/upload', async (req, res) => {
  const params = {
    Bucket: 'draw-skin-shop',
    Key: 'qris.png',
    Body: req.body.imageBuffer,
    ContentType: 'image/png'
  };
  
  await s3.upload(params).promise();
  res.json({ url: `https://s3.amazonaws.com/draw-skin-shop/qris.png` });
});
```

---

## 4. DATA PERSISTENCE STRATEGY

### Current: File-based (JSON)

```
/data/
├── skins.json     - [{ id, name, category, desc, thumb, featured, likes, sold, createdAt }]
├── orders.json    - [{ id, skinName, amount, status, verifiedAt, createdAt }]
└── (lainnya)
```

**Advantages:**
- Zero setup, works immediately
- Portable, easy to backup
- No server dependencies

**Limitations:**
- Not scalable untuk banyak concurrent users
- File locking issues
- No transactions
- Hard to query

### Recommended: MongoDB Migration

```javascript
const mongoose = require('mongoose');

const SkinSchema = new mongoose.Schema({
  name: String,
  category: String,
  description: String,
  imageUrl: String,
  featured: Boolean,
  likes: { type: Number, default: 0 },
  sold: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const OrderSchema = new mongoose.Schema({
  skinId: mongoose.Schema.Types.ObjectId,
  skinName: String,
  amount: Number,
  status: { type: String, enum: ['pending', 'approved', 'rejected'] },
  verifiedAt: Date,
  createdAt: { type: Date, default: Date.now }
});
```

Benefits:
- Scalable untuk production
- Better query capabilities
- Built-in validation
- Replication/backup support

---

## 5. SECURITY CHECKLIST

### Input Validation
- [ ] Validate file size sebelum upload
- [ ] Check file type (whitelist PNG/JPG only)
- [ ] Sanitize skin name (prevent XSS)
- [ ] Rate limit API endpoints

### Authentication
- [ ] Implement JWT untuk admin sessions
- [ ] Add 2FA (WhatsApp OTP?)
- [ ] Secure admin password storage (bcrypt)
- [ ] Session timeout

### Data Protection
- [ ] HTTPS only (no HTTP)
- [ ] Encrypt sensitive data at rest
- [ ] Backup strategy (daily snapshots)
- [ ] GDPR compliance (delete user data option)

### API Security
- [ ] CORS configured correctly
- [ ] Request size limits
- [ ] SQL injection prevention (N/A untuk JSON, tapi penting untuk DB migration)
- [ ] CSRF tokens untuk form submissions

---

## 6. DEPLOYMENT CHECKLIST

### Pre-deployment
- [ ] Test all endpoints locally
- [ ] Verify WhatsApp link works on mobile
- [ ] Test QRIS upload/download
- [ ] Check admin login security
- [ ] Verify watermark visible di screenshot

### Environment Setup
- [ ] Set NODE_ENV=production
- [ ] Use environment variables (.env file)
- [ ] Configure CORS untuk domain production
- [ ] Setup HTTPS certificate

### Monitoring
- [ ] Enable error logging (Winston/Morgan)
- [ ] Setup uptime monitoring
- [ ] Database backup automation
- [ ] Alert system untuk errors

---

## 7. FUTURE ENHANCEMENTS

1. **Payment Gateway Integration**
   - Xendit/Midtrans untuk auto-verify
   - Reduce manual WhatsApp verification

2. **Mobile App**
   - React Native app untuk better control
   - Push notifications untuk order updates

3. **Analytics Dashboard**
   - Track popular skins
   - Revenue charts
   - Customer analytics

4. **Multi-language Support**
   - English interface option
   - i18n system

5. **Rating System**
   - Customer reviews untuk skins
   - Seller rating

---

**Last Updated**: July 2026
**Version**: 1.0.0 (Backend Enhanced)
