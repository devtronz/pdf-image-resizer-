function resize() {
  const file = document.getElementById("img").files[0];
  const kb = document.getElementById("kb").value;
  if (!file) return alert("Select image");

  const img = new Image();
  img.onload = () => {
    const c = document.createElement("canvas");
    c.width = img.width;
    c.height = img.height;
    c.getContext("2d").drawImage(img, 0, 0);

    let q = 0.9, data;
    do {
      data = c.toDataURL("image/jpeg", q);
      q -= 0.05;
    } while (data.length / 1024 > kb && q > 0.1);

    const a = document.getElementById("download");
    a.href = data;
    a.download = "resized.jpg";
    a.textContent = "Download Image";
  };
  img.src = URL.createObjectURL(file);
}