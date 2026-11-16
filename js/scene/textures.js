// Textures dessinées à la volée (aucune image à télécharger)
import * as THREE from 'three';

const cache = new Map();

function canvasTexture(key, w, h, draw, { repeat = null, srgb = true } = {}) {
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(c);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  if (repeat) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeat[0], repeat[1]);
  }
  cache.set(key, tex);
  return tex;
}

// Petit générateur pseudo-aléatoire déterministe
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function glowTexture() {
  return canvasTexture('glow', 128, 128, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.18, 'rgba(255,255,255,0.75)');
    g.addColorStop(0.45, 'rgba(255,255,255,0.22)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}

export function shadowTexture() {
  return canvasTexture('shadow', 128, 128, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(60,35,15,0.55)');
    g.addColorStop(0.55, 'rgba(60,35,15,0.22)');
    g.addColorStop(1, 'rgba(60,35,15,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}

export function planks(base = '#c79f74', key = 'planks') {
  return canvasTexture(key + base, 512, 512, (ctx, w, h) => {
    const r = rng(7);
    const col = new THREE.Color(base);
    const rows = 8;
    const ph = h / rows;
    for (let i = 0; i < rows; i++) {
      let x = -r() * 200;
      while (x < w) {
        const len = 160 + r() * 220;
        const c = col.clone().offsetHSL(0, (r() - 0.5) * 0.04, (r() - 0.5) * 0.07);
        ctx.fillStyle = '#' + c.getHexString();
        ctx.fillRect(x, i * ph, len, ph);
        // veinage
        ctx.strokeStyle = 'rgba(90,55,25,0.08)';
        ctx.lineWidth = 1;
        for (let k = 0; k < 4; k++) {
          const y = i * ph + 6 + r() * (ph - 12);
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.bezierCurveTo(x + len * 0.3, y + 3, x + len * 0.6, y - 3, x + len, y);
          ctx.stroke();
        }
        ctx.fillStyle = 'rgba(80,50,25,0.28)';
        ctx.fillRect(x, i * ph, 2, ph);
        x += len;
      }
      ctx.fillStyle = 'rgba(80,50,25,0.3)';
      ctx.fillRect(0, i * ph, w, 2);
    }
  }, { repeat: [2, 2] });
}

export function tiles(a = '#f1e6d6', b = '#c98b62') {
  return canvasTexture('tiles' + a + b, 256, 256, (ctx, w, h) => {
    const n = 4;
    const s = w / n;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        ctx.fillStyle = (i + j) % 2 ? a : b;
        ctx.fillRect(i * s, j * s, s, s);
      }
    ctx.strokeStyle = 'rgba(255,250,240,0.6)';
    ctx.lineWidth = 3;
    for (let i = 0; i <= n; i++) {
      ctx.beginPath(); ctx.moveTo(i * s, 0); ctx.lineTo(i * s, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * s); ctx.lineTo(w, i * s); ctx.stroke();
    }
  }, { repeat: [3, 3] });
}

export function wallpaper(base = '#ead9c3', motif = 'rgba(120,80,40,0.08)', kind = 'dots') {
  return canvasTexture('wp' + base + kind, 256, 256, (ctx, w, h) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = motif;
    ctx.strokeStyle = motif;
    if (kind === 'dots') {
      for (let y = 0; y < 8; y++)
        for (let x = 0; x < 8; x++) {
          ctx.beginPath();
          ctx.arc(x * 32 + (y % 2) * 16 + 8, y * 32 + 8, 3, 0, Math.PI * 2);
          ctx.fill();
        }
    } else if (kind === 'stripes') {
      for (let x = 0; x < w; x += 32) ctx.fillRect(x, 0, 12, h);
    } else if (kind === 'leaves') {
      for (let y = 0; y < 4; y++)
        for (let x = 0; x < 4; x++) {
          const cx = x * 64 + (y % 2) * 32 + 16;
          const cy = y * 64 + 24;
          ctx.beginPath();
          ctx.ellipse(cx - 6, cy, 5, 11, -0.6, 0, Math.PI * 2);
          ctx.ellipse(cx + 6, cy, 5, 11, 0.6, 0, Math.PI * 2);
          ctx.fill();
        }
    } else if (kind === 'arches') {
      ctx.lineWidth = 3;
      for (let y = 0; y < 4; y++)
        for (let x = 0; x < 4; x++) {
          const cx = x * 64 + 32;
          const cy = y * 64 + 48;
          ctx.beginPath();
          ctx.arc(cx, cy, 18, Math.PI, 0);
          ctx.stroke();
        }
    }
  }, { repeat: [3, 2] });
}

export function rugTexture(colors = ['#e9d3b6', '#c88f62', '#f4e8d8', '#b8774e']) {
  return canvasTexture('rug' + colors.join(), 512, 512, (ctx, w, h) => {
    const n = 9;
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, (w / 2) * (1 - i / n), 0, Math.PI * 2);
      ctx.fill();
    }
    // texture tissée
    const r = rng(3);
    for (let k = 0; k < 4000; k++) {
      ctx.fillStyle = `rgba(${r() > 0.5 ? '255,250,240' : '90,60,30'},0.06)`;
      ctx.fillRect(r() * w, r() * h, 2, 2);
    }
  });
}

export function knit(base = '#e6b9ad', stripe = '#f6ece0') {
  return canvasTexture('knit' + base + stripe, 256, 256, (ctx, w, h) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = stripe;
    for (let y = 0; y < h; y += 64) ctx.fillRect(0, y + 40, w, 12);
    ctx.strokeStyle = 'rgba(80,50,30,0.12)';
    ctx.lineWidth = 2;
    for (let x = 0; x < w; x += 8) {
      for (let y = 0; y < h; y += 10) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 4, y + 6);
        ctx.lineTo(x + 8, y);
        ctx.stroke();
      }
    }
  }, { repeat: [2, 2] });
}

