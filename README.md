# PDF & Image Resizer + Converter

**Offline, privacy-first web tool and library**  
Resize images, compress them to target file size, and convert multiple photos to a single PDF — all 100% in your browser. No uploads, no tracking, no third-party servers.

**Live demo**: [https://your-render-url.onrender.com](https://your-render-url.onrender.com) (replace with your actual hosted link)

**GitHub**: https://github.com/devtronz/pdf-image-resizer-

## Features

- Resize images to custom width/height (aspect ratio preserved)
- Iteratively compress JPEGs until they meet a target file size (KB/MB)
- Convert one or multiple images into a single PDF (A4 pages, centered, fit-to-page)
- Real-time progress bar & previews
- Download results as JPEG or PDF
- 100% client-side — files never leave your device
- No analytics, no cookies (except optional first-party for preferences later), no tracking

## NPM Package (Reusable Library)

The core processing logic is published as a small, modular package:

```bash
npm install @devtronz/image-resize-compress
