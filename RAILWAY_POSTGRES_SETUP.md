# Railway PostgreSQL Setup Guide
# ═══════════════════════════════════════════════════════
# Run these commands in Railway dashboard or CLI

# 1. Add PostgreSQL database to your project:
#    Railway Dashboard → Your Project → "+" → "Database" → "PostgreSQL"

# 2. Railway will auto-add DATABASE_URL to your service's env.
#    If not, copy it manually:
#    Click on PostgreSQL → Connect → Internal → DATABASE_URL
#    Then paste it into your web service's Variables

# 3. The app auto-detects DATABASE_URL and uses PostgreSQL!

# That's it. Tables are auto-created on first start.
