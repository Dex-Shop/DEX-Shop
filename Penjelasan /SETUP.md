# Draw Skin Shop - Complete Setup Guide

## LOCAL DEVELOPMENT SETUP

### Prerequisites
- Node.js v16.x or higher
- npm v8.x or higher
- Git (optional)
- Text editor (VS Code recommended)

### Step 1: Install Node.js

**Windows/Mac/Linux:**
Download dari https://nodejs.org (LTS version)

Verify installation:
```bash
node --version    # v16.x.x or higher
npm --version     # 8.x.x or higher
```

### Step 2: Project Setup

```bash
# Navigate to project directory
cd draw-skin-shop

# Install dependencies
npm install

# Verify installation
npm list
# Output should show:
# draw-skin-shop@1.0.0 /path/to/draw-skin-shop
# ├── express@4.18.2
# ├── cors@2.8.5
# └── canvas@2.11.2
```

### Step 3: Run Local Server

**Production mode:**
```bash
npm start
```

**Development mode (auto-reload):**
```bash
npm install -g nodemon
npm run dev
```

Output:
```
🚀 Draw Skin Shop Backend running on port 3000
📍 http://localhost:3000
```

### Step 4: Access Application

- **Customer Side**: http://localhost:3000
- **Admin Dashboard**: http://localhost:3000/admin.html
- **Admin Password**: admin123 (default)

### Step 5: Test Functionality

#### Test Upload Skin (Admin)
1. Go to http://localhost:3000/admin.html
2. Login with password: `admin123`
3. Upload a test image
4. Verify skin appears on homepage

#### Test QRIS Upload
1. Admin → Payment tab
2. Upload QRIS image (any PNG/JPG)
3. Go to shop, click skin → should see QRIS

#### Test WhatsApp Verification
1. Click "Ambil Skin" on any skin
2. Click "Verifikasi via WhatsApp"
3. Should redirect to WhatsApp Web (if installed)
4. Check `/data/orders.json` - order should be logged

---

## PRODUCTION DEPLOYMENT

### Option 1: Heroku

#### Prerequisites
- Heroku account (free tier available)
- Heroku CLI installed

#### Deployment Steps

```bash
# Login to Heroku
heroku login

# Create new app
heroku create draw-skin-shop

# Deploy
git push heroku main

# View logs
heroku logs --tail

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set ADMIN_WA=6285236894690
```

**Issues & Solutions:**

Problem: Canvas library fails
```bash
heroku buildpacks:add https://github.com/jonathanong/heroku-buildpack-ffmpeg-latest.git
heroku buildpacks:add https://github.com/gvalkov/heroku-buildpack-cairo.git
```

Problem: Data lost after dyno restart
Solution: Use MongoDB Atlas free tier
```bash
heroku config:set MONGODB_URI=mongodb+srv://...
```

### Option 2: Railway.app

#### Prerequisites
- Railway account
- GitHub repo connected

#### Steps

1. Go to https://railway.app
2. "New Project" → "Deploy from GitHub"
3. Select repository
4. Add environment variables:
   ```
   NODE_ENV=production
   ADMIN_WA=6285236894690
   ```
5. Deploy automatically

Benefits:
- Simpler than Heroku
- Better Node.js support
- No buildpack hassles

### Option 3: Render

#### Prerequisites
- Render account
- GitHub repo

#### Steps

1. Go to https://render.com
2. "New" → "Web Service"
3. Connect GitHub repo
4. Build command: `npm install`
5. Start command: `npm start`
6. Environment: Add variables
7. Deploy

### Option 4: DigitalOcean App Platform

#### Prerequisites
- DigitalOcean account
- $5/month minimum

#### Steps

```bash
# Via CLI
doctl apps create --spec app.yaml

# Or via dashboard
# Create App → Connect GitHub → Select Repo → Configure → Deploy
```

**app.yaml:**
```yaml
name: draw-skin-shop
services:
- name: web
  github:
    repo: username/draw-skin-shop
    branch: main
  build_command: npm install
  run_command: npm start
  http_port: 3000
  envs:
  - key: NODE_ENV
    value: production
```

### Option 5: Self-Hosted VPS

#### Prerequisites
- Ubuntu 20.04 LTS VPS
- SSH access
- Domain name (optional)

#### Installation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 (process manager)
sudo npm install -g pm2

# Clone repository
cd /opt
git clone https://github.com/yourusername/draw-skin-shop.git
cd draw-skin-shop

# Install dependencies
npm install --production

# Start with PM2
pm2 start server.js --name "draw-skin-shop"

# Save PM2 config
pm2 save

# Setup startup script
pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/local/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp /home/$USER
```

#### Setup Nginx Reverse Proxy

```bash
# Install Nginx
sudo apt install -y nginx

# Create config
sudo nano /etc/nginx/sites-available/draw-skin-shop
```

**Config content:**
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable site & restart:
```bash
sudo ln -s /etc/nginx/sites-available/draw-skin-shop /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### Setup SSL (Let's Encrypt)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal (automatically set)
sudo systemctl enable certbot.timer
```

#### Monitoring & Logs

```bash
# View application logs
pm2 logs draw-skin-shop

