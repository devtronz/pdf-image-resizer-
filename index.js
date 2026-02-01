/**
 * Loads a File or Blob into an HTMLImageElement
 * @param {File|Blob} file - Input file or blob
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
 * @param {File|Blob} file - Input image
 * @param {Object} options
 * @param {number} [options.targetWidth] Desired width (pixels)
 * @param {number} [options.targetHeight] Desired height (pixels)
 * @param {number} [options.targetSizeKB] Target max size in KB
 * @param {number} [options.initialQuality=0.92] Starting JPEG quality
 * @param {number} [options.minQuality=0.1] Lowest allowed quality
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
 * Converts one or more images into a single PDF
 * @param {File[]|Blob[]} images - Array of images
 * @param {Object} [options]
 * @param {number} [options.pageWidth=595] A4 width (pt)
 * @param {number} [options.pageHeight=842] A4 height (pt)
 * @param {boolean} [options.fitToPage=true] Scale to fit page
 * @param {number} [options.quality=0.85] JPEG quality
 * @param {number} [options.margin=30] Margin around image (pt)
 * @returns {Promise<Blob>} PDF Blob
 */
export async function imagesToPDF(images, options = {}) {
  if (!images || images.length === 0) {
    throw new Error("No images provided");
  }

  const {
    pageWidth = 595,
    pageHeight = 842,
    fitToPage = true,
    quality = 0.85,
    margin = 30
  } = options;

  // jsPDF is loaded globally via <script src="jspdf.umd.min.js">
  const { jsPDF } = window.jspdf;

  if (!jsPDF) {
    throw new Error("jsPDF not loaded. Include jspdf.umd.min.js in HTML.");
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: [pageWidth, pageHeight]
  });

  for (let i = 0; i < images.length; i++) {
    const file = images[i];

    const img = await loadImage(file);

    let drawWidth = img.width;
    let drawHeight = img.height;

    if (fitToPage) {
      const availW = pageWidth - margin * 2;
      const availH = pageHeight - margin * 2;
      const ratio = Math.min(availW / drawWidth, availH / drawHeight);
      drawWidth *= ratio;
      drawHeight *= ratio;
    }

    // Compress for better PDF size
    const compressedBlob = await resizeAndCompressImage(file, {
      targetWidth: drawWidth,
      initialQuality: quality,
      minQuality: 0.5
    });

    const imgData = await new Promise(r => {
      const fr = new FileReader();
      fr.onload = () => r(fr.result);
      fr.readAsDataURL(compressedBlob);
    });

    if (i > 0) doc.addPage();

    const x = (pageWidth - drawWidth) / 2;
    const y = (pageHeight - drawHeight) / 2;

    doc.addImage(imgData, 'JPEG', x, y, drawWidth, drawHeight);
  }

  return doc.output('blob');
}

/**
 * Creates temporary object URL for preview/download
 * @param {Blob} blob
 * @returns {string}
 */
export function createObjectURL(blob) {
  return URL.createObjectURL(blob);
}