// Petits utilitaires partagés par l'interface
import { PRODUITS, COLORIS } from '../data/catalogue.js';
import { url } from '../base.js';

const fmt = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
export const prix = (n) => fmt.format(n);

export const produit = (id) => PRODUITS.find((p) => p.id === id);
export const couleur = (key) => COLORIS[key] || { nom: key, hex: '#efe2cf' };

export const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/* -------- Vignettes : vraie photo si fournie, sinon rendu 3D -------- */
let studio = null;
export function setStudio(s) {
  studio = s;
}
export function thumb(p, colorKey) {
  if (p.image) return url(p.image);
  const c = couleur(colorKey || p.coloris[0]).hex;
  if (studio) {
    try {
      return studio.snapshot(p.model, c);
    } catch (e) {
      console.warn(e);
    }
  }
  return url('assets/monogramme.png');
}

/* ------------------------------ Icônes ------------------------------ */
export const ICONES = {
  maison: '<svg viewBox="0 0 24 24"><path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/></svg>',
  fauteuil: '<svg viewBox="0 0 24 24"><path d="M5 11V8a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v3"/><path d="M3 12a2 2 0 0 1 4 0v2h10v-2a2 2 0 0 1 4 0v5H3z"/><path d="M5 17v2M19 17v2"/></svg>',
  tasse: '<svg viewBox="0 0 24 24"><path d="M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16"/><path d="M8 3c0 1.5 1 1.5 1 3M12 3c0 1.5 1 1.5 1 3"/></svg>',
  lit: '<svg viewBox="0 0 24 24"><path d="M3 18V7M3 13h18v5M21 18v-3a3 3 0 0 0-3-3h-7v1"/><circle cx="7" cy="10.5" r="1.8"/></svg>',
  livre: '<svg viewBox="0 0 24 24"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H12v16H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H12v16h5.5a2.5 2.5 0 0 1 2.5 2.5z"/></svg>',
  cadeau: '<svg viewBox="0 0 24 24"><rect x="3" y="9" width="18" height="11" rx="1.5"/><path d="M3 13h18M12 9v11"/><path d="M12 9c-2-4-6-4-6-1.5S10 9 12 9c2 0 6 .5 6-1.5S14 5 12 9z"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  fleche: '<svg viewBox="0 0 24 24"><path d="M12 5v14M6 13l6 6 6-6"/></svg>',
  ampoule: '<svg viewBox="0 0 24 24"><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/></svg>',
  rotation: '<svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="m5 12 5 5 9-10"/></svg>',
  microondes: '<svg viewBox="0 0 24 24"><rect x="2.5" y="5" width="19" height="14" rx="2"/><rect x="5" y="8" width="10" height="8" rx="1"/><path d="M18 9v.01M18 12v.01M18 15v.01"/></svg>',
  canape: '<svg viewBox="0 0 24 24"><path d="M4 11V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3"/><path d="M2 12a2 2 0 0 1 4 0v1h12v-1a2 2 0 0 1 4 0v5H2z"/></svg>',
  coeur: '<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>',
};

/* ------------------------------ Toast ------------------------------ */
let toastTimer;
export function toast(message, action) {
  const el = document.getElementById('toast');
  el.innerHTML = `<span>${esc(message)}</span>`;
  if (action) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = action.label;
    b.addEventListener('click', () => {
      el.classList.remove('is-on');
      action.onClick();
    });
    el.appendChild(b);
  }
  el.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-on'), 3600);
}

/* ------- Animation : la vignette s'envole jusqu'au panier ------- */
export function flyToCart(fromEl, src) {
  const target = document.getElementById('cartBtn');
  if (!fromEl || !target || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    bump();
    return;
  }
  const a = fromEl.getBoundingClientRect();
  const b = target.getBoundingClientRect();
  const img = document.createElement('img');
  img.src = src;
  img.className = 'flyer';
  img.alt = '';
  img.style.left = a.left + a.width / 2 - 40 + 'px';
  img.style.top = a.top + a.height / 2 - 40 + 'px';
  document.body.appendChild(img);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  const anim = img.animate(
    [
      { transform: 'translate(0,0) scale(1) rotate(0deg)', opacity: 1 },
      { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 120}px) scale(0.9) rotate(-12deg)`, opacity: 1, offset: 0.55 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.2) rotate(8deg)`, opacity: 0.4 },
    ],
    { duration: 850, easing: 'cubic-bezier(0.45, 0, 0.2, 1)' }
  );
  anim.onfinish = () => {
    img.remove();
    bump();
  };
}

function bump() {
  const t = document.getElementById('cartBtn');
  t.classList.remove('is-bump');
  void t.offsetWidth;
  t.classList.add('is-bump');
}

/* ------------- Modales : focus, Échap, clic extérieur ------------- */
export function makeDialog(root, { onClose } = {}) {
  let lastFocus = null;
  const close = () => {
    if (root.hidden) return;
    root.hidden = true;
    document.documentElement.style.overflow = '';
    onClose && onClose();
    lastFocus && lastFocus.focus && lastFocus.focus();
  };
  const open = () => {
    lastFocus = document.activeElement;
    root.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    const f = root.querySelector('[data-autofocus]') || root.querySelector('button, a, input');
    f && setTimeout(() => f.focus({ preventScroll: true }), 50);
  };
  root.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) close();
  });
  root.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
    if (e.key !== 'Tab') return;
    const f = [...root.querySelectorAll('button, a[href], input, [tabindex="0"]')].filter((x) => x.offsetParent !== null);
    if (!f.length) return;
    const first = f[0];
    const last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      last.focus();
      e.preventDefault();
    } else if (!e.shiftKey && document.activeElement === last) {
      first.focus();
      e.preventDefault();
    }
  });
  return { open, close, get isOpen() { return !root.hidden; } };
}
