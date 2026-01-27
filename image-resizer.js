function resizeImage() {
  const fileInput = document.getElementById("image");
  const widthInput = document.getElementById("width");
  const heightInput = document.getElementById("height");
  const targetKBInput = document.getElementById("targetKB");

  const file = fileInput.files[0];
  if (!file) {
    alert("Please select an image");
    return;
  }

  const targetWidth = parseInt(widthInput.value);
  const targetHeight = parseInt(heightInput.value);
  const targetKB = parseInt(targetKBInput.value);

  const reader = new FileReader();
  const img = new Image();

  reader.onload = function (e) {
    img.onload = function () {
      const canvas = document.createElement("canvas");
      canvas.width = targetWidth || img.width;
      canvas.height = targetHeight || img.height;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // No KB limit → normal resize
      if (!targetKB) {
        download(canvas.toDataURL("image/png"), "resized.png");
        return;
      }

      // Compress to target KB
      let quality = 0.9;
      let dataURL = "";
      let sizeKB = 0;

      while (quality > 0.1) {
        dataURL = canvas.toDataURL("image/jpeg", quality);
        sizeKB = Math.round((dataURL.length * 3) / 4 / 1024);

        if (sizeKB <= targetKB) break;
        quality -= 0.05;
      }

      download(dataURL, "resized-compressed.jpg");
    };

    img.src = e.target.result;
  };

  reader.readAsDataURL(file);
}

function download(dataURL, filename) {
  const a = document.createElement("a");
  a.href = dataURL;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}