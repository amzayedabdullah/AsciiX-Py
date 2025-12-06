// script.js — AsciiX (theme X, circular portrait default, improved filtering)

const $ = id => document.getElementById(id);

// elements
const imageInput = $('imageInput');
const asciiImageOutput = $('asciiImageOutput');
const procCanvas = $('procCanvas');

const charsRange = $('charsRange');
const charsRangeVal = $('charsRangeVal');
const brightness = $('brightness');
const brightnessVal = $('brightnessVal');
const contrast = $('contrast');
const contrastVal = $('contrastVal');
const sharpen = $('sharpen');
const sharpenVal = $('sharpenVal');
const spaceDensity = $('spaceDensity');
const spaceDensityVal = $('spaceDensityVal');
const grayscale = $('grayscale');
const invert = $('invert');
const asciiGradient = $('asciiGradient');
const circleMask = $('circleMask');

const resetFilters = $('resetFilters');
const copyImageAscii = $('copyImageAscii');
const downloadImageAscii = $('downloadImageAscii');

const themeToggle = $('themeToggle');
const themeIcon = $('themeIcon');

const textInput = $('textInput');
const fontSelect = $('fontSelect');
const convertTextBtn = $('convertText');
const asciiTextOutput = $('asciiTextOutput');
const downloadTextBtn = $('downloadText');
const letterSpacing = $('letterSpacing');
const letterSpacingVal = $('letterSpacingVal');

const searchBtn = $('searchBtn');
const searchBox = $('searchBox');

let lastDataURL = null;

// small helpers
function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
function setLabels(){
  charsRangeVal.textContent = charsRange.value;
  brightnessVal.textContent = brightness.value;
  contrastVal.textContent = contrast.value;
  sharpenVal.textContent = sharpen.value;
  spaceDensityVal.textContent = spaceDensity.value;
  letterSpacingVal.textContent = letterSpacing.value;
}
setLabels();

// theme toggle
themeToggle.addEventListener('click', ()=> {
  document.body.classList.toggle('theme-light');
  themeIcon.textContent = document.body.classList.contains('theme-light') ? '☀️' : '🌙';
});

// wire ranges to live update
[charsRange, brightness, contrast, sharpen, spaceDensity, letterSpacing].forEach(el=>{
  el.addEventListener('input', ()=> {
    setLabels();
    if (lastDataURL) processAndRender(lastDataURL);
  });
});
[grayscale, invert, asciiGradient, circleMask].forEach(el=>{
  el.addEventListener('change', ()=> { if (lastDataURL) processAndRender(lastDataURL); });
});

// pipeline: brightness/contrast formula, aspect correction, sharpen (unsharp mask), mapping to ascii gradient

function processImageToCanvas(img, targetWidth, opts){
  const canvas = procCanvas;
  const ctx = canvas.getContext('2d');

  // character aspect ratio: characters are taller -> use height scale
  const charAspect = 0.5; // higher => more squashed vertically, tuned
  const scale = targetWidth / img.width;
  const tW = Math.max(1, Math.round(targetWidth));
  const tH = Math.max(1, Math.round(img.height * scale * charAspect));

  canvas.width = tW;
  canvas.height = tH;

  // draw image scaled to canvas
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  // obtain pixel data
  const imageData = ctx.getImageData(0,0,canvas.width,canvas.height);
  const data = imageData.data;

  // precompute contrast factor
  const c = parseFloat(opts.contrast); // -200..200
  const contrastFactor = (259 * (c + 255)) / (255 * (259 - c));

  // brightness offset
  const b = parseFloat(opts.brightness);

  // saturation not included (we have grayscale toggle)
  const doGray = opts.grayscale;
  const doInvert = opts.invert;

  for (let i=0;i<data.length;i+=4){
    let r = data[i], g = data[i+1], bl = data[i+2];

    // apply brightness
    r = r + b; g = g + b; bl = bl + b;

    // apply contrast
    r = contrastFactor * (r - 128) + 128;
    g = contrastFactor * (g - 128) + 128;
    bl = contrastFactor * (bl - 128) + 128;

    // grayscale option
    if (doGray) {
      const avg = 0.299*r + 0.587*g + 0.114*bl;
      r = g = bl = avg;
    }

    // invert option
    if (doInvert) {
      r = 255 - r; g = 255 - g; bl = 255 - bl;
    }

    data[i] = clamp(Math.round(r),0,255);
    data[i+1] = clamp(Math.round(g),0,255);
    data[i+2] = clamp(Math.round(bl),0,255);
    // alpha unchanged
  }

  // sharpen using simple unsharp mask (fast pass)
  const sh = parseInt(opts.sharpen,10);
  if (sh > 0) {
    // create temp canvas
    const tmp = document.createElement('canvas');
    tmp.width = canvas.width; tmp.height = canvas.height;
    const tctx = tmp.getContext('2d');
    tctx.putImageData(imageData, 0, 0);

    // blur quickly by scaled drawing (cheap approximate gaussian)
    const blurAmount = 1 + Math.min(3, sh);
    tctx.globalAlpha = 1;
    tctx.filter = `blur(${blurAmount}px)`;
    tctx.drawImage(tmp, 0, 0);
    // get blurred
    const blurred = tctx.getImageData(0,0,tmp.width,tmp.height);

    // unsharp: original + amount*(original - blurred)
    const original = imageData.data;
    const bdata = blurred.data;
    const amount = 0.8 * sh; // scale
    for (let i=0;i<original.length;i+=4){
      original[i] = clamp(original[i] + amount * (original[i] - bdata[i]), 0, 255);
      original[i+1] = clamp(original[i+1] + amount * (original[i+1] - bdata[i+1]), 0, 255);
      original[i+2] = clamp(original[i+2] + amount * (original[i+2] - bdata[i+2]), 0, 255);
    }
    imageData.data.set(original);
  }

  // write back processed pixels
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

function mapPixelToChar(r,g,b, gradient, spaceDensity){
  // luminance 0..255
  const lum = 0.299*r + 0.587*g + 0.114*b;
  // deterministic space logic: lighter pixels → more likely space based on spaceDensity
  if (spaceDensity > 0) {
    const threshold = 255 - (spaceDensity * 45); // tuned
    if (lum > threshold) return ' ';
  }
  // map luminance to index in gradient (gradient arranged dark->light)
  const idx = Math.floor((1 - (lum/255)) * (gradient.length - 1));
  return gradient[idx];
}

function renderAsciiFromCanvas(canvas, options) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const imgData = ctx.getImageData(0,0,w,h).data;
  // gradient supplied as string, arrange dark->light
  const gradientStr = options.gradient;
  // remove duplicates & sanitize (simple)
  const gradient = Array.from(new Set(gradientStr.split('')));

  const useCircle = options.circleMask;
  const cx = w / 2, cy = h / 2;
  const radius = Math.min(cx, cy);

  let out = '';
  for (let y=0;y<h;y++){
    for (let x=0;x<w;x++){
      const o = (y*w + x)*4;
      if (useCircle){
        const dx = x - cx, dy = y - cy;
        if ((dx*dx + dy*dy) > radius*radius) {
          out += ' ';
          continue;
        }
      }
      const r = imgData[o], g = imgData[o+1], b = imgData[o+2];
      out += mapPixelToChar(r,g,b,gradient, options.spaceDensity);
    }
    out += '\n';
  }
  return out;
}

