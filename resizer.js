const imgInput = document.getElementById("img");
const uploadZone = document.getElementById("uploadZone");
const fileInfo = document.getElementById("fileInfo");
const originalPreview = document.getElementById("originalPreview");
const resizedPreview = document.getElementById("resizedPreview");
const originalPlaceholder = document.getElementById("originalPlaceholder");
const resultPlaceholder = document.getElementById("resultPlaceholder");
const originalInfo = document.getElementById("originalInfo");
const resultInfo = document.getElementById("resultInfo");
const processBtn = document.getElementById("processBtn");
const downloadBtn = document.getElementById("downloadBtn");
const progressWrap = document.getElementById("progressWrap");
const progressFill = document.getElementById("progressFill");
const progressText = document.getElementById("progressText");
const qualitySlider = document.getElementById("quality");
const qualityLabel = document.getElementById("qualityLabel");
const aspectSelect = document.getElementById("aspectRatio");
const customRatioField = document.getElementById("customRatioField");
const resizeModeInput = document.getElementById("resizeMode");
const percentField = document.getElementById("percentField");
const widthField = document.getElementById("widthField");
const heightField = document.getElementById("heightField");

let currentFile = null;
let resultBlob = null;

// WebP support
function supportsWebP() {
  const c = document.createElement("canvas");
  return c.toDataURL("image/webp").startsWith("data:image/webp");
}

// Quality label
qualitySlider.addEventListener("input", () => {
  qualityLabel.textContent = qualitySlider.value + "%";
});

// Segmented control
document.querySelectorAll(".seg-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".seg-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const mode = btn.dataset.mode;
    resizeModeInput.value = mode;
    percentField.style.display = mode === "percent" ? "block" : "none";
    widthField.style.display = mode === "percent" ? "none" : "block";
    heightField.style.display = mode === "percent" ? "none" : "block";
  });
});

// Custom ratio toggle
aspectSelect.addEventListener("change", () => {
  customRatioField.style.display = aspectSelect.value === "custom" ? "block" : "none";
});

// File select
imgInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  currentFile = file;
  resultBlob = null;
  downloadBtn.style.display = "none";
  resizedPreview.removeAttribute("src");
  resultPlaceholder.style.display = "block";
  resultInfo.textContent = "";

  fileInfo.style.display = "block";
  fileInfo.textContent = `${file.name} • ${(file.size / 1024).toFixed(1)} KB`;

  try {
    const img = await loadImage(file);
    originalPreview.src = URL.createObjectURL(file);
    originalPlaceholder.style.display = "none";
    originalInfo.textContent = `${img.width} × ${img.height} px`;
    processBtn.disabled = false;
  } catch {
    alert("Could not load image");
    processBtn.disabled = true;
  }
});

// Drag & drop
uploadZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  uploadZone.classList.add("dragover");
});
uploadZone.addEventListener("dragleave", () => uploadZone.classList.remove("dragover"));
uploadZone.addEventListener("drop", (e) => {
  e.preventDefault();
  uploadZone.classList.remove("dragover");
  if (e.dataTransfer.files.length) {
    imgInput.files = e.dataTransfer.files;
    imgInput.dispatchEvent(new Event("change"));
  }
});

// Process
processBtn.addEventListener("click", async () => {
  if (!currentFile) return;
  processBtn.disabled = true;
  progressWrap.style.display = "block";
  setProgress(10, "Loading…");

  try {
    const img = await loadImage(currentFile);
    setProgress(30, "Calculating…");

    let targetW = img.width;
    let targetH = img.height;

    const mode = resizeModeInput.value;
    const percent = parseFloat(document.getElementById("percent").value) || 100;
    const inputW = parseInt(document.getElementById("width").value) || 0;
    const inputH = parseInt(document.getElementById("height").value) || 0;
    const ratioMode = aspectSelect.value;
    const customW = parseInt(document.getElementById("customW").value) || 16;
    const customH = parseInt(document.getElementById("customH").value) || 9;

    const getAspect = () => {
      if (ratioMode === "square") return 1;
      if (ratioMode === "16:9") return 16 / 9;
      if (ratioMode === "4:3") return 4 / 3;
      if (ratioMode === "9:16") return 9 / 16;
      if (ratioMode === "custom") return customW / customH;
      return null;
    };
    const aspect = getAspect();

    if (mode === "percent") {
      const scale = Math.max(1, percent) / 100;
      targetW = Math.round(img.width * scale);
      targetH = Math.round(img.height * scale);
    } else {
      if (inputW && inputH) {
        targetW = inputW;
        targetH = inputH;
      } else if (inputW) {
        targetW = inputW;
        targetH = aspect ? Math.round(inputW / aspect) : Math.round(img.height * (inputW / img.width));
      } else if (inputH) {
        targetH = inputH;
        targetW = aspect ? Math.round(inputH * aspect) : Math.round(img.width * (inputH / img.height));
      } else if (aspect) {
        targetW = img.width;
        targetH = Math.round(targetW / aspect);
      }
    }

    targetW = Math.max(1, targetW);
    targetH = Math.max(1, targetH);

    setProgress(50, "Resizing…");

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, targetW, targetH);

    let format = document.getElementById("format").value;
    if (format === "image/webp" && !supportsWebP()) format = "image/jpeg";

    const quality = parseInt(qualitySlider.value) / 100;
    const maxSizeVal = parseFloat(document.getElementById("maxSize").value) || 0;
    const sizeUnit = document.getElementById("sizeUnit").value;
    let targetBytes = maxSizeVal > 0
      ? (sizeUnit === "mb" ? maxSizeVal * 1024 * 1024 : maxSizeVal * 1024)
      : null;

    setProgress(70, "Compressing…");

    let q = quality;
    let blob = null;
    while (q >= 0.1) {
      blob = await canvasToBlob(canvas, format, q);
      if (!blob || !targetBytes || blob.size <= targetBytes) break;
      q -= 0.05;
    }

    if (!blob) throw new Error("Failed to create image");

    resultBlob = blob;
    setProgress(100, "Done");

    const url = URL.createObjectURL(blob);
    resizedPreview.src = url;
    resultPlaceholder.style.display = "none";

    const originalKB = (currentFile.size / 1024).toFixed(1);
    const newKB = (blob.size / 1024).toFixed(1);
    const ratio = blob.size / currentFile.size;
    const change = ((1 - ratio) * 100).toFixed(1);
    const changeText = ratio < 1 ? `\( {change}% smaller` : ratio > 1 ? ` \){Math.abs(change)}% larger` : "same size";

    resultInfo.innerHTML = `<strong>${newKB} KB</strong> • \( {targetW}× \){targetH} px<br>${changeText} (was ${originalKB} KB)`;

    downloadBtn.style.display = "block";
  } catch (err) {
    console.error(err);
    alert("Error: " + err.message);
    setProgress(0, "Error");
  } finally {
    processBtn.disabled = false;
  }
});

// Download
downloadBtn.addEventListener("click", () => {
  if (!resultBlob) return;
  const format = document.getElementById("format").value;
  const ext = format.includes("png") ? "png" : (format.includes("webp") && supportsWebP() ? "webp" : "jpg");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(resultBlob);
  a.download = `resized-\( {Date.now()}. \){ext}`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  }, 1500);
});

function setProgress(p, text) {
  progressFill.style.width = p + "%";
  progressText.textContent = text;
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise(resolve => {
    if (canvas.toBlob) {
      canvas.toBlob(resolve, type, quality);
    } else {
      const data = canvas.toDataURL(type, quality);
      const bin = atob(data.split(",")[1]);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      resolve(new Blob([arr], { type }));
    }
  });
}