// index.js - Core export for the future npm package

/**
 * Loads an image file into an HTMLImageElement
 * @param {File} file - The input image file
 * @returns {Promise<HTMLImageElement>}
 */
export function loadImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Resizes and compresses an image to target dimensions and/or file size
 * @param {File} file - Input image file (JPEG, PNG, etc.)
 * @param {Object} options - Configuration
 * @param {number} [options.targetWidth] - Desired width in pixels (height auto-scaled)
 * @param {number} [options.targetHeight] - Desired height in pixels (width auto-scaled)
 * @param {number} [options.targetSizeKB] - Target maximum file size in KB
 * @param {number} [options.initialQuality=0.92] - Starting JPEG quality (0.1 to 1.0)
 * @param {number} [options.minQuality=0.1] - Lowest allowed quality before stopping
 * @returns {Promise<Blob>} - The final compressed JPEG Blob
 */
export async function resizeAndCompressImage(file, options = {}) {
  const {
    targetWidth,
    targetHeight,
    targetSizeKB,
    initialQuality = 0.92,
    minQuality = 0.1
  } = options;

  // Step 1: Load image
  const img = await loadImage(file);

  // Step 2: Calculate new dimensions (preserve aspect ratio)
  let width = img.width;
  let height = img.height;

  if (targetWidth) {
    width = targetWidth;
    height = Math.round(img.height * (width / img.width));
  }

  if (targetHeight) {
    height = targetHeight;
    width = Math.round(img.width * (height / img.height));
  }

  // Step 3: Draw on canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, width, height);

  // Step 4: Iterative compression to meet target size
  let quality = Math.max(initialQuality, minQuality);
  let blob;

  while (true) {
    blob = await new Promise(resolve => {
      canvas.toBlob(resolve, 'image/jpeg', quality);
    });

    // Stop if: no target size OR size is good OR quality is too low
    if (!targetSizeKB || blob.size <= targetSizeKB * 1024 || quality <= minQuality) {
      break;
    }

    // Reduce quality more aggressively if needed
    quality -= 0.05;
    if (quality < minQuality) quality = minQuality;
  }

  return blob;
}

// Optional helper: create object URL for preview/download
export function createObjectURL(blob) {
  return URL.createObjectURL(blob);
}