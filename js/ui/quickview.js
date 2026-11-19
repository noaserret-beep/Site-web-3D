// Fiche produit rapide avec vue 3D qu'on fait tourner
import { PRODUITS } from '../data/catalogue.js';
import { prix, produit, couleur, thumb, esc, ICONES, makeDialog } from './helpers.js';
import { ajouter } from './cart.js';
import { url } from '../base.js';

let dialog;
let studio = null;
let state = null;
let onOpenChange = () => {};

const SOUVENT = {
  'chaussons-nuage': ['bandeau-cocon', 'coffret-soiree-cocon'],
  'bandeau-cocon': ['housse-rechange', 'chaussons-nuage'],
  'nuque-douceur': ['bandeau-cocon', 'chaussons-nuage'],
  'coffret-soiree-cocon': ['nuque-douceur', 'housse-rechange'],
  'housse-rechange': ['bandeau-cocon', 'nuque-douceur'],
};

export function initQuickView({ studio: s, onToggle }) {
  studio = s;
  onOpenChange = onToggle || onOpenChange;
  dialog = makeDialog(document.getElementById('qv'), {
    onClose: () => {
      studio && studio.unmount();
      onOpenChange(false);
    },
  });
  document.getElementById('qvInfo').addEventListener('click', onClick);
}

export function ouvrirProduit(id) {
  const p = produit(id);
  if (!p) return;
  state = { p, coloris: p.coloris[0], taille: p.tailles.length ? p.tailles[1] || p.tailles[0] : '', qty: 1 };
  renderInfo();
  const stage = document.getElementById('qvStage');
  const photo = document.getElementById('qvPhoto');
  if (p.image) {
    photo.src = url(p.image);
    photo.alt = p.nom;
    photo.hidden = false;
    document.getElementById('qvHint').hidden = true;
  } else {
    photo.hidden = true;
    document.getElementById('qvHint').hidden = !studio;
  }
  dialog.open();
  onOpenChange(true);
  if (studio && !p.image) {
    requestAnimationFrame(() => studio.mount(stage, p.model, couleur(state.coloris).hex));
  } else if (!p.image) {
    photo.src = thumb(p, state.coloris);
    photo.hidden = false;
  }
}

function renderInfo() {
  const { p, coloris, taille, qty } = state;
  const cross = (SOUVENT[p.id] || []).map(produit).filter(Boolean);
  document.getElementById('qvInfo').innerHTML = `
    ${p.badge ? `<p class="qv__badge">${esc(p.badge)}</p>` : ''}
    <h3 id="qvTitle">${esc(p.nom)}</h3>
    <p class="qv__price">${prix(p.price)}${p.compareAt ? `<s>${prix(p.compareAt)}</s>` : ''}</p>
    <p class="qv__desc">${esc(p.description)}</p>
    <div class="usages">${p.usages.map((u) => `<span>${esc(u)}</span>`).join('')}</div>
    <fieldset class="opt">
      <legend>Coloris : <span>${esc(couleur(coloris).nom)}</span></legend>
      <div class="opt__row">${p.coloris
        .map(
          (c) => `<button type="button" class="swatch ${c === coloris ? 'is-active' : ''}" data-color="${c}"
            style="background:${couleur(c).hex}" aria-label="${esc(couleur(c).nom)}" aria-pressed="${c === coloris}"></button>`
        )
        .join('')}</div>
    </fieldset>
    ${
      p.tailles.length
        ? `<fieldset class="opt"><legend>Pointure</legend><div class="opt__row">${p.tailles
            .map((t) => `<button type="button" class="size ${t === taille ? 'is-active' : ''}" data-size="${t}" aria-pressed="${t === taille}">${t}</button>`)
            .join('')}</div></fieldset>`
        : ''
    }
    <div class="qv__buy">
      <div class="qty" role="group" aria-label="Quantité">
        <button type="button" data-q="-1" aria-label="Moins">−</button>
        <span>${qty}</span>
        <button type="button" data-q="1" aria-label="Plus">+</button>
      </div>
      <button class="btn btn--primary" type="button" data-add data-autofocus>Ajouter au panier · ${prix(p.price * qty)}</button>
    </div>
    <ul class="qv__details">${p.details.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>
    <div class="steps">
      <div class="step">${ICONES.microondes}<b>1. Chauffez</b>quelques minutes au micro-ondes</div>
      <div class="step">${ICONES.canape}<b>2. Installez-vous</b>là où ça fait du bien</div>
      <div class="step">${ICONES.coeur}<b>3. Profitez</b>d'une chaleur douce</div>
    </div>
    ${
      cross.length
        ? `<div class="qv__cross"><h4>Ça va très bien avec</h4><div class="cross-list">${cross
            .map((c) => `<button class="cross" type="button" data-other="${c.id}"><img src="${thumb(c)}" alt="" /><span>${esc(c.court)}<br /><small>${prix(c.price)}</small></span></button>`)
            .join('')}</div></div>`
        : ''
    }`;
}

function onClick(e) {
  const b = e.target.closest('button');
  if (!b || !state) return;
  if (b.dataset.color) {
    state.coloris = b.dataset.color;
    renderInfo();
    if (studio && !state.p.image) studio.setProduct(state.p.model, couleur(state.coloris).hex);
  } else if (b.dataset.size) {
    state.taille = b.dataset.size;
    renderInfo();
  } else if (b.dataset.q) {
    state.qty = Math.max(1, Math.min(9, state.qty + Number(b.dataset.q)));
    renderInfo();
  } else if (b.hasAttribute('data-add')) {
    const from = document.getElementById('qvStage');
    ajouter(state.p.id, { coloris: state.coloris, taille: state.taille, qty: state.qty, from });
    dialog.close();
  } else if (b.dataset.other) {
    const id = b.dataset.other;
    studio && studio.unmount();
    ouvrirProduit(id);
  }
}

export const tousLesProduits = PRODUITS;