export function windowView() {
  // nuit d'hiver : ciel bleu profond, jardin enneigé, flocons flous
  return canvasTexture('window', 256, 320, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#141c2e');
    g.addColorStop(0.55, '#2c3a55');
    g.addColorStop(0.78, '#5b6680');
    g.addColorStop(1, '#8d93a6');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.filter = 'blur(3px)';
    ctx.fillStyle = '#1b2436';
    [[0.12, 0.83, 70], [0.3, 0.86, 52], [0.82, 0.82, 80]].forEach(([x, y, t]) => {
      ctx.beginPath();
      ctx.moveTo(w * x, h * y - t);
      ctx.lineTo(w * x - t * 0.32, h * y);
      ctx.lineTo(w * x + t * 0.32, h * y);
      ctx.fill();
    });
    ctx.fillStyle = '#c9cfdc';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.86);
    ctx.quadraticCurveTo(w * 0.4, h * 0.8, w, h * 0.85);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.fill();
    // fenêtre éclairée d'une maison voisine
    ctx.fillStyle = 'rgba(255,190,110,0.85)';
    ctx.fillRect(w * 0.6, h * 0.74, 10, 8);
    ctx.filter = 'blur(1px)';
    const r = rng(11);
    for (let i = 0; i < 90; i++) {
      ctx.globalAlpha = 0.25 + r() * 0.6;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(r() * w, r() * h, 0.8 + r() * 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.filter = 'none';
  });
}

export function warmWindow() {
  return canvasTexture('warmwindow', 128, 160, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h * 0.7, 10, w / 2, h / 2, h * 0.7);
    g.addColorStop(0, '#fff1c9');
    g.addColorStop(0.5, '#ffc77a');
    g.addColorStop(1, '#e39552');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}

export function artTexture(variant = 0) {
  return canvasTexture('art' + variant, 256, 320, (ctx, w, h) => {
    const palettes = [
      ['#f4e8d8', '#c98b62', '#8f9c84', '#e2b29d'],
      ['#efe2cf', '#b8643f', '#e6b9ad', '#5a3a1e'],
      ['#f3eadc', '#a3ad8f', '#d9a679', '#7a5638'],
    ];
    const p = palettes[variant % palettes.length];
    ctx.fillStyle = p[0];
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = p[1];
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.62, w * 0.34, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = p[2];
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.62, w * 0.2, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = p[3];
    ctx.beginPath();
    ctx.arc(w * 0.72, h * 0.25, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(w * 0.12, h * 0.62, w * 0.76, 6);
  });
}

export function textTexture(text, { bg = '#c48a5a', fg = '#fbf3e7', w = 512, h = 256, font = '600 84px Fraunces, Georgia, serif' } = {}) {
  return canvasTexture('txt' + text + bg + fg, w, h, (ctx) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = fg;
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2 + 4);
  });
}

export function signTexture(text) {
  return canvasTexture('sign' + text, 512, 160, (ctx, w, h) => {
    ctx.fillStyle = '#fbf3e7';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#5a3a1e';
    ctx.font = '600 60px Jost, Arial, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 36, h / 2 + 2);
    // flèche
    ctx.beginPath();
    ctx.moveTo(w - 110, h / 2 - 22);
    ctx.lineTo(w - 60, h / 2 - 22);
    ctx.lineTo(w - 60, h / 2 - 44);
    ctx.lineTo(w - 22, h / 2);
    ctx.lineTo(w - 60, h / 2 + 44);
    ctx.lineTo(w - 60, h / 2 + 22);
    ctx.lineTo(w - 110, h / 2 + 22);
    ctx.fill();
  });
}

export function arrowTexture() {
  return canvasTexture('arrow', 128, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(w * 0.22, h * 0.2);
    ctx.lineTo(w * 0.62, h * 0.5);
    ctx.lineTo(w * 0.22, h * 0.8);
    ctx.lineTo(w * 0.4, h * 0.5);
    ctx.closePath();
    ctx.fill();
  }, { srgb: true });
}

export function shingles(base = '#6e4a2e') {
  return canvasTexture('shingles' + base, 256, 256, (ctx, w, h) => {
    const col = new THREE.Color(base);
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    const rows = 8;
    const rh = h / rows;
    const r = rng(5);
    for (let y = 0; y < rows; y++) {
      for (let x = -1; x < 9; x++) {
        const c = col.clone().offsetHSL(0, 0, (r() - 0.5) * 0.08);
        ctx.fillStyle = '#' + c.getHexString();
        const cx = x * 32 + (y % 2) * 16 + 16;
        ctx.beginPath();
        ctx.moveTo(cx - 16, y * rh);
        ctx.lineTo(cx - 16, y * rh + rh * 0.6);
        ctx.arc(cx, y * rh + rh * 0.6, 16, Math.PI, 0, true);
        ctx.lineTo(cx + 16, y * rh);
        ctx.fill();
        ctx.strokeStyle = 'rgba(40,22,10,0.35)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }, { repeat: [6, 4] });
}

export function plaster(base = '#f4e9da') {
  return canvasTexture('plaster' + base, 256, 256, (ctx, w, h) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    const r = rng(9);
    for (let i = 0; i < 2500; i++) {
      ctx.fillStyle = `rgba(${r() > 0.5 ? '255,255,255' : '120,90,60'},0.05)`;
      ctx.fillRect(r() * w, r() * h, 2 + r() * 3, 2 + r() * 3);
    }
  }, { repeat: [4, 4] });
}
