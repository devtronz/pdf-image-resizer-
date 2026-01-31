// server.js (advanced visitor logging version)
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

// Advanced Middleware: Visitor logging
app.use(async (req, res, next) => {
  const url = new URL(req.protocol + '://' + req.get('host') + req.originalUrl);
  const ip = req.headers['cf-connecting-ip'] ||
             (req.headers['x-forwarded-for']?.split(',')[0]?.trim()) ||
             req.ip ||
             'unknown';

  // Rate limit: skip if same IP logged recently
  const now = Date.now();
  const lastTime = lastLogTimes.get(ip) || 0;
  if (now - lastTime < LOG_COOLDOWN_MS) {
    return next(); // Silent skip – no log spam
  }
  lastLogTimes.set(ip, now);

  const referer = req.headers.referer || 'direct';
  const userAgent = req.headers['user-agent'] || 'unknown';
  const language = req.headers['accept-language'] || 'unknown';

  const deviceType = getDeviceType(userAgent);

  // Basic fingerprint (can expand later)
  const fpSource = [userAgent, language, deviceType].join('|'); // timezone added from geo
  let fingerprint = sha256(fpSource);

  // Default geo (fallback)
  let country = 'unknown';
  let city = 'unknown';
  let timezone = 'unknown';
  let latitude = 'unknown';
  let longitude = 'unknown';
  let isp = 'unknown';

  // Fetch real geo from ipapi.co (free, no key needed for low volume)
  if (ip !== 'unknown' && ip !== '127.0.0.1' && !ip.startsWith('::1')) {
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

          // Improve fingerprint with geo data
          fpSource += `|\( {timezone}| \){country}`;
          fingerprint = sha256(fpSource);
        }
      }
    } catch (err) {
      console.error('Geo lookup failed:', err.message);
      // Fallback to defaults – don't break request
    }
  }

  const site = url.hostname;
  const page = url.pathname;
  const fullUrl = url.href;

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
      const tgRes = await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: process.env.CHAT_ID,
          text: message,
          parse_mode: 'Markdown'
        })
      });

      if (!tgRes.ok) {
        const errText = await tgRes.text();
        console.error('Telegram failed:', errText);
      }
    } catch (err) {
      console.error('Telegram error:', err.message);
    }
  })();

  next();
});

// Serve static files
app.use(express.static(path.join(__dirname, '.')));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Port setup for Render
const port = process.env.PORT || 10000;
const host = '0.0.0.0';

app.listen(port, host, () => {
  console.log(`Server listening on http://\( {host}: \){port}`);
});