// resizer.js – Clean & error-free

const originalPreview = document.getElementById("originalPreview");
const resizedPreview  = document.getElementById("resizedPreview");
const progressFill    = document.getElementById("progressFill");
const progressText    = document.getElementById("progressText");
const resultInfo      = document.getElementById("resultInfo");
const downloadBtn     = document.getElementById("downloadBtn");
const qualitySlider   = document.getElementById("qualitySlider");
const qualityValue    = document.getElementById("qualityValue");

// Quality label
if (qualitySlider && qualityValue) {
  qualitySlider.addEventListener("input", () => {
    qualityValue.textContent = qualitySlider.value + "%";
  });
}

// Custom ratio toggle
const aspectSelect = document.getElementById("aspectRatio");
const customRatioInputs = document.getElementById("customRatioInputs");
if (aspectSelect && customRatioInputs) {
  aspectSelect.addEventListener("change", () => {
    customRatioInputs.style.display =
      aspectSelect.value === "custom" ? "flex" : "none";
  });
}

// Progress helper
function setProgress(percent, text) {
  if (progressFill) progressFill.style.width = percent + "%";
  if (progressText) progressText.textContent = text;
}

// Show original preview
document.getElementById("img")?.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  setProgress(5, "Image selected");
  if (resultInfo) resultInfo.style.display = "none";
  if (downloadBtn) downloadBtn.style.display = "none";
  if (resizedPreview) resizedPreview.src = "";

  const reader = new FileReader();
  reader.onload = () => {
    if (originalPreview) originalPreview.src = reader.result;
  };
  reader.readAsDataURL(file);
});

// Aspect ratio helper
function getAspectRatio(mode, customW = 16, customH = 9) {
  switch (mode) {
    case "square":         return 1;
    case "landscape_16_9": return 16 / 9;
    case "photo_4_3":      return 4 / 3;
    case "portrait_9_16":  return 9 / 16;
    case "custom":         return customW / customH;
    default:               return null;
  }
}

// Canvas → Blob
function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });
}

// Main resize function
async function resizeImage() {
  const fileInput = document.getElementById("img");
  const file = fileInput?.files[0];

  if (!file) {
    alert("Please select an image first!");
    return;
  }

  setProgress(10, "Loading image…");

  try {
    const targetWidth  = parseInt(document.getElementById("width")?.value) || 0;
    const ratioMode    = document.getElementById("aspectRatio")?.value || "free";
    const customW      = parseInt(document.getElementById("customRatioW")?.value) || 16;
    const customH      = parseInt(document.getElementById("customRatioH")?.value) || 9;
    const outputFormat = document.getElementById("outputFormat")?.value || "image/jpeg";
    const baseQuality  = (parseInt(qualitySlider?.value) || 85) / 100;
    const sizeValue    = parseFloat(document.getElementById("sizeValue")?.value) || 0;
    const sizeUnit     = document.getElementById("sizeUnit")?.value || "kb";

    const img = await loadImage(file);
    setProgress(40, "Resizing…");

    let width  = img.width;
    let height = img.height;
    const aspectRatio = getAspectRatio(ratioMode, customW, customH);

    if (targetWidth > 0) {
      width = targetWidth;
      height = aspectRatio !== null
        ? Math.round(width / aspectRatio)
        : Math.round(img.height * (width / img.width));
    }

    const canvas = document.createElement("canvas");
    canvas.width  = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d", { alpha: false });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, width, height);

    setProgress(60, "Compressing…");

    let targetBytes = null;
    if (sizeValue > 0) {
      targetBytes = sizeUnit === "mb"
        ? sizeValue * 1024 * 1024
        : sizeValue * 1024;
    }

    let quality = baseQuality;
    let blob = null;

    while (quality >= 0.1) {
      blob = await canvasToBlob(canvas, outputFormat, quality);
      if (!targetBytes || blob.size <= targetBytes) break;
      quality -= 0.05;
    }

    if (!blob) throw new Error("Failed to create image");

    setProgress(100, "Done!");

    const dataUrl = URL.createObjectURL(blob);
    if (resizedPreview) resizedPreview.src = dataUrl;

    // Result info
    if (resultInfo) {
      const originalKB = (file.size / 1024).toFixed(1);
      const newKB      = (blob.size / 1024).toFixed(1);
      const saved      = ((1 - blob.size / file.size) * 100).toFixed(1);

      resultInfo.style.display = "block";
      resultInfo.innerHTML = `
        <strong>Original:</strong> ${originalKB} KB<br>
        <strong>Resized:</strong> ${newKB} KB<br>
        <strong>Dimensions:</strong> ${width} × ${height} px<br>
        <strong>Saved:</strong> ${saved}%
      `;
    }

    // Download button
    if (downloadBtn) {
      const ext = outputFormat.includes("webp") ? "webp"
                : outputFormat.includes("png")  ? "png" : "jpg";

      downloadBtn.href = dataUrl;
      downloadBtn.download = `resized-\( {width}x \){height}.${ext}`;
      downloadBtn.style.display = "inline-block";
    }

  } catch (err) {
    console.error(err);
    setProgress(0, "Error");
    alert("Failed to process image: " + err.message);
  }
}

// Helper
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload  = () => resolve(img);
      img.onerror = () => reject(new Error("Could not load image"));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

// Button
document.getElementById("resizeBtn")?.addEventListener("click", resizeImage);