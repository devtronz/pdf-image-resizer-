# PDF & Image Resizer

**Offline browser tool** to resize/compress images and convert photos to PDF — no uploads, no tracking, everything stays on your device.

Live demo: [https://your-render-url.onrender.com](https://your-render-url.onrender.com) (replace with your actual Render link)

GitHub: https://github.com/devtronz/pdf-image-resizer-

## Features

- Resize images to exact width/height (aspect ratio preserved)
- Compress images iteratively to target file size (KB/MB)
- Preview original & resized image
- Download resized JPEG
- Convert multiple images to single PDF (coming soon / in progress)
- 100% client-side — no server processing of your files
- No tracking, no analytics, no third-party requests
- Privacy-focused: only optional first-party localStorage/cookies for UI preferences (if added later)

## Screenshots

(Add screenshots here later if you want — e.g. before/after resize, progress bar, download button)

## How to Use (Web Version)

1. Open the site
2. Select an image (or multiple for PDF later)
3. Set target width/height and/or max size
4. Click **Resize & Compress**
5. Preview result → click **Download**

All processing uses browser Canvas + JPEG export.

## NPM Package (Reusable Library)

The core resize/compress logic is available as a small, modular package:

```bash
npm install @devtronz/image-resize-compress