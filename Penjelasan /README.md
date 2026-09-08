# Draw Skin Shop - Backend Version

Minecraft Skin Marketplace dengan anti-screenshot protection, QRIS payment system, dan WhatsApp admin verification.

## Fitur Utama

### 1. Anti-Screenshot Protection (Backend Rendering)
- Gambar skin di-render menggunakan Canvas API di backend Node.js
- Watermark dinamis ditambahkan secara server-side sebelum di-send ke client
- Grid pattern overlay mencegah crop manual
- Cache headers yang ketat mencegah save-as
- Response headers keamanan: X-Frame-Options, CSP, X-Content-Type-Options

### 2. Color Scheme Redesign
- **Background**: Deep Cream (#f5f3f0) - Putih hangat
- **Cards**: Abu-abu gelap (#a8a39c)
- **Text Detail**: Abu-abu medium (#c9c1ba)
- **Primary Brand**: Violet (#8b6cf2) untuk aksen
- **Secondary**: Emerald green (#34d399)

### 3. Payment Integration
- **QRIS Image**: Upload via admin dashboard
- **WhatsApp Verification**: Customer contact admin langsung untuk konfirmasi pembayaran
- **Backend Order Tracking**: Setiap order disimpan dengan status pending/approved

### 4. Admin Dashboard
- Tab 1 (Skins): Upload skin baru, manage featured status, delete skin
- Tab 2 (Payment): Upload QRIS code, preview image
- Tab 3 (Orders): Lihat pending orders, approve/reject
- Tab 4 (Settings): Ubah nomor WhatsApp admin, pesan terima kasih, password

## File Structure

```
draw-skin-shop/
├── server.js              # Express backend dengan anti-screenshot
├── package.json           # Dependencies
├── public/
│   ├── index.html         # Homepage customer
│   ├── admin.html         # Admin dashboard
│   └── qris.png           # QRIS image (upload via admin)
└── data/                  # Auto-created
    ├── skins.json         # Daftar skins
    ├── orders.json        # Order logs
    └── (lainnya)
```

## Installation & Setup

### Prerequisites
- Node.js v16+ (dengan npm)
- Image QRIS dalam format PNG atau JPG

### Local Installation

1. Clone/download project:
```bash
cd draw-skin-shop
```

2. Install dependencies:
```bash
npm install
```

3. Jalankan server:
```bash
npm start
```

Server akan berjalan di: `http://localhost:3000`

### Development Mode (Auto-reload)
```bash
npm install -g nodemon
npm run dev
```

## API Endpoints

### GET /api/health
Status check backend
**Response**: `{ status: 'ok', timestamp: 1234567890 }`

### POST /api/images/protected
Render & protect skin image dengan watermark
**Request Body**:
```json
{
  "imageData": "data:image/png;base64,...",
  "width": 512,
  "height": 512
}
```
**Response**: Binary PNG dengan watermark + grid pattern

### GET /api/images/qris
Fetch QRIS image untuk payment modal
**Response**: PNG image atau placeholder jika belum diupload

### POST /api/skins/upload
Upload skin baru (digunakan admin)
**Request Body**:
```json
{
  "name": "Skin Naruto",
  "category": "Anime",
  "description": "...",
  "imageData": "data:image/png;base64,..."
}
```

### GET /api/skins
Ambil daftar semua skins
**Response**: Array of skins

### POST /api/orders/verify
Catat order baru ketika customer click verify
**Request Body**:
```json
{
  "orderId": "ord_1234567",
  "skinName": "Skin Naruto",
  "amount": 0
}
```

## Authentication

### Admin Login
- Default password: `admin123`
- Akses: `http://localhost:3000/admin.html`
- Ubah password di Settings tab

### Frontend Session
- Menggunakan localStorage untuk tracking user actions
- Like system, purchase history disimpan di browser

## Deployment

### Vercel
```bash
npm install -g vercel
vercel
```
*Note: Canvas library memerlukan custom build untuk Vercel, gunakan alternative atau AWS Lambda*

### Heroku
```bash
heroku create draw-skin-shop
git push heroku main
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### Self-Hosted (Ubuntu/Linux)
```bash
# Install PM2
npm install -g pm2

# Run di background
pm2 start server.js --name "draw-skin-shop"

# Auto-start on reboot
pm2 startup
pm2 save
```

## Configuration

### Mengubah Admin WhatsApp
1. Login ke admin dashboard
2. Pergi ke Settings tab
3. Update nomor di field "Nomor WhatsApp Admin"
4. Simpan

### Upload QRIS
1. Login admin
2. Pergi ke Payment tab
3. Upload file QRIS PNG/JPG
4. Server akan serve di `/api/images/qris`

### Customize Pesan Terima Kasih
1. Admin Dashboard → Settings
2. Edit field "Pesan Thank You"
3. Simpan - akan tampil saat customer download

## Technical Details

### Anti-Screenshot Implementation

1. **Server-Side Image Protection**
   - Setiap request ke `/api/images/protected` render ulang image via canvas
   - Tidak ada hardcoded image URL di frontend
   - Watermark embedded dengan opacity rendah (8-15%)

2. **Grid Pattern Overlay**
   - SVG + Canvas line rendering setiap 40px
   - Prevents cropping corner area
   - Teksur halus, tidak mengganggu view

3. **Security Headers**
   ```
   X-Frame-Options: DENY
   Cache-Control: no-cache, no-store, must-revalidate
   Content-Security-Policy: script-src 'self'
   ```

4. **Client-Side Mitigation**
   - `document.addEventListener('contextmenu')` - disable right-click
   - `document.addEventListener('keydown')` - block PrintScreen
   - `pointer-events: none` pada image elements
   - `-webkit-user-drag: none` prevent image drag

### Color Palette System

CSS Custom Properties di `:root`:
- `--bg`: Background utama (cream #f5f3f0)
- `--bg-alt`: Background secondary (abu #ede9e5)
- `--card`: Card background (abu gelap #a8a39c)
- `--card-light`: Card border (abu terang #c9c1ba)
- `--text`: Text primary (#2a2622)
- `--text-dim`: Text secondary (#6b6560)
- `--text-faint`: Text tertiary (#9d9892)

Semua warna konsisten di antara light & dark theme.

### Payment Flow

1. Customer lihat skin → click "Ambil Skin"
2. Modal pembayaran terbuka dengan QRIS
3. Customer click "Verifikasi via WhatsApp"
4. `/api/orders/verify` mencatat order dengan status "pending"
5. Customer directed ke WhatsApp dengan template message
6. Admin receive di WhatsApp, review bukti transfer
7. Admin login dashboard, approve order di tab Orders
8. Customer dapat download link (untuk versi paid)

### Data Persistence

- **localStorage**: Skins, likes, user actions (browser)
- **Server-side**: `/data/skins.json`, `/data/orders.json` (file-based)
- *Upgrade ke MongoDB/PostgreSQL untuk production*

## Troubleshooting

### Canvas Library Error
```
Error: Cannot find module 'canvas'
```
**Fix**: 
```bash
npm install canvas --build-from-source
```

### QRIS Image Tidak Tampil
- Pastikan file `public/qris.png` ada
- Atau upload via admin dashboard
- Check browser console untuk error

### WhatsApp Link Tidak Terbuka
- Browser harus mendukung `window.open()`
- Mobile: Pastikan WhatsApp app installed
- Desktop: Buka di browser dengan WhatsApp Web support

### Admin Password Lupa
Akses browser console:
```javascript
localStorage.removeItem('ADMIN_PASS_DSS');
// Default password kembali ke 'admin123'
```

## Security Considerations

1. **Jangan expose sensitive data** di frontend
2. **Gunakan HTTPS** untuk production
3. **Rate limit API** menggunakan middleware seperti express-rate-limit
4. **Sanitize input** sebelum save ke JSON
5. **Implement proper authentication** menggunakan JWT untuk production
6. **Backup `/data/` folder** regularly

## Performance Tips

1. **Image Compression**: Compress QRIS sebelum upload
2. **Cache Busting**: Tambah query param untuk force refresh
3. **CDN**: Deploy static files ke Cloudflare/CloudFront
4. **Database**: Migrasi dari JSON ke MongoDB untuk scale

## Support & Updates

Repository: https://github.com/hmmodz/draw-skin-shop
Issues: Report via GitHub Issues

---

**Made with ❤️ by HM MODZ Team**
