// Lien avec WooCommerce, quand le site tourne dans WordPress (extension Maison Mellow 3D).
// Utilise la "Store API" publique de WooCommerce : prix à jour, panier, puis page de paiement.
import { WP } from '../base.js';
import { PRODUITS, COLORIS } from '../data/catalogue.js';

const wc = WP.woocommerce || null;

export const actif = () => !!(wc && wc.api && wc.ids && Object.values(wc.ids).some(Boolean));

const delai = (ms) => new Promise((_, rej) => setTimeout(() => rej(new Error('délai dépassé')), ms));

// Adresse de l'API : fonctionne avec ou sans "beaux permaliens" (?rest_route=…)
function adresse(chemin) {
  const [route, query] = chemin.split('?');
  const base = wc.api + route;
  return query ? base + (base.includes('?') ? '&' : '?') + query : base;
}

async function appel(chemin, options = {}) {
  const r = await fetch(adresse(chemin), {
    credentials: 'same-origin',
    ...options,
    headers: { 'Content-Type': 'application/json', Nonce: wc.nonce || '', ...(options.headers || {}) },
  });
  const nonce = r.headers.get('Nonce');
  if (nonce) wc.nonce = nonce;
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.status === 204 ? null : r.json();
}

// Prix, promotions, stock et photos à jour depuis WooCommerce
export async function synchroniser() {
  if (!actif()) return;
  const ids = [...new Set(Object.values(wc.ids).filter(Boolean))];
  try {
    const liste = await Promise.race([appel(`products?include=${ids.join(',')}&per_page=50`), delai(5000)]);
    for (const p of PRODUITS) {
      const w = liste.find((x) => x.id === wc.ids[p.id]);
      if (!w) continue;
      const k = Math.pow(10, w.prices.currency_minor_unit ?? 2);
      const fourchette = w.prices.price_range;
      const prix = Number(fourchette ? fourchette.min_amount : w.prices.price) / k;
      const normal = Number(w.prices.regular_price) / k;
      if (prix > 0) {
        p.price = prix;
        p.compareAt = normal > prix ? normal : null;
      }
      p.wooType = w.type;
      p.disponible = w.is_purchasable !== false && w.is_in_stock !== false;
      if (wc.photos && !p.image && w.images && w.images[0]) p.image = w.images[0].src;
    }
  } catch (e) {
    console.warn('WooCommerce : prix non synchronisés', e);
  }
}

// On remplit le panier WooCommerce avec le panier du visiteur, puis on renvoie l'adresse du paiement
export async function commander(lignes) {
  const erreurs = [];
  await appel('cart'); // récupère un jeton de sécurité frais
  await appel('cart/items', { method: 'DELETE' });
  for (const l of lignes) {
    const p = PRODUITS.find((x) => x.id === l.id);
    const id = wc.ids[l.id];
    if (!p || !id) {
      erreurs.push(p ? p.court : l.id);
      continue;
    }
    const variation = [];
    if (p.wooType !== 'simple') {
      if (l.coloris && COLORIS[l.coloris]) variation.push({ attribute: wc.attrColoris || 'Coloris', value: COLORIS[l.coloris].nom });
      if (l.taille) variation.push({ attribute: wc.attrTaille || 'Pointure', value: l.taille });
    }
    try {
      await appel('cart/add-item', { method: 'POST', body: JSON.stringify({ id, quantity: l.qty, variation }) });
    } catch (e) {
      console.warn('WooCommerce : produit non ajouté', p.court, e);
      erreurs.push(p.court);
    }
  }
  return { erreurs, paiement: erreurs.length ? wc.cart : wc.checkout };
}
