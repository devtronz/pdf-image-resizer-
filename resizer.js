function resizeImage() {
  const file = document.getElementById("img").files[0];
  if (!file) return alert("Select an image");

  const sizeValue = document.getElementById("sizeValue").value;
  const sizeUnit = document.getElementById("sizeUnit").value;
  const targetWidth = document.getElementById("width").value;
  const targetHeight = document.getElementById("height").value;

  const img = new Image();
  const reader = new FileReader();

  reader.onload = e => {
    img.src = e.target.result;
  };

  img.onload = () => {
    let width = img.width;
    let height = img.height;

    if (targetWidth) {
      width = parseInt(targetWidth);
      height = Math.round((img.height / img.width) * width);
    }

    if (targetHeight) {
      height = parseInt(targetHeight);
      width = Math.round((img.width / img.height) * height);
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = width;
    canvas.height = height;

    ctx.drawImage(img, 0, 0, width, height);

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
          const link = document.getElementById("download");
          link.href = url;
          link.textContent =
            "Download (" + Math.round(blob.size / 1024) + " KB)";
        }
      }, "image/jpeg", quality);
    }

    compress();
  };

  reader.readAsDataURL(file);
}