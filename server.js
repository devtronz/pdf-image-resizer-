// server.js - Advanced visitor logging with full IP geolocation sent to Telegram
const express = require('express');
const crypto = require('crypto');
const path = require('path');
const fetch = require('node-fetch');

const app = express();

// In-memory rate limiting per IP (prevents Telegram spam)
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

// Trust proxy (essential on Render)
app.set('trust proxy', true);

// Global middleware - logs every visit
app.use(async (req, res, next) => {
  // Get real client IP
  let ip = req.headers['cf-connecting-ip'] ||
           (req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : null) ||
           req.ip ||
           req.socket.remoteAddress ||
           'unknown';

  if (ip === '::1' || ip === '127.0.0.1' || ip.startsWith('10.') || ip.startsWith('172.16.') || ip.startsWith('192.168.')) {
    ip = 'localhost';
  }

  // Rate limit per IP
  const now = Date.now();
  const lastTime = lastLogTimes.get(ip) || 0;
  if (now - lastTime < LOG_COOLDOWN_MS) {
    return next();
  }
  lastLogTimes.set(ip, now);

  // Clean up old entries (memory safety)
  if (lastLogTimes.size > 10000) {
    for (const [key, time] of lastLogTimes.entries()) {
      if (now - time > 24 * 60 * 60 * 1000) lastLogTimes.delete(key);
    }
  }

  // Gather visit info
  const referer    = req.headers.referer || 'direct';
  const userAgent  = req.headers['user-agent'] || 'unknown';
  const language   = req.headers['accept-language'] || 'unknown';
  const deviceType = getDeviceType(userAgent);

  let fpSource = [userAgent, language, deviceType].join('|');
  let fingerprint = sha256(fpSource);

  // ── Full IP geolocation lookup ──
  let geoInfo = '';
  let country = 'unknown', city = 'unknown', timezone = 'unknown', lat = 'unknown', lon = 'unknown', isp = 'unknown', org = 'unknown', as = 'unknown';
  let mobile = 'No', proxy = 'No';

  if (ip !== 'unknown' && ip !== 'localhost') {
    try {
      const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,query,country,countryCode,regionName,region,city,zip,lat,lon,timezone,isp,org,as,mobile,proxy,hosting`);
      if (geoRes.ok) {
        const data = await geoRes.json();
        if (data.status === 'success') {
          country = data.country || 'unknown';
          const cc = data.countryCode || '?';
          const regionName = data.regionName || 'unknown';
          const region = data.region || '?';
          city = data.city || 'unknown';
          const zip = data.zip || 'N/A';
          lat = data.lat || 'unknown';
          lon = data.lon || 'unknown';
          timezone = data.timezone || 'unknown';
          isp = data.isp || 'unknown';
          org = data.org || 'N/A';
          as = data.as || 'N/A';
          mobile = data.mobile ? 'Yes' : 'No';
          proxy = (data.proxy || data.hosting) ? 'Yes' : 'No';

          geoInfo = `
IP Lookup (similar to whatismyipaddress.com)

${data.query}

🌍 Country: \( {country} ( \){cc})
🏞 Region: \( {regionName} ( \){region})
🏙 City: ${city}
📮 ZIP: ${zip}
📍 Lat/Lon: ${lat}, ${lon}
🕒 Timezone: ${timezone}
🌐 ISP: ${isp}
🏢 Org: ${org}
🔗 AS: ${as}
📱 Mobile?: ${mobile}
🕵️ Proxy/VPN/Hosting?: ${proxy}
          `.trim();

          // Enrich fingerprint
          fpSource += `|\( {timezone}| \){country}`;
          fingerprint = sha256(fpSource);
        }
      }
    } catch (err) {
      console.error('Geo lookup failed:', err.message);
      geoInfo = '(Geo lookup failed)';
    }
  }

  // Build the full message
  const site = req.hostname;
  const page = req.originalUrl;
  const fullUrl = req.protocol + '://' + req.hostname + req.originalUrl;

  const message = `
━━━━━━━━━━━━━━━
🧾 *WEBSITE VISIT LOG*
━━━━━━━━━━━━━━━

🌐 *Site* • ${site}
📄 *Page* • ${page}
• ${fullUrl}

${geoInfo ? '🌍 *Visitor Location*\n' + geoInfo : ''}

🛠 *Device* • ${deviceType}
🧠 *Fingerprint* • \`${fingerprint}\`

↩️ *Referrer* • ${referer}
🖥 *User-Agent* • ${userAgent}
🗣 *Language* • ${language}
  `.trim();

  // Send to Telegram (non-blocking)
  (async () => {
    try {
      const tgToken = process.env.BOT_TOKEN;
      const chatId = process.env.CHAT_ID;

      if (!tgToken || !chatId) {
        console.log('Telegram credentials missing - skipping');
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
        console.error('Telegram API error:', await tgRes.text());
      } else {
        console.log('Visit logged to Telegram');
      }
    } catch (err) {
      console.error('Telegram send failed:', err.message);
    }
  })();

  next();
});

// Serve static files (HTML, JS, CSS, images...)
app.use(express.static(path.join(__dirname, '.')));

// SPA / catch-all fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
const port = process.env.PORT || 10000;
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});