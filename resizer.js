const originalPreview = document.getElementById("originalPreview");
const resizedPreview = document.getElementById("resizedPreview");
const progressFill = document.getElementById("progressFill");
const progressText = document.getElementById("progressText");

function setProgress(percent, text) {
  progressFill.style.width = percent + "%";
  progressText.textContent = text;
}

document.getElementById("img").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;

  setProgress(5, "Image selected");

  const reader = new FileReader();
  reader.onload = () => {
    originalPreview.src = reader.result;
    resizedPreview.src = "";
  };
  reader.readAsDataURL(file);
});

function resizeImage() {
  const file = document.getElementById("img").files[0];
  if (!file) return alert("Select an image");

  setProgress(10, "Loading image…");

  const sizeValue = document.getElementById("sizeValue").value;
  const sizeUnit = document.getElementById("sizeUnit").value;
  const targetWidth = document.getElementById("width").value;
  const targetHeight = document.getElementById("height").value;

  const img = new Image();
  const reader = new FileReader();

  reader.onload = e => img.src = e.target.result;

  img.onload = () => {
    setProgress(40, "Resizing image…");

    let width = img.width;
    let height = img.height;

    if (targetWidth) {
      width = +targetWidth;
      height = Math.round(img.height * (width / img.width));
    }

    if (targetHeight) {
      height = +targetHeight;
      width = Math.round(img.width * (height / img.height));
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(img, 0, 0, width, height);

    setProgress(60, "Optimizing size…");

    let quality = 0.9;
    let targetBytes = null;

    if (sizeValue) {
      targetBytes =
        sizeUnit === "mb"
          ? sizeValue * 1024 * 1024
          : sizeValue * 1024;
    }

    function compress() {
      canvas.toBlob(blob => {
        if (targetBytes && blob.size > targetBytes && quality > 0.1) {
          quality -= 0.05;
          compress();
        } else {
          const url = URL.createObjectURL(blob);

          resizedPreview.src = url;

          const link = document.getElementById("download");
          link.href = url;
          link.textContent =
            "Download (" + Math.round(blob.size / 1024) + " KB)";

          setProgress(100, "Done! Ready to download");
        }
      }, "image/jpeg", quality);
    }

    compress();
  };

  reader.readAsDataURL(file);
}