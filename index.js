// index.js – reusable functions for image processing

/**
 * Loads a File into an Image object
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
 * @param {File} file - Input image file
 * @param {Object} options - Configuration
 * @param {number} [options.targetWidth] - Desired width (pixels)
 * @param {number} [options.targetHeight] - Desired height (pixels)
 * @param {number} [options.targetSizeKB] - Target max size in KB
 * @param {number} [options.initialQuality=0.92] - Starting JPEG quality
 * @param {number} [options.minQuality=0.1] - Lowest allowed quality
 * @returns {Promise<Blob>} Compressed JPEG Blob
 */
export async function resizeAndCompressImage(file, options = {}) {
  const {
    targetWidth,
    targetHeight,
    targetSizeKB,
    initialQuality = 0.92,
    minQuality = 0.1
  } = options;

  const img = await loadImage(file);

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

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, width, height);

  let quality = Math.max(initialQuality, minQuality);
  let blob;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    blob = await new Promise(resolve => {
      canvas.toBlob(resolve, 'image/jpeg', quality);
    });

    if (!targetSizeKB || blob.size <= targetSizeKB * 1024 || quality <= minQuality) {
      break;
    }

    quality -= 0.05;
    if (quality < minQuality) quality = minQuality;
  }

  return blob;
}

/**
 * Creates a temporary object URL for preview/download
 * @param {Blob} blob
 * @returns {string}
 */
export function createObjectURL(blob) {
  return URL.createObjectURL(blob);
}