# Draw Skin Shop - Payment & Verification Flow

## COMPLETE PAYMENT SEQUENCE

### Diagram 1: Customer Payment Flow

```
┌──────────────────────────────────────────────────────────────────┐
│ CUSTOMER JOURNEY                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│ 1. BROWSE SKINS                                                  │
│    └─ Homepage loads with featured + catalog                    │
│       GET http://localhost:3000/                                │
│       Returns: index.html + localStorage persisted data        │
│                                                                  │
│ 2. SELECT SKIN                                                   │
│    └─ Click "Ambil Skin Ini" on any card                        │
│       Triggers: openDetail(skinId)                              │
│       Modal shows: Image, description, likes, sold count        │
│                                                                  │
│ 3. CLICK "AMBIL SKIN INI" BUTTON                               │
│    └─ Click button in detail modal                              │
│       Triggers: closeOverlay → openPayment(skinId)              │
│       New modal opens with QRIS payment section                 │
│                                                                  │
│ 4. VIEW QRIS CODE                                               │
│    └─ Payment modal displays QRIS image                         │
│       GET /api/images/qris                                      │
│       Backend response: PNG image from public/qris.png          │
│       Display: <img src="/api/images/qris">                    │
│                                                                  │
│ 5. SCAN & TRANSFER                                              │
│    └─ Customer manually:                                         │
│       - Open Gopay/Dana/QRIS app                               │
│       - Scan QR code shown on screen                           │
│       - Input nominal (bisa 0 untuk gratis, atau sesuai keinginan)
│       - Complete transfer                                      │
│                                                                  │
│ 6. CLICK "VERIFIKASI VIA WHATSAPP"                             │
│    └─ Click verification button in payment modal               │
│       Triggers: contactAdminVerify(skinId, skinName)            │
│                                                                  │
│       STEP 6a: Log Order to Backend                            │
│       POST /api/orders/verify                                  │
│       Request body: {                                           │
│         orderId: "ord_1690000000000",                          │
│         skinName: "Skin Naruto",                               │
│         amount: 0                                              │
│       }                                                         │
│       Response: { success: true, order: {...} }               │
│       File: /data/orders.json updated with new order          │
│                                                                  │
│       STEP 6b: Open WhatsApp                                   │
│       URL Template:                                            │
│       https://api.whatsapp.com/send?phone={ADMIN_WA}&text=...  │
│                                                                  │
│       Pre-filled Message:                                      │
│       "Halo Admin Draw Skin Shop!                             │
│                                                                  │
│        Aku mau verifikasi pembayaran untuk skin:              │
│        *Nama Skin:* Skin Naruto                               │
│                                                                  │
│        Berikut aku lampirkan bukti QRIS transfer-nya ya.       │
│        Ditunggu file downloadnya!"                            │
│                                                                  │
│       Window opens: window.open(waLink, '_blank')             │
│       Toast shows: "Silakan lampirkan bukti QRIS di WhatsApp!"│
│       Modal closes: closeOverlay('pay-overlay')               │
│                                                                  │
│ 7. UPLOAD PROOF IN WHATSAPP                                    │
│    └─ WhatsApp Web/App opens (mobile)                          │
│       - Message pre-filled with order details                 │
│       - Customer click "+" → upload screenshot                │
│       - Attach QRIS transfer screenshot                       │
│       - Send message to admin                                 │
│                                                                  │
│ *** CUSTOMER WAITING PERIOD ***                                │
│ └─ Customer waits for admin approval (usually 5-30 min)       │
│    Skin sold count increments immediately                      │
│    Order visible in admin dashboard as "pending"              │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Diagram 2: Admin Verification Flow

```
┌──────────────────────────────────────────────────────────────────┐
│ ADMIN DASHBOARD VERIFICATION                                     │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│ 1. RECEIVE WHATSAPP NOTIFICATION                               │
│    └─ Phone: Admin receives message from customer              │
│       Message format:                                          │
│       "Halo Admin...[skin name]...[QRIS screenshot attached]"  │
│                                                                  │
│ 2. LOGIN ADMIN DASHBOARD                                        │
│    └─ Open: http://yourdomain.com/admin.html                  │
│       Prompt: Enter admin password                             │
│       Valid passwords: stored in localStorage                 │
│       Key: ADMIN_PASS_DSS                                     │
│       Default: admin123                                       │
│                                                                  │
│ 3. NAVIGATE TO ORDERS TAB                                      │
│    └─ Click "✅ Orders" tab in admin dashboard                │
│       Displays: renderOrdersList()                            │
│       Data source: localStorage[LS_ORDERS]                    │
│       Shows: All pending orders from /data/orders.json        │
│                                                                  │
│       Each order displays:                                     │
│       - Skin Name                                             │
│       - Order ID (ord_TIMESTAMP)                              │
│       - Current Status (pending/approved/rejected)            │
│       - Timestamp created                                     │
│       - [✅ Approve] button                                   │
│       - [❌ Reject] button                                    │
│                                                                  │
│ 4. VERIFY QRIS TRANSFER                                        │
│    └─ Admin checks WhatsApp:                                   │
│       - Open screenshot from customer                         │
│       - Verify amount matches expected                        │
│       - Check timestamp (within reasonable time)              │
│       - Check transaction ID/reference                        │
│       - If verified → APPROVE                                │
│       - If suspicious → REJECT                               │
│                                                                  │
│ 5a. APPROVE ORDER                                              │
│    └─ Click [✅ Approve] button                               │
│       Triggers: approveOrder(orderId)                          │
│                                                                  │
│       Backend Action:                                         │
│       1. Load orders from localStorage[LS_ORDERS]            │
│       2. Find order with matching ID                         │
│       3. Update order object:                                │
│          - status: 'pending' → 'approved'                    │
│          - verifiedAt: Date.now()                            │
│       4. Save back to localStorage                          │
│       5. Re-render orders list                              │
│       6. Show toast: "✅ Order disetujui"                    │
│                                                                  │
│       Frontend Result:                                        │
│       - Order disappears from pending list (optional)        │
│       - Or shows status changed to "approved"                │
│       - Admin can reply via WhatsApp with download link      │
│                                                                  │
│ 5b. REJECT ORDER                                               │
│    └─ Click [❌ Reject] button                                │
│       Triggers: rejectOrder(orderId)                          │
│                                                                  │
│       Backend Action:                                         │
│       1. Load orders from localStorage                       │
│       2. Filter out order with matching ID                  │
│       3. Save filtered list back                            │
│       4. Re-render list                                     │
│       5. Show toast: "❌ Order ditolak"                       │
│                                                                  │
│       Frontend Result:                                        │
│       - Order removed from dashboard                         │
│       - Admin should reply via WhatsApp with reason          │
│       - (Optional) Revert skin sold count +1                │
│                                                                  │
│ 6. CONTACT CUSTOMER VIA WHATSAPP                              │
│    └─ Click link to WhatsApp admin number                     │
│       Option 1 (Approved):                                    │
│       "Pembayaran anda sudah kami verifikasi. Berikut        │
│        link download skin: [link]"                           │
│                                                                  │
│       Option 2 (Rejected):                                    │
│       "Maaf, transfer anda belum kami terima/ada masalah.     │
│        Silakan coba lagi atau hubungi kami."                │
│                                                                  │
│ *** VERIFICATION COMPLETE ***                                  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## TECHNICAL DATA FLOW

