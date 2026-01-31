const express = require('express');
const crypto = require('crypto');
const path = require('path');
const fetch = require('node-fetch'); // add to dependencies

const app = express();

// Your getDeviceType helper
function getDeviceType(ua = '') {
  ua = ua.toLowerCase();
  if (/bot|crawler|spider|crawling/.test(ua)) return "Bot";
  if (/tablet|ipad/.test(ua)) return "Tablet";
  if (/mobile|android|iphone|ipod/.test(ua)) return "Mobile";
  return "Desktop";
}

// SHA-256 helper (Node crypto)
function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

// Middleware – runs on EVERY request
app.use(async (req, res, next) => {
  const url = new URL(req.protocol + '://' + req.get('host') + req.originalUrl);

  const ip = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'unknown';
  const referer = req.headers.referer || 'direct';
  const userAgent = req.headers['user-agent'] || 'unknown';
  const language = req.headers['accept-language'] || 'unknown';

  // No cf object on Render → skip or use ipinfo.io for geo if needed
  const country = 'unknown'; // or fetch from free geo API
  const city = 'unknown';
  const timezone = 'unknown';

  const deviceType = getDeviceType(userAgent);

  const fpSource = [userAgent, language, timezone, deviceType].join('|');
  const fingerprint = sha256(fpSource);

  const site = url.hostname;
  const page = url.pathname;
  const fullUrl = url.href;

  const message = `
━━━━━━━━━━━━━━━
🧾 *NEW VISIT*
━━━━━━━━━━━━━━━

🌐 *Site* • ${site}
📄 *Page* • ${page}
• ${fullUrl}

🌍 *Visitor*
• IP: \`${ip}\`
• Device: ${deviceType}
• Country: ${country}
• City: ${city}
• Timezone: ${timezone}

🧠 *Fingerprint* • \`${fingerprint}\`

↩️ *Referrer* • ${referer}
🖥 *User-Agent* • ${userAgent}
  `.trim();

  // Send async (non-blocking)
  (async () => {
    try {
      await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: process.env.CHAT_ID,
          text: message,
          parse_mode: 'Markdown'
        })
      });
    } catch (err) {
      console.error('Telegram log failed:', err);
    }
  })();

  next(); // continue to serve content
});

// Serve your static files (index.html, css, js, etc.)
app.use(express.static(path.join(__dirname, '.')));

// Optional SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => {
  console.log(`Listening on port ${port}`);
});
