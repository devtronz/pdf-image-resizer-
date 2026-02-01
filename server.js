// server.js - Minimal static file server - NO logging, NO tracking, NO Telegram

const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Serve static files from the current directory (root)
app.use(express.static(path.join(__dirname, '.')));

// Fallback for SPA/any route → serve index.html (important for client-side routing if you have it)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port} — serving static files only`);
});