# Restart app
pm2 restart draw-skin-shop

# Monitor resources
pm2 monit

# Check Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

---

## ENVIRONMENT CONFIGURATION

### .env File (Production)

Create `.env` file di root directory:

```env
NODE_ENV=production
PORT=3000
ADMIN_WA=6285236894690
ADMIN_EMAIL=your-email@gmail.com
DATABASE_URL=mongodb+srv://user:pass@cluster.mongodb.net/draw-skin-shop

# Security
JWT_SECRET=your-secret-key-here
CORS_ORIGIN=https://yourdomain.com

# Optional: Image Storage
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_REGION=ap-southeast-1
S3_BUCKET=draw-skin-shop
```

### Load Environment Variables

Update `server.js`:
```javascript
require('dotenv').config();

const PORT = process.env.PORT || 3000;
const ADMIN_WA = process.env.ADMIN_WA || '6285236894690';
```

Install dotenv:
```bash
npm install dotenv
```

---

## BACKUP & MAINTENANCE

### Data Backup

```bash
# Backup all data
mkdir -p backups
tar -czf backups/backup-$(date +%Y%m%d).tar.gz data/

# Upload to cloud
aws s3 cp backups/ s3://my-backup-bucket/

# Or use rsync untuk VPS
rsync -avz /opt/draw-skin-shop/data/ backup-server:/backups/
```

### Database Backup (if using MongoDB)

```bash
# Export data
mongodump --uri "mongodb+srv://user:pass@cluster..." --out ./backup

# Import data
mongorestore --uri "mongodb+srv://user:pass@cluster..." ./backup
```

### Automated Backup Script

Create `backup.sh`:
```bash
#!/bin/bash
BACKUP_DIR="/opt/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup data
tar -czf $BACKUP_DIR/data-$DATE.tar.gz /opt/draw-skin-shop/data/

# Keep only last 30 days
find $BACKUP_DIR -name "data-*.tar.gz" -mtime +30 -delete

# Upload to S3 (optional)
aws s3 cp $BACKUP_DIR/data-$DATE.tar.gz s3://my-backups/
```

Schedule dengan cron (daily 2 AM):
```bash
# Edit crontab
crontab -e

# Add line
0 2 * * * /opt/draw-skin-shop/backup.sh
```

---

## MONITORING & ALERTS

### PM2 Monitoring

```bash
# Setup PM2 Plus (free monitoring)
pm2 install pm2-auto-pull

# Or use free version
pm2 web  # Web dashboard at http://localhost:9615
```

### Application Logs

Setup logging with Winston:

```bash
npm install winston
```

Update `server.js`:
```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// Use in routes
logger.info('Server started');
logger.error('Something went wrong');
```

### Uptime Monitoring

Use free services:
- Uptimerobot.com
- Pingdom.com
- Healthchecks.io

Setup endpoint:
```javascript
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});
```

Monitor: `https://yourdomain.com/health`

---

## TROUBLESHOOTING

### Problem: Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port
PORT=3001 npm start
```

### Problem: Canvas Library Error

```bash
# Rebuild canvas
npm rebuild canvas

# Or install build dependencies (Ubuntu)
sudo apt install -y build-essential python3 libcairo2-dev libpango1.0-dev
npm install canvas
```

### Problem: Image Upload Fails

Check file size limits in `server.js`:
```javascript
app.use(express.json({ limit: '50mb' }));
```

### Problem: WhatsApp Link Not Working

Test URL format:
```javascript
const waLink = `https://api.whatsapp.com/send?phone=6285236894690&text=Test`;
console.log(waLink);  // Check format
```

Mobile devices: Make sure WhatsApp app installed
Desktop: Use WhatsApp Web support

### Problem: QRIS Image Not Displaying

```bash
# Check if file exists
ls -la public/qris.png

# Check permissions
chmod 644 public/qris.png

# Check server logs
pm2 logs draw-skin-shop
```

---

## PERFORMANCE OPTIMIZATION

### Enable Compression

```javascript
const compression = require('compression');
app.use(compression());

npm install compression
```

### Implement Caching

```javascript
app.get('/api/skins', (req, res) => {
  res.setHeader('Cache-Control', 'max-age=3600');
  // ... send data
});
```

### Use CDN for Static Files

Upload `public/` folder ke Cloudflare/CloudFront:
```javascript
// Update frontend
const IMAGE_CDN = 'https://cdn.yourdomain.com/images/';
img.src = IMAGE_CDN + filename;
```

---

## USEFUL COMMANDS

```bash
# Start/stop/restart
pm2 start server.js
pm2 stop draw-skin-shop
pm2 restart draw-skin-shop
pm2 delete draw-skin-shop

# View all processes
pm2 list
pm2 show draw-skin-shop

# Stream logs
pm2 logs draw-skin-shop --lines 100

# Kill all
pm2 kill

# Save process list
pm2 save

# Resurrect saved list
pm2 resurrect
```

---

**Happy Deployment! 🚀**
