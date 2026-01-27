const previewList = document.getElementById("previewList");
const progressFill = document.getElementById("progressFill");
const progressText = document.getElementById("progressText");

function setProgress(percent, text) {
  progressFill.style.width = percent + "%";
  progressText.textContent = text;
}

document.getElementById("images").addEventListener("change", e => {
  previewList.innerHTML = "";
  const files = e.target.files;

  Array.from(files).forEach(file => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = document.createElement("img");
      img.src = reader.result;
      previewList.appendChild(img);
    };
    reader.readAsDataURL(file);
  });

  setProgress(5, files.length + " images selected");
});

async function makePDF() {
  const files = document.getElementById("images").files;
  if (!files.length) return alert("Select images");

  setProgress(10, "Creating PDF…");

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();

  for (let i = 0; i < files.length; i++) {
    setProgress(
      Math.round(((i + 1) / files.length) * 90),
      "Adding image " + (i + 1) + " of " + files.length
    );

    const dataUrl = await readFile(files[i]);
    const img = await loadImage(dataUrl);

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const ratio = Math.min(
      pageWidth / img.width,
      pageHeight / img.height
    );

    const imgWidth = img.width * ratio;
    const imgHeight = img.height * ratio;

    const x = (pageWidth - imgWidth) / 2;
    const y = (pageHeight - imgHeight) / 2;

    if (i !== 0) pdf.addPage();
    pdf.addImage(img, "JPEG", x, y, imgWidth, imgHeight);
  }

  setProgress(100, "PDF ready");
  pdf.save("photos.pdf");
}

/* helpers */
function readFile(file) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.src = src;
  });
}