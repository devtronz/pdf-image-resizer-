async function makePDF() {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();
  const files = document.getElementById("images").files;

  for (let i = 0; i < files.length; i++) {
    const img = await load(files[i]);
    const w = pdf.internal.pageSize.getWidth();
    const h = (img.height * w) / img.width;
    if (i > 0) pdf.addPage();
    pdf.addImage(img, "JPEG", 0, 0, w, h);
  }

  pdf.save("photos.pdf");
}

function load(file) {
  return new Promise(res => {
    const img = new Image();
    img.onload = () => res(img);
    img.src = URL.createObjectURL(file);
  });
}