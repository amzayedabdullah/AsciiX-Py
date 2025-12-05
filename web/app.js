let asciiText = "";

function loadImage() {
  const input = document.getElementById("imageInput");
  return new Promise((resolve, reject) => {
    if (!input.files[0]) return reject("No file selected");
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(input.files[0]);
  });
}

function imageToCanvas(imgSrc, targetWidth = 120) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const ratio = img.height / img.width;
      canvas.width = targetWidth;
      canvas.height = Math.round(targetWidth * ratio);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas);
    };
    img.src = imgSrc;
  });
}

// Compute perceived brightness (luminance)
function getLuminance(r, g, b) {
  return 0.2126*r + 0.7152*g + 0.0722*b;
}

async function generateASCII() {
  try {
    const imgSrc = await loadImage();
    const canvas = await imageToCanvas(imgSrc, 120);
    const ctx = canvas.getContext("2d");
    const { width: w, height: h } = canvas;
    const data = ctx.getImageData(0, 0, w, h).data;

    const asciiChars = "@#W&8%B@$O0QLCJUYXzvucxnvrjft/\\|()1{}[]?-=+~:,. "; 
    const len = asciiChars.length;

    let result = "";

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const r = data[idx], g = data[idx+1], b = data[idx+2];
        const lum = getLuminance(r, g, b); // 0..255
        const charIndex = Math.floor((lum / 255) * (len - 1));
        const c = asciiChars[len - 1 - charIndex];
        result += c;
      }
      result += "\n";
    }

    asciiText = result;
    const output = document.getElementById("output");
    output.style.opacity = 0;
    output.textContent = asciiText;
    setTimeout(() => output.style.opacity = 1, 50);
  } catch (err) {
    alert(err);
  }
}

async function generateCircle() {
  try {
    const imgSrc = await loadImage();
    const canvas = await imageToCanvas(imgSrc, 120);
    const ctx = canvas.getContext("2d");
    const { width: w, height: h } = canvas;
    const data = ctx.getImageData(0, 0, w, h).data;
    const asciiChars = "@#W&8%B@$O0QLCJUYXzvucxnvrjft/\\|()1{}[]?-=+~:,. "; 
    const len = asciiChars.length;

    const cx = w/2, cy = h/2;
    const maxr = Math.min(cx, cy);

    let result = "";

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = x - cx, dy = y - cy;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > maxr) {
          result += " ";
        } else {
          const idx = (y * w + x) * 4;
          const r = data[idx], g = data[idx+1], b = data[idx+2];
          const lum = getLuminance(r, g, b);
          const charIndex = Math.floor((lum / 255) * (len - 1));
          const c = asciiChars[len - 1 - charIndex];
          result += c;
        }
      }
      result += "\n";
    }

    asciiText = result;
    const output = document.getElementById("output");
    output.style.opacity = 0;
    output.textContent = asciiText;
    setTimeout(() => output.style.opacity = 1, 50);
  } catch (err) {
    alert(err);
  }
}

function downloadTXT() {
  const blob = new Blob([asciiText], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "ascii_art.txt";
  a.click();
}

function downloadPNG() {
  const lines = asciiText.split("\n");
  const fontSize = 9;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = lines[0].length * (fontSize * 0.6);
  canvas.height = lines.length * fontSize;
  ctx.fillStyle = "#0b0b0b";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ddd";
  ctx.font = `${fontSize}px Consolas`;
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], 0, (i + 1) * fontSize);
  }
  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = "ascii_art.png";
  a.click();
}
