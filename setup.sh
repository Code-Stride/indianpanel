#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════
#  CYRUS PANEL — One-command VPS setup script
#  Usage: curl -sSL your-url/setup.sh | bash
#    or:  bash setup.sh
# ═══════════════════════════════════════════════════════════
set -e

echo "
  ╔══════════════════════════════════════╗
  ║   CYRUS PANEL — Setup Script         ║
  ╚══════════════════════════════════════╝
"

# ─── 1. Install Node.js 20 ─────────────────────────────
if ! command -v node &>/dev/null; then
  echo "📦 Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
else
  echo "✅ Node.js already installed: $(node -v)"
fi

# ─── 2. Install PM2 ────────────────────────────────────
if ! command -v pm2 &>/dev/null; then
  echo "📦 Installing PM2..."
  sudo npm install -g pm2
else
  echo "✅ PM2 already installed"
fi

# ─── 3. Clone repo (if not already here) ───────────────
if [ ! -f "server.js" ]; then
  echo "📦 Cloning repository..."
  git clone https://github.com/Code-Stride/indianpanel.git .
fi

# ─── 4. Install dependencies & build ───────────────────
echo "📦 Installing dependencies..."
npm install

echo "🔨 Building frontend..."
npm run build

# ─── 5. Create .env if missing ─────────────────────────
if [ ! -f ".env" ]; then
  echo ""
  read -p "🔐 Admin username [admin]: " ADMIN_USER
  ADMIN_USER=${ADMIN_USER:-admin}
  read -s -p "🔐 Admin password: " ADMIN_PASS
  echo ""
  read -p "🔐 Telegram bot token (optional, press Enter to skip): " TG_TOKEN
  read -p "🔐 Telegram chat ID (optional, press Enter to skip): " TG_CHAT

  SECRET=$(openssl rand -hex 32)

  cat > .env <<EOF
NODE_ENV=production
PORT=3000
SESSION_SECRET=$SECRET
ADMIN_USERNAME=$ADMIN_USER
ADMIN_PASSWORD=$ADMIN_PASS
TG_BOT_TOKEN=$TG_TOKEN
TG_CHAT_ID=$TG_CHAT
EOF
  echo "✅ .env created"
fi

# ─── 6. Create logs dir ────────────────────────────────
mkdir -p logs data

# ─── 7. Start with PM2 ─────────────────────────────────
echo "🚀 Starting server with PM2..."
pm2 delete cyrus-panel 2>/dev/null || true
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup 2>/dev/null || true

echo ""
echo "  ╔══════════════════════════════════════╗"
echo "  ║   ✅ CYRUS PANEL is running!         ║"
echo "  ║                                      ║"
echo "  ║   🌐 http://$(hostname -I | awk '{print $1}'):3000         ║"
echo "  ║   🔐 Admin: http://...:3000/admin/   ║"
echo "  ║                                      ║"
echo "  ║   pm2 logs cyrus-panel    → view logs║"
echo "  ║   pm2 restart cyrus-panel → restart  ║"
echo "  ║   pm2 stop cyrus-panel    → stop     ║"
echo "  ╚══════════════════════════════════════╝"
echo ""