### Request/Response Sequences

#### Sequence 1: Upload QRIS (Admin)

```javascript
// FRONTEND
const file = document.getElementById('qris-file').files[0];
const reader = new FileReader();
reader.onload = (e) => {
  const base64Data = e.target.result;  // data:image/png;base64,...
  localStorage.setItem(LS_QRIS, base64Data);
  showToast('✅ QRIS berhasil diupload!');
};
reader.readAsDataURL(file);

// STORAGE
localStorage['DRAW_QRIS'] = 'data:image/png;base64,iVBORw0KGgoAAAANS...'
```

#### Sequence 2: Display QRIS (Customer)

```javascript
// FRONTEND
function openPayment(id) {
  overlay.innerHTML = `
    <div class="qris-img-wrap">
      <img src="/api/images/qris" alt="QRIS">
    </div>
  `;
}

// NETWORK REQUEST
GET http://localhost:3000/api/images/qris

// BACKEND HANDLING
app.get('/api/images/qris', (req, res) => {
  const qrisPath = path.join(__dirname, 'public', 'qris.png');
  
  if (!fs.existsSync(qrisPath)) {
    // Generate placeholder
    const canvas = createCanvas(300, 300);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 300, 300);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('QRIS', 150, 135);
    ctx.fillText('belum di-upload', 150, 165);
    
    const buffer = canvas.toBuffer('image/png');
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'max-age=3600');
    res.send(buffer);
  } else {
    res.setHeader('Cache-Control', 'max-age=3600');
    res.sendFile(qrisPath);
  }
});

// BROWSER RENDERS
<img src="/api/images/qris" alt="QRIS">
// Display either actual QRIS atau placeholder
```

