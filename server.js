// server.js
const express = require('express');
const crypto = require('crypto');
const path = require('path');
const fetch = require('node-fetch'); // still needed for async Telegram send

const app = express();

// ─── Helpers (same as your original) ───
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

// ─── Middleware: Visitor logging to Telegram (adapted for Express) ───
app.use(async (req, res, next) => {
  const url = new URL(req.protocol + '://' + req.get('host') + req.originalUrl);

  // IP handling (Render passes via headers; fallback to req.ip)
  const ip = req.headers['cf-connecting-ip'] ||
             (req.headers['x-forwarded-for']?.split(',')[0]?.trim()) ||
             req.ip ||
             'unknown';

  const referer = req.headers.referer || 'direct';
  const userAgent = req.headers['user-agent'] || 'unknown';
  const language = req.headers['accept-language'] || 'unknown';

  // No Cloudflare cf object → geo remains unknown (or add free ipapi.co fetch later if needed)
  const country = 'unknown';
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

  // Async non-blocking send to Telegram
  (async () => {
    try {
      const response = await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: process.env.CHAT_ID,
          text: message,
          parse_mode: 'Markdown'
        })
      });
      if (!response.ok) {
        console.error('Telegram send failed:', await response.text());
      }
    } catch (err) {
      console.error('Telegram fetch error:', err);
    }
  })();

  next(); // Proceed to serve static files or other routes
});

// Serve static files from repo root (index.html, css, js, etc.)
app.use(express.static(path.join(__dirname, '.')));

// Optional: SPA-style fallback for any unmatched route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ─── Port & Host Setup (critical for Render!) ───
const port = process.env.PORT || 10000;  // Render provides PORT=10000 by default
const host = '0.0.0.0';                  // Required: listen on all interfaces

app.listen(port, host, () => {
  console.log(`Server listening on http://\( {host}: \){port}`);
});