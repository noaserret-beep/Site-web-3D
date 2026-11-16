// Panier : stocké dans le navigateur du client (localStorage)
import { CONFIG, PRODUITS } from '../data/catalogue.js';
import { prix, produit, couleur, thumb, esc, toast, flyToCart, makeDialog } from './helpers.js';

const KEY = 'maison-mellow-panier';
let items = load();
let dialog;
let orderDialog;
let onQuickView = () => {};

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(raw) ? raw.filter((l) => produit(l.id)) : [];
  } catch {
    return [];
  }
}
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* navigation privée : le panier reste en mémoire */
  }
}

export const sousTotal = () => items.reduce((s, l) => s + produit(l.id).price * l.qty, 0);
export const nbArticles = () => items.reduce((s, l) => s + l.qty, 0);
const port = () => (sousTotal() >= CONFIG.livraisonOfferteDes || !items.length ? 0 : CONFIG.fraisDePort);

export function ajouter(id, { coloris, taille, qty = 1, from } = {}) {
  const p = produit(id);
  coloris = coloris || p.coloris[0];
  taille = taille || (p.tailles.length ? p.tailles[1] || p.tailles[0] : '');
  const key = `${id}|${coloris}|${taille}`;
  const line = items.find((l) => l.key === key);
  if (line) line.qty += qty;
  else items.push({ key, id, coloris, taille, qty });
  save();
  render();
  const src = thumb(p, coloris);
  flyToCart(from, src);
  const reste = CONFIG.livraisonOfferteDes - sousTotal();
  toast(
    reste > 0 ? `Ajouté ! Plus que ${prix(reste)} pour la livraison offerte.` : 'Ajouté ! Votre livraison est offerte.',
    { label: 'Voir le panier', onClick: ouvrir }
  );
}

function changer(key, delta) {
  const l = items.find((x) => x.key === key);
  if (!l) return;
  l.qty += delta;
  if (l.qty <= 0) items = items.filter((x) => x.key !== key);
  save();
  render();
}

export function ouvrir() {
  render();
  dialog.open();
}

function render() {
  const n = nbArticles();
  const count = document.getElementById('cartCount');
  count.textContent = n;
  count.dataset.n = n;

  const list = document.getElementById('cartItems');
  list.innerHTML = items
    .map((l) => {
      const p = produit(l.id);
      const opts = [couleur(l.coloris).nom, l.taille && `Taille ${l.taille}`].filter(Boolean).join(' · ');
      return `<li class="line">
        <img src="${thumb(p, l.coloris)}" alt="" />
        <div>
          <p class="line__name">${esc(p.court)}</p>
          <p class="line__opts">${esc(opts)}</p>
          <div class="qty" role="group" aria-label="Quantité">
            <button type="button" data-dec="${l.key}" aria-label="Retirer un">−</button>
            <span>${l.qty}</span>
            <button type="button" data-inc="${l.key}" aria-label="Ajouter un">+</button>
          </div>
        </div>
        <div>
          <p class="line__price">${prix(p.price * l.qty)}</p>
          <button class="line__remove" type="button" data-rm="${l.key}">Retirer</button>
        </div>
      </li>`;
    })
    .join('');
  document.getElementById('cartEmpty').hidden = items.length > 0;

  // Barre "livraison offerte" : on donne envie de compléter
  const st = sousTotal();
  const seuil = CONFIG.livraisonOfferteDes;
  const reste = seuil - st;
  document.getElementById('shipText').innerHTML =
    st === 0
      ? `Livraison offerte dès <b>${prix(seuil)}</b> d'achat.`
      : reste > 0
        ? `Plus que <b>${prix(reste)}</b> pour la livraison offerte.`
        : `Bonne nouvelle : <b>la livraison est offerte</b> !`;
  document.getElementById('shipBar').style.width = Math.min(100, (st / seuil) * 100) + '%';
  document.getElementById('subTotal').textContent = prix(st);
  document.getElementById('shipCost').textContent = items.length ? (port() ? prix(port()) : 'Offerte') : '-';
  document.getElementById('grandTotal').textContent = prix(st + port());
  document.getElementById('checkoutBtn').disabled = !items.length;

  // Suggestions : ce qui n'est pas encore dans le panier
  const dans = new Set(items.map((l) => l.id));
  const sugg = PRODUITS.filter((p) => !dans.has(p.id))
    .sort((a, b) => (reste > 0 ? Math.abs(a.price - reste) - Math.abs(b.price - reste) : a.price - b.price))
    .slice(0, 3);
  document.getElementById('cartCross').innerHTML = sugg.length
    ? `<h3>${items.length ? 'Pour compléter votre cocon' : 'Nos incontournables'}</h3>
       <div class="cross-list">${sugg
         .map(
           (p) => `<button class="cross" type="button" data-qv="${p.id}">
             <img src="${thumb(p)}" alt="" />
             <span>${esc(p.court)}<br /><small>${prix(p.price)}</small></span>
           </button>`
         )
         .join('')}</div>`
    : '';
}

function commander() {
  if (!items.length) return;
  if (CONFIG.lienPaiement) {
    window.location.href = CONFIG.lienPaiement;
    return;
  }
  const lignes = items.map((l) => {
    const p = produit(l.id);
    const opts = [couleur(l.coloris).nom, l.taille && `taille ${l.taille}`].filter(Boolean).join(', ');
    return { txt: `${l.qty} × ${p.court} (${opts})`, prix: prix(p.price * l.qty) };
  });
  const total = prix(sousTotal() + port());
  document.getElementById('orderRecap').innerHTML =
    lignes.map((l) => `<p><span>${esc(l.txt)}</span><span>${l.prix}</span></p>`).join('') +
    `<p><span>Livraison</span><span>${port() ? prix(port()) : 'Offerte'}</span></p><p><b>Total</b><b>${total}</b></p>`;
  const body =
    `Bonjour Maison Mellow,\n\nJe souhaite commander :\n` +
    lignes.map((l) => `- ${l.txt} : ${l.prix}`).join('\n') +
    `\n\nTotal : ${total}\n\nMon nom :\nMon adresse de livraison :\nMon téléphone :\n\nMerci !`;
  document.getElementById('orderMail').href =
    `mailto:${CONFIG.email}?subject=${encodeURIComponent('Ma commande Maison Mellow')}&body=${encodeURIComponent(body)}`;
  dialog.close();
  orderDialog.open();
}

export function initCart({ quickView }) {
  onQuickView = quickView;
  dialog = makeDialog(document.getElementById('cart'));
  orderDialog = makeDialog(document.getElementById('order'));
  document.getElementById('cartBtn').addEventListener('click', ouvrir);
  document.getElementById('checkoutBtn').addEventListener('click', commander);
  document.getElementById('cart').addEventListener('click', (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.inc) changer(t.dataset.inc, 1);
    if (t.dataset.dec) changer(t.dataset.dec, -1);
    if (t.dataset.rm) changer(t.dataset.rm, -Infinity);
    if (t.dataset.qv) {
      dialog.close();
      onQuickView(t.dataset.qv);
    }
  });
  render();
}

export const refreshCart = render;