#### Sequence 3: WhatsApp Verification

```javascript
// FRONTEND - contactAdminVerify()
const ADMIN_WA = '6285236894690';
const message = `Halo Admin Draw Skin Shop!

Aku mau verifikasi pembayaran untuk skin:
*Nama Skin:* ${name}

Berikut aku lampirkan bukti QRIS transfer-nya ya. Ditunggu file downloadnya!`;

const waLink = `https://api.whatsapp.com/send?phone=${ADMIN_WA}&text=${encodeURIComponent(message)}`;

// BACKEND - Record Order
fetch('/api/orders/verify', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    orderId: 'ord_' + Date.now(),
    skinName: name,
    amount: 0
  })
})
.then(r => r.json())
.catch(e => console.error(e));

// BACKEND HANDLER
app.post('/api/orders/verify', (req, res) => {
  const { orderId, skinName, amount } = req.body;
  
  let orders = [];
  const ordersFile = path.join(__dirname, 'data', 'orders.json');
  
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

// FILESYSTEM
/data/orders.json updated:
[
  {
    "id": "ord_1690000000000",
    "skinName": "Skin Naruto",
    "amount": 0,
    "status": "pending",
    "verifiedAt": null,
    "createdAt": 1690000000000
  }
]

// BROWSER ACTION
window.open(waLink, '_blank');
// Opens WhatsApp Web/App with pre-filled message
```

#### Sequence 4: Admin Approval

```javascript
// FRONTEND - approveOrder()
function approveOrder(id) {
  let orders = JSON.parse(localStorage.getItem(LS_ORDERS) || '[]');
  const o = orders.find(x => x.id === id);
  
  if (o) {
    o.status = 'approved';
    o.verifiedAt = Date.now();
    localStorage.setItem(LS_ORDERS, JSON.stringify(orders));
    renderOrdersList();
    showToast('✅ Order disetujui');
  }
}

// STORAGE CHANGE
Before: { id: 'ord_...', status: 'pending', verifiedAt: null, ... }
After:  { id: 'ord_...', status: 'approved', verifiedAt: 1690000005000, ... }

// UI UPDATE
Toast message: "✅ Order disetujui"
Order list re-rendered with new status
```

---

## DATA STRUCTURES

### Order Object

```javascript
{
  id: String,              // "ord_1690000000000"
  skinName: String,        // "Skin Naruto"
  amount: Number,          // 0 (gratis)
  status: String,          // "pending" | "approved" | "rejected"
  verifiedAt: Timestamp,   // null atau Date.now()
  createdAt: Timestamp     // Date.now()
}
```

### LocalStorage Keys

```javascript
// Customer Data
localStorage['DRAW_SKINS']          // Array<Skin>
localStorage['DRAW_LIKES']          // Array<skinId>
localStorage['DRAW_ORDERS']         // Array<Order>

// Admin Data
localStorage['ADMIN_WA']            // "6285236894690"
localStorage['DRAW_THANKS_MSG']     // "Thank you message"
localStorage['ADMIN_PASS_DSS']      // "password"
localStorage['DRAW_QRIS']           // "data:image/png;base64,..."
```

### Filesystem Storage

```
/data/
├── skins.json
│   └── [
│         {
│           id, name, category, description, thumb (base64),
│           featured, likes, sold, createdAt
│         }
│       ]
│
└── orders.json
    └── [
          {
            id, skinName, amount, status, verifiedAt, createdAt
          }
        ]
```

---

## ADMIN SETTINGS PANEL

### Configuration Editable via Dashboard

```javascript
// Settings Tab Content
┌─────────────────────────────────────┐
│ Nomor WhatsApp Admin                 │
│ [6285236894690...................]   │
│                                      │
│ Pesan Thank You                      │
│ [Makasih udah dukung, semoga...]    │
│                                      │
│ [💾 Simpan Pengaturan]              │
│                                      │
│ ─────────────────────────────────────│
│ Admin Password                       │
│ [••••••••••...................]      │
│                                      │
│ [🔄 Ubah Password]                  │
└─────────────────────────────────────┘

// Saved to localStorage
localStorage['ADMIN_WA'] = '6285236894690'
localStorage['DRAW_THANKS_MSG'] = 'Makasih...'
localStorage['ADMIN_PASS_DSS'] = 'new_password_hash'
```

### Password Change

```javascript
function changePassword() {
  const pass = document.getElementById('admin-pass').value;
  
  if (!pass || pass.length < 6) {
    showToast('Password minimal 6 karakter!');
    return;
  }
  
  localStorage.setItem(LS_ADMIN_PASS, pass);
  document.getElementById('admin-pass').value = '';
  showToast('🔐 Password berhasil diubah!');
}

// Next login akan menggunakan password baru
```

---

## ERROR HANDLING & EDGE CASES

### Case 1: Customer Clicks Verify But No QRIS Uploaded

```
GET /api/images/qris
→ File not found
→ Backend generates placeholder: "QRIS belum di-upload"
→ Customer still see message, but can't scan
→ Admin should upload QRIS first
```

### Case 2: WhatsApp Link Fails

```
window.open(waLink, '_blank') fails if:
- No browser support
- WhatsApp not installed (mobile)
- CSP blocks popup

Fallback: Show toast with WhatsApp number
"Buka WhatsApp manual dan hubungi: +6285236894690"
```

### Case 3: Order Double-Submitted

```
POST /api/orders/verify (same order twice)
→ Backend creates 2 identical orders
→ Admin sees duplicates

Solution: Implement order ID deduplication
→ Check if orderId exists before save
```

### Case 4: Admin Rejects Then Approves

```
rejectOrder(id) → removes from array
approveOrder(id) → order already deleted
→ 404 error

Solution: Use "rejected" status instead of delete
→ Keep order, just mark as rejected
```

---

## WHATSAPP MESSAGE TEMPLATES

### Template 1: Customer Verification Request

```
Halo Admin Draw Skin Shop!

Aku mau verifikasi pembayaran untuk skin:
*Nama Skin:* {SKIN_NAME}

Berikut aku lampirkan bukti QRIS transfer-nya ya. Ditunggu file downloadnya!

[Screenshot attached]
```

### Template 2: Admin Approval Reply

```
Pembayaran anda sudah kami verifikasi ✅

Berikut link download:
[Download Link]

Terima kasih telah membeli!
Enjoy skin-nya 🎮
```

### Template 3: Admin Rejection Reply

```
Maaf, transfer anda belum kami terima/ada masalah ❌

Silakan:
1. Cek apakah transfer sudah masuk
2. Kirim bukti transfer lagi
3. Hubungi customer service kami

Terima kasih!
```

---

## MONITORING CHECKLIST

### Daily Tasks (Admin)

- [ ] Check WhatsApp for verification messages
- [ ] Login dashboard → Orders tab
- [ ] Approve/reject pending orders
- [ ] Reply to customer messages
- [ ] Check stats (total sold, total skins)

### Weekly Tasks

- [ ] Backup `/data/` folder
- [ ] Review skin performance (most liked/sold)
- [ ] Update QRIS if needed
- [ ] Check server logs for errors

### Monthly Tasks

- [ ] Review revenue trends
- [ ] Update password (security)
- [ ] Archive old orders (optional)
- [ ] Database optimization

---

**Last Updated**: July 2026
**Version**: 1.0.0