function processAndRender(dataUrl){
  lastDataURL = dataUrl;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = function(){
    const opts = {
      width: parseInt(charsRange.value,10),
      brightness: parseFloat(brightness.value),
      contrast: parseFloat(contrast.value),
      sharpen: parseInt(sharpen.value,10),
      spaceDensity: parseInt(spaceDensity.value,10),
      grayscale: grayscale.checked,
      invert: invert.checked,
      gradient: asciiGradient.value,
      circleMask: circleMask.checked
    };

    const canvas = processImageToCanvas(img, opts.width, opts);

    // small preview (scaled)
    const holder = $('canvasHolder');
    holder.innerHTML = '';
    const preview = document.createElement('canvas');
    preview.width = Math.min(320, canvas.width);
    preview.height = Math.min(320, canvas.height);
    const pctx = preview.getContext('2d');
    // draw without interpolation to keep preview crisp
    pctx.imageSmoothingEnabled = false;
    pctx.drawImage(canvas, 0, 0, preview.width, preview.height);
    holder.appendChild(preview);

    // render ascii and show
    const ascii = renderAsciiFromCanvas(canvas, opts);
    asciiImageOutput.textContent = ascii;
  };
  img.onerror = function(){
    alert('Failed to load image.');
  };
  img.src = dataUrl;
}

// auto convert on upload
imageInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(ev){
    processAndRender(ev.target.result);
  };
  reader.readAsDataURL(file);
});

// copy & download
copyImageAscii.addEventListener('click', ()=> {
  const txt = asciiImageOutput.textContent;
  if (!txt) return alert('No ASCII to copy');
  navigator.clipboard.writeText(txt).then(()=> {
    copyImageAscii.textContent = 'Copied!';
    setTimeout(()=> copyImageAscii.textContent = 'Copy', 1200);
  });
});
downloadImageAscii.addEventListener('click', ()=> {
  const txt = asciiImageOutput.textContent;
  if (!txt) return alert('No ASCII to download');
  const blob = new Blob([txt], {type:'text/plain;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'image-ascii.txt';
  a.click();
});

// reset
resetFilters.addEventListener('click', ()=> {
  charsRange.value = 110;
  brightness.value = 0;
  contrast.value = 0;
  sharpen.value = 0;
  spaceDensity.value = 1;
  grayscale.checked = false;
  invert.checked = false;
  asciiGradient.value = asciiGradient.querySelector('option').value;
  circleMask.checked = true;
  setLabels();
  if (lastDataURL) processAndRender(lastDataURL);
});

// text -> figlet
function convertText(){
  const txt = textInput.value.trim();
  if (!txt) return alert('Enter text');
  const font = fontSelect.value || 'Standard';
  const spacing = parseInt(letterSpacing.value,10);

  asciiTextOutput.textContent = 'Rendering...';
  // figlet.text picks built-in fonts (if missing it will fall back)
  figlet.text(txt, {font}, (err, res) => {
    if (err || !res) {
      asciiTextOutput.textContent = 'Error generating ASCII (Figlet).';
      return;
    }
    // letter spacing
    const out = res.split('\n').map(line => {
      return spacing ? line.split('').join(' '.repeat(spacing)) : line;
    }).join('\n');
    asciiTextOutput.textContent = out;
  });
}
convertTextBtn.addEventListener('click', convertText);
downloadTextBtn.addEventListener('click', ()=> {
  const txt = asciiTextOutput.textContent;
  if (!txt) return alert('Nothing to download');
  const blob = new Blob([txt], {type:'text/plain;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'text-ascii.txt';
  a.click();
});

// search nicety
searchBtn?.addEventListener('click', ()=> searchBox.focus());

// small init
window.addEventListener('load', ()=> {
  setLabels();
  convertText(); // sample
});
