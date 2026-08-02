// pdf.js – Clean multi-image to PDF converter

const previewList  = document.getElementById("previewList");
const progressFill = document.getElementById("progressFill");
const progressText = document.getElementById("progressText");

function setProgress(percent, text) {
  if (progressFill) progressFill.style.width = percent + "%";
  if (progressText) progressText.textContent = text;
}

// Preview selected images
document.getElementById("images")?.addEventListener("change", (e) => {
  previewList.innerHTML = "";
  const files = e.target.files;

  Array.from(files).forEach((file) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = document.createElement("img");
      img.src = reader.result;
      previewList.appendChild(img);
    };
    reader.readAsDataURL(file);
  });

  setProgress(5, files.length + " image(s) selected");
});

// Create PDF
async function makePDF() {
  const files = document.getElementById("images")?.files;
  if (!files || files.length === 0) {
    alert("Please select at least one image");
    return;
  }

  setProgress(10, "Creating PDF…");

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const pageWidth  = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  for (let i = 0; i < files.length; i++) {
    setProgress(
      Math.round(((i + 1) / files.length) * 90),
      `Adding image ${i + 1} of ${files.length}`
    );

    const dataUrl = await readFileAsDataURL(files[i]);
    const img     = await loadImage(dataUrl);

    // Fit image inside page while keeping aspect ratio
    const ratio = Math.min(
      pageWidth  / img.width,
      pageHeight / img.height
    );

    const imgWidth  = img.width  * ratio;
    const imgHeight = img.height * ratio;
    const x = (pageWidth  - imgWidth)  / 2;
    const y = (pageHeight - imgHeight) / 2;

    if (i > 0) pdf.addPage();

    // Detect format
    const format = files[i].type.includes("png") ? "PNG" : "JPEG";
    pdf.addImage(img, format, x, y, imgWidth, imgHeight);
  }

  setProgress(100, "PDF ready");
  pdf.save("photos.pdf");
}

// Helpers
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload  = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}