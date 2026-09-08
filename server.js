const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { Canvas, createCanvas } = require('canvas');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// [PERBAIKAN 1]: Menggunakan path.join agar Vercel bisa menemukan folder public
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;

// [PERBAIKAN 2]: Menambahkan route spesifik untuk memanggil index.html di halaman utama
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.post('/api/images/protected', (req, res) => {
  try {
    const { imageData, width = 512, height = 512 } = req.body;
    
    if (!imageData) {
      return res.status(400).json({ error: 'No image data provided' });
    }

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    const buffer = Buffer.from(imageData.split(',')[1], 'base64');
    const img = new (require('canvas').Image)();
    img.src = buffer;

    ctx.drawImage(img, 0, 0, width, height);

    const watermarkText = 'DEX Shop';
    ctx.font = 'bold 24px Arial';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        ctx.save();
        ctx.globalAlpha = 0.08;
        ctx.fillText(watermarkText, (width / 4) * (i + 1), (height / 4) * (j + 1));
        ctx.restore();
      }
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 2;
    for (let i = 0; i < width; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, height);
      ctx.stroke();
    }
    for (let i = 0; i < height; i += 40) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(width, i);
      ctx.stroke();
    }

    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', 'script-src \'self\'');

    const protectedBuffer = canvas.toBuffer('image/png');
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Length', protectedBuffer.length);
    res.send(protectedBuffer);
  } catch (error) {
    console.error('Image protection error:', error);
    res.status(500).json({ error: 'Failed to process image' });
  }
});

app.get('/api/images/qris', (req, res) => {
  try {
    const qrisPath = path.join(__dirname, 'public', 'qris.png');
    
    if (!fs.existsSync(qrisPath)) {
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
  } catch (error) {
    console.error('QRIS fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch QRIS' });
  }
});

// NOTE: Fungsi upload & verify di bawah ini sementara akan lolos tanpa error,
// namun datanya HANYA bertahan sementara dan akan hilang saat Vercel me-refresh server.
app.post('/api/skins/upload', (req, res) => {
  try {
    const { name, category, description, imageData } = req.body;
    
    const dataDir = path.join(__dirname, 'data');
    const skinsFile = path.join(dataDir, 'skins.json');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    let skins = [];
    if (fs.existsSync(skinsFile)) {
      skins = JSON.parse(fs.readFileSync(skinsFile, 'utf8'));
    }

    const newSkin = {
      id: 'skin_' + Date.now(),
      name,
      category,
      description,
      imageData,
      featured: false,
      likes: 0,
      sold: 0,
      createdAt: Date.now()
    };

    skins.push(newSkin);
    fs.writeFileSync(skinsFile, JSON.stringify(skins, null, 2));

    res.json({ success: true, skin: newSkin });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

app.get('/api/skins', (req, res) => {
  try {
    const skinsFile = path.join(__dirname, 'data', 'skins.json');
    if (fs.existsSync(skinsFile)) {
      const skins = JSON.parse(fs.readFileSync(skinsFile, 'utf8'));
      res.json(skins);
    } else {
      res.json([]);
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch skins' });
  }
});

app.post('/api/orders/verify', (req, res) => {
  try {
    const { orderId, skinName, amount } = req.body;
    
    const dataDir = path.join(__dirname, 'data');
    const ordersFile = path.join(dataDir, 'orders.json');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

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
  } catch (error) {
    console.error('Order verification error:', error);
    res.status(500).json({ error: 'Order verification failed' });
  }
});

// [PERBAIKAN 3]: Penyesuaian eksekusi aplikasi untuk lingkungan Vercel Serverless
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 DEX SHOP Backend running on port ${PORT}`);
    console.log(`📍 http://localhost:${PORT}`);
  });
}

// Ekspor app agar dikenali oleh Vercel Serverless
module.exports = app;
        
