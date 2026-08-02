// Professional Image Resizer – Cross-browser (Chrome, Safari, Firefox, iOS)

const imgInput        = document.getElementById("img");
const uploadText      = document.getElementById("uploadText");
const fileInfo        = document.getElementById("fileInfo");
const originalPreview = document.getElementById("originalPreview");
const resizedPreview  = document.getElementById("resizedPreview");
const originalInfo    = document.getElementById("originalInfo");
const resultInfo      = document.getElementById("resultInfo");
const processBtn      = document.getElementById("processBtn");
const downloadBtn     = document.getElementById("downloadBtn");
const progressWrap    = document.getElementById("progressWrap");
const progressFill    = document.getElementById("progressFill");
const progressText    = document.getElementById("progressText");
const qualitySlider   = document.getElementById("quality");
const qualityLabel    = document.getElementById("qualityLabel");
const aspectSelect    = document.getElementById("aspectRatio");
const customRatioField= document.getElementById("customRatioField");

let currentFile = null;
let resultBlob  = null;

// Detect WebP support
function supportsWebP() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  return canvas.toDataURL("image/webp").startsWith("data:image/webp");
}

// Quality label
qualitySlider.addEventListener("input", () => {
  qualityLabel.textContent = qualitySlider.value + "%";
});

// Custom ratio toggle
aspectSelect.addEventListener("change", () => {
  customRatioField.style.display =
    aspectSelect.value === "custom" ? "block" : "none";
});

// File selected
imgInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  currentFile = file;
  resultBlob = null;
  downloadBtn.style.display = "none";
  resizedPreview.removeAttribute("src");
  resultInfo.textContent = "";

  uploadText.textContent = file.name;
  fileInfo.textContent = `${(file.size / 1024).toFixed(1)} KB • ${file.type || "image"}`;

  try {
    const img = await loadImage(file);
    originalPreview.src = URL.createObjectURL(file);
    originalInfo.textContent = `${img.width} × ${img.height} px`;
    processBtn.disabled = false;
  } catch {
    alert("Could not load this image. Try another file.");
    processBtn.disabled = true;
  }
});

// Drag & drop support
const uploadArea = document.querySelector(".upload-area");
uploadArea.addEventListener("dragover", (e) => {
  e.preventDefault();
  uploadArea.style.borderColor = "var(--primary)";
});
uploadArea.addEventListener("dragleave", () => {
  uploadArea.style.borderColor = "";
});
uploadArea.addEventListener("drop", (e) => {
  e.preventDefault();
  uploadArea.style.borderColor = "";
  if (e.dataTransfer.files.length) {
    imgInput.files = e.dataTransfer.files;
    imgInput.dispatchEvent(new Event("change"));
  }
});

// Main process
processBtn.addEventListener("click", async () => {
  if (!currentFile) return;

  processBtn.disabled = true;
  progressWrap.style.display = "block";
  setProgress(10, "Loading image…");

  try {
    const img = await loadImage(currentFile);
    setProgress(35, "Resizing…");

    // Settings
    let width  = parseInt(document.getElementById("width").value)  || 0;
    let height = parseInt(document.getElementById("height").value) || 0;
    const ratioMode = aspectSelect.value;
    const customW = parseInt(document.getElementById("customW").value) || 16;
    const customH = parseInt(document.getElementById("customH").value) || 9;
    let format = document.getElementById("format").value;
    const quality = parseInt(qualitySlider.value) / 100;
    const maxSizeVal = parseFloat(document.getElementById("maxSize").value) || 0;
    const sizeUnit = document.getElementById("sizeUnit").value;

    // Force JPEG on browsers that don't support WebP export
    if (format === "image/webp" && !supportsWebP()) {
      format = "image/jpeg";
      console.warn("WebP not supported → using JPEG");
    }

    // Calculate dimensions
    let targetW = img.width;
    let targetH = img.height;

    const getRatio = () => {
      if (ratioMode === "square") return 1;
      if (ratioMode === "16:9") return 16 / 9;
      if (ratioMode === "4:3") return 4 / 3;
      if (ratioMode === "9:16") return 9 / 16;
      if (ratioMode === "custom") return customW / customH;
      return null;
    };

    const aspect = getRatio();

    if (width && height) {
      targetW = width;
      targetH = height;
    } else if (width) {
      targetW = width;
      targetH = aspect ? Math.round(width / aspect) : Math.round(img.height * (width / img.width));
    } else if (height) {
      targetH = height;
      targetW = aspect ? Math.round(height * aspect) : Math.round(img.width * (height / img.height));
    } else if (aspect) {
      // Only ratio given → fit to original width
      targetW = img.width;
      targetH = Math.round(targetW / aspect);
    }

    // Draw high quality
    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, targetW, targetH);

    setProgress(60, "Compressing…");

    // Target bytes
    let targetBytes = null;
    if (maxSizeVal > 0) {
      targetBytes = sizeUnit === "mb" ? maxSizeVal * 1024 * 1024 : maxSizeVal * 1024;
    }

    // Compress loop
    let q = quality;
    let blob = null;

    while (q >= 0.1) {
      blob = await canvasToBlob(canvas, format, q);
      if (!blob) break;
      if (!targetBytes || blob.size <= targetBytes) break;
      q -= 0.05;
    }

    if (!blob) throw new Error("Failed to create image");

    resultBlob = blob;
    setProgress(100, "Done");

    // Show result
    const url = URL.createObjectURL(blob);
    resizedPreview.src = url;

    const saved = ((1 - blob.size / currentFile.size) * 100).toFixed(1);
    resultInfo.textContent =
      `${(blob.size / 1024).toFixed(1)} KB • \( {targetW}× \){targetH} px • ${saved}% smaller`;

    downloadBtn.style.display = "block";

  } catch (err) {
    console.error(err);
    alert("Error: " + err.message);
    setProgress(0, "Error");
  } finally {
    processBtn.disabled = false;
  }
});

// Download (Safari-friendly)
downloadBtn.addEventListener("click", () => {
  if (!resultBlob) return;

  const format = document.getElementById("format").value;
  const ext = format.includes("png") ? "png" :
              format.includes("webp") && supportsWebP() ? "webp" : "jpg";

  const name = `resized-\( {Date.now()}. \){ext}`;
  const url = URL.createObjectURL(resultBlob);

  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1500);
});

// Helpers
function setProgress(percent, text) {
  progressFill.style.width = percent + "%";
  progressText.textContent = text;
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Invalid image"));
    img.src = URL.createObjectURL(file);
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => {
    if (canvas.toBlob) {
      canvas.toBlob((blob) => resolve(blob), type, quality);
    } else {
      // Very old Safari fallback
      const dataURL = canvas.toDataURL(type, quality);
      const bin = atob(dataURL.split(",")[1]);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      resolve(new Blob([arr], { type }));
    }
  });
}