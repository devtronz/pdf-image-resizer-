// server.js - Advanced visitor logging + Telegram notification
const express = require('express');
const crypto = require('crypto');
const path = require('path');
const fetch = require('node-fetch');

const app = express();

// In-memory store for rate limiting logs per IP (resets on server restart)
const lastLogTimes = new Map(); // IP → timestamp
const LOG_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

// Helpers
function getDeviceType(ua = '') {
  ua = ua.toLowerCase();
  if (/bot|crawler|spider|crawling/.test(ua)) return "Bot";
  if (/tablet|ipad/.test(ua)) return "Tablet";
  if (/mobile|android|iphone|ipod/.test(ua)) return "Mobile";
  return "Desktop";
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

// Trust proxy (important on Render, Railway, Vercel, etc.)
app.set('trust proxy', true);

// Advanced Middleware: Visitor logging
app.use(async (req, res, next) => {
  // Get real client IP (Render uses X-Forwarded-For)
  let ip = req.headers['cf-connecting-ip'] ||
           (req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : null) ||
           req.ip ||
           req.socket.remoteAddress ||
           'unknown';

  // Clean localhost / internal IPs
  if (ip === '::1' || ip === '127.0.0.1' || ip.startsWith('10.') || ip.startsWith('172.16.') || ip.startsWith('192.168.')) {
    ip = 'localhost';
  }

  // Rate limit: skip logging if same IP was logged recently
  const now = Date.now();
  const lastTime = lastLogTimes.get(ip) || 0;
  if (now - lastTime < LOG_COOLDOWN_MS) {
    return next(); // Silent skip
  }
  lastLogTimes.set(ip, now);

  // Optional: clean up old entries (prevent memory leak)
  if (lastLogTimes.size > 10000) {
    for (const [key, time] of lastLogTimes) {
      if (now - time > 24 * 60 * 60 * 1000) lastLogTimes.delete(key); // older than 24h
    }
  }

  const referer = req.headers.referer || 'direct';
  const userAgent = req.headers['user-agent'] || 'unknown';
  const language = req.headers['accept-language'] || 'unknown';

  const deviceType = getDeviceType(userAgent);

  // Basic fingerprint
  let fpSource = [userAgent, language, deviceType].join('|');
  let fingerprint = sha256(fpSource);

  // Geo lookup fallback values
  let country = 'unknown';
  let city = 'unknown';
  let timezone = 'unknown';
  let latitude = 'unknown';
  let longitude = 'unknown';
  let isp = 'unknown';

  // Fetch geo data from ipapi.co (free tier, no key, low volume ok)
  if (ip !== 'unknown' && ip !== 'localhost') {
    try {
      const geoRes = await fetch(`https://ipapi.co/${ip}/json/`);
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        if (!geoData.error) {
          country   = geoData.country_name || 'unknown';
          city      = geoData.city || 'unknown';
          timezone  = geoData.timezone || 'unknown';
          latitude  = geoData.latitude || 'unknown';
          longitude = geoData.longitude || 'unknown';
          isp       = geoData.org || geoData.asn || 'unknown';

          // Enrich fingerprint with geo
          fpSource += `|\( {timezone}| \){country}`;
          fingerprint = sha256(fpSource);
        }
      }
    } catch (err) {
      console.error('Geo lookup failed:', err.message);
    }
  }

  const site = req.hostname;
  const page = req.originalUrl;
  const fullUrl = req.protocol + '://' + req.hostname + req.originalUrl;

  const message = `
━━━━━━━━━━━━━━━
🧾 *ADVANCED VISIT LOG*
━━━━━━━━━━━━━━━

🌐 *Site* • ${site}
📄 *Page* • ${page}
• ${fullUrl}

🌍 *Visitor Location*
• IP: \`${ip}\`
• Country: ${country}
• City: ${city}
• Timezone: ${timezone}
• Lat/Long: ${latitude}, ${longitude}
• ISP: ${isp}

🛠 *Device* • ${deviceType}
🧠 *Fingerprint* • \`${fingerprint}\`

↩️ *Referrer* • ${referer}
🖥 *User-Agent* • ${userAgent}
🗣 *Language* • ${language}
  `.trim();

  // Async Telegram send (non-blocking)
  (async () => {
    try {
      const tgToken = process.env.BOT_TOKEN;
      const chatId = process.env.CHAT_ID;

      if (!tgToken || !chatId) {
        console.log('Telegram credentials missing - skipping send');
        return;
      }

      const tgRes = await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'Markdown'
        })
      });

      if (!tgRes.ok) {
        const errText = await tgRes.text();
        console.error('Telegram API error:', errText);
      } else {
        console.log('Logged to Telegram successfully');
      }
    } catch (err) {
      console.error('Telegram send failed:', err.message);
    }
  })();

  next();
});

// Serve static files (your frontend HTML, JS, CSS)
app.use(express.static(path.join(__dirname, '.')));

// SPA fallback (serve index.html for all other routes)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
const port = process.env.PORT || 10000;
const host = '0.0.0.0';

app.listen(port, host, () => {
  console.log(`Server listening on http://\( {host}: \){port}`);
});