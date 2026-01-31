// server.js - Corrected template literals + full geo details
const express = require('express');
const crypto = require('crypto');
const path = require('path');
const fetch = require('node-fetch');

const app = express();

// Rate limiting per IP
const lastLogTimes = new Map();
const LOG_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

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

app.set('trust proxy', true);

app.use(async (req, res, next) => {
  // Real IP
  let ip = req.headers['cf-connecting-ip'] ||
           (req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : null) ||
           req.ip ||
           req.socket.remoteAddress ||
           'unknown';

  if (ip === '::1' || ip === '127.0.0.1' || ip.startsWith('10.') || ip.startsWith('172.16.') || ip.startsWith('192.168.')) {
    ip = 'localhost';
  }

  // Rate limit
  const now = Date.now();
  const lastTime = lastLogTimes.get(ip) || 0;
  if (now - lastTime < LOG_COOLDOWN_MS) return next();
  lastLogTimes.set(ip, now);

  // Cleanup
  if (lastLogTimes.size > 10000) {
    for (const [key, time] of lastLogTimes) {
      if (now - time > 24 * 60 * 60 * 1000) lastLogTimes.delete(key);
    }
  }

  const referer = req.headers.referer || 'direct';
  const userAgent = req.headers['user-agent'] || 'unknown';
  const language = req.headers['accept-language'] || 'unknown';
  const deviceType = getDeviceType(userAgent);

  let fpSource = [userAgent, language, deviceType].join('|');
  let fingerprint = sha256(fpSource);

  // Geo lookup
  let geoBlock = '(Geo lookup failed)';
  let country = 'unknown', cc = '?', regionName = 'unknown', region = '?', city = 'unknown';
  let zip = 'N/A', lat = 'unknown', lon = 'unknown', timezone = 'unknown';
  let isp = 'unknown', org = 'N/A', as = 'N/A', mobile = 'No', proxy = 'No';

  if (ip !== 'unknown' && ip !== 'localhost') {
    try {
      const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,query,country,countryCode,regionName,region,city,zip,lat,lon,timezone,isp,org,as,mobile,proxy,hosting`);
      if (geoRes.ok) {
        const data = await geoRes.json();
        if (data.status === 'success') {
          country     = data.country     || 'unknown';
          cc          = data.countryCode || '?';
          regionName  = data.regionName  || 'unknown';
          region      = data.region      || '?';
          city        = data.city        || 'unknown';
          zip         = data.zip         || 'N/A';
          lat         = data.lat         || 'unknown';
          lon         = data.lon         || 'unknown';
          timezone    = data.timezone    || 'unknown';
          isp         = data.isp         || 'unknown';
          org         = data.org         || 'N/A';
          as          = data.as          || 'N/A';
          mobile      = data.mobile      ? 'Yes' : 'No';
          proxy       = (data.proxy || data.hosting) ? 'Yes' : 'No';

          geoBlock = `
IP Lookup (similar to whatismyipaddress.com)

<code>${data.query}</code>

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

          fpSource += `|\( {timezone}| \){country}`;
          fingerprint = sha256(fpSource);
        }
      }
    } catch (err) {
      console.error('Geo lookup failed:', err.message);
    }
  }

  // Safe HTML escaping for dynamic fields
  const safeIp      = `<code>${ip.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code>`;
  const safeFp      = `<code>${fingerprint}</code>`;
  const safeUa      = `<code>${userAgent.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code>`;
  const safeReferer = `<code>${referer.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code>`;

  // Build message (using backticks for template literals)
  const site    = req.hostname;
  const page    = req.originalUrl;
  const protocol = req.protocol;
  const fullUrl = `\( {protocol}:// \){req.hostname}${req.originalUrl}`;

  const message = `
━━━━━━━━━━━━━━━
🧾 <b>WEBSITE VISIT LOG</b>
━━━━━━━━━━━━━━━

🌐 <b>Site</b> • ${site}
📄 <b>Page</b> • ${page}
• ${fullUrl}

🌍 <b>Visitor Location</b>
${geoBlock}

🛠 <b>Device</b> • ${deviceType}
🧠 <b>Fingerprint</b> • ${safeFp}

↩️ <b>Referrer</b> • ${safeReferer}
🖥 <b>User-Agent</b> • ${safeUa}
🗣 <b>Language</b> • ${language}
  `.trim();

  // Send to Telegram
  (async () => {
    try {
      const tgToken = process.env.BOT_TOKEN;
      const chatId = process.env.CHAT_ID;

      if (!tgToken || !chatId) {
        console.log('Missing BOT_TOKEN or CHAT_ID in environment variables');
        return;
      }

      const tgRes = await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML'
        })
      });

      if (!tgRes.ok) {
        const errText = await tgRes.text();
        console.error('Telegram API error:', errText);
      } else {
        console.log('Visit logged to Telegram');
      }
    } catch (err) {
      console.error('Telegram send failed:', err.message);
    }
  })();

  next();
});

// Static files & SPA fallback
app.use(express.static(path.join(__dirname, '.')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const port = process.env.PORT || 10000;
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});