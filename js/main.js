// Maison Mellow : point d'entrée du site
import { CONFIG, PRODUITS, PIECES, CATEGORIES, FAQ } from './data/catalogue.js';
import { prix, produit, couleur, thumb, esc, ICONES, setStudio } from './ui/helpers.js';
import { initCart, ajouter, refreshCart } from './ui/cart.js';
import { initQuickView, ouvrirProduit } from './ui/quickview.js';
import { VUES, DERNIERE } from './scene/parcours.js';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;
const lite = coarse || window.innerWidth < 760;
const $ = (s, r = document) => r.querySelector(s);
const loaderBar = $('#loaderBar');
const setLoad = (p) => (loaderBar.style.width = Math.round(p * 100) + '%');

/* ----------------------------- Contenu ----------------------------- */
function renderPieces() {
  const ancres = [VUES.porte, ...PIECES.map((p) => VUES[p.id]), VUES.fin];
  const etapes = (k) => Math.max(1, ancres[k + 1] - ancres[k]);
  const porte = `<section class="porte" id="porte" data-view="${VUES.porte}" style="--steps:${etapes(0)}" aria-labelledby="titre-porte">
      <div class="porte__card reveal">
        <p class="eyebrow">Bienvenue chez Maison Mellow</p>
        <h2 id="titre-porte">Poussez la porte…</h2>
        <p>Faites défiler doucement (ou glissez vers le haut sur téléphone) : on entre, et chaque objet de la maison se touche pour le découvrir en 3D.</p>
        <span class="porte__hint" aria-hidden="true"><span class="scroll-hint__mouse"><span></span></span>On entre</span>
      </div>
    </section>`;
  const html = porte + PIECES.map((piece, i) => {
    const next = PIECES[i + 1];
    const produits = piece.produits.map(produit).filter(Boolean);
    return `<section class="piece" id="piece-${piece.id}" data-view="${VUES[piece.id]}" style="--steps:${etapes(i + 1)}" aria-labelledby="titre-${piece.id}">
      <div class="piece__panel reveal">
        <p class="piece__kicker"><span class="piece__num">${i + 1}</span>${esc(piece.nom)}<span class="piece__icon" aria-hidden="true">${ICONES[piece.icone] || ''}</span></p>
        <h2 id="titre-${piece.id}">${esc(piece.titre)}</h2>
        <p class="piece__text">${esc(piece.texte)}</p>
        ${
          produits.length
            ? `<div class="piece__produits">${produits
                .map(
                  (p) => `<article class="mini">
                    <button class="mini__thumb" type="button" data-qv="${p.id}" aria-label="Voir ${esc(p.court)} en 3D"><img data-thumb="${p.id}" alt="" /></button>
                    <div>
                      <p class="mini__name">${esc(p.court)}</p>
                      <p class="mini__meta"><b>${prix(p.price)}</b> · ${esc(p.usages.slice(0, 2).join(', '))}</p>
                    </div>
                    <div class="mini__actions">
                      <button class="add-btn" type="button" data-add="${p.id}">${ICONES.plus}Ajouter</button>
                      <button class="link-btn" type="button" data-qv="${p.id}">Voir en 3D</button>
                    </div>
                  </article>`
                )
                .join('')}</div>`
            : ''
        }
        ${piece.astuce ? `<p class="piece__astuce">${ICONES.ampoule}<span>${esc(piece.astuce)}</span></p>` : ''}
        ${
          next
            ? `<a class="piece__suite" href="#piece-${next.id}">${ICONES.fleche}Pièce suivante : ${esc(next.nom)}</a>`
            : `<a class="piece__suite" href="#fin-visite">${ICONES.fleche}Terminer la visite</a>`
        }
      </div>
    </section>`;
  }).join('');
  $('#visite').innerHTML = html;
  $('#finRecap').innerHTML = PIECES.slice(1)
    .map((p) => `<a href="#piece-${p.id}" data-piece="${p.id}">${ICONES.check}${esc(p.nom)}</a>`)
    .join('');
}

function renderShop() {
  $('#filters').innerHTML = CATEGORIES.map(
    (c, i) => `<button class="chip ${i === 0 ? 'is-active' : ''}" type="button" data-cat="${c.id}" aria-pressed="${i === 0}">${esc(c.nom)}</button>`
  ).join('');
  $('#grid').innerHTML = PRODUITS.map(
    (p) => `<article class="card" data-cats="${p.categories.join(' ')}">
      <button class="card__media" type="button" data-qv="${p.id}" aria-label="Voir ${esc(p.court)} en détail">
        ${p.badge ? `<span class="card__badge">${esc(p.badge)}</span>` : ''}
        <img data-thumb="${p.id}" alt="${esc(p.nom)}" loading="lazy" />
        <span class="card__3d">${ICONES.rotation}Voir en 3D</span>
      </button>
      <div class="card__body">
        <h3>${esc(p.court)}</h3>
        <p>${esc(p.accroche)}</p>
        <div class="card__usages">${p.usages.map((u) => `<span>${esc(u)}</span>`).join('')}</div>
        <span class="swatches" aria-label="${p.coloris.length} coloris">${p.coloris.map((c) => `<i style="background:${couleur(c).hex}" title="${esc(couleur(c).nom)}"></i>`).join('')}<small>${p.coloris.length} coloris</small></span>
        <div class="card__foot">
          <span class="price">${prix(p.price)}${p.compareAt ? `<s>${prix(p.compareAt)}</s>` : ''}</span>
          <button class="add-btn" type="button" data-add="${p.id}">${ICONES.plus}Ajouter</button>
        </div>
      </div>
    </article>`
  ).join('');

  $('#filters').addEventListener('click', (e) => {
    const b = e.target.closest('[data-cat]');
    if (!b) return;
    document.querySelectorAll('.chip').forEach((c) => {
      c.classList.toggle('is-active', c === b);
      c.setAttribute('aria-pressed', c === b);
    });
    const cat = b.dataset.cat;
    document.querySelectorAll('.card').forEach((card) => {
      const show = cat === 'tout' || card.dataset.cats.split(' ').includes(cat);
      card.classList.toggle('is-hidden', !show);
      if (show && !reducedMotion) card.animate([{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], { duration: 450, easing: 'cubic-bezier(0.22,1,0.36,1)' });
    });
  });

  // effet de relief 3D au survol
  if (!coarse && !reducedMotion) {
    document.querySelectorAll('.card').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `perspective(900px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg) translateY(-4px)`;
      });
      card.addEventListener('pointerleave', () => (card.style.transform = ''));
    });
  }
}

function renderFaq() {
  $('#faqList').innerHTML = FAQ.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.r)}</p></details>`).join('');
}

function fillThumbs() {
  document.querySelectorAll('img[data-thumb]').forEach((img) => {
    const p = produit(img.dataset.thumb);
    if (p) img.src = thumb(p);
  });
}

/* --------------------------- Plan de la maison --------------------------- */
// Cases du plan (x, y, largeur, hauteur) dans un repère 160 x 122
const PLAN = {
  entree: [16, 86, 42, 30],
  salon: [59, 86, 42, 30],
  cuisine: [102, 86, 42, 30],
  bain: [16, 55, 42, 30],
  lecture: [59, 55, 42, 30],
  chambre: [102, 55, 42, 30],
  grenier: [52, 30, 56, 24],
};
function renderPlan() {
  const svg = $('#planSvg');
  const center = (id) => {
    const [x, y, w, h] = PLAN[id];
    return [x + w / 2, y + h / 2 + 3];
  };
  const order = PIECES.map((p) => p.id);
  const route = order.map((id) => center(id).join(',')).join(' ');
  const icoFor = { entree: 'maison', salon: 'fauteuil', cuisine: 'tasse', chambre: 'lit', lecture: 'livre', grenier: 'cadeau' };
  svg.innerHTML = `
    <path class="roof" d="M10 54 L80 6 L150 54 M14 54 V117 H146 V54" />
    ${Object.entries(PLAN)
      .map(([id, [x, y, w, h]]) => {
        const deco = !order.includes(id);
        return `<rect class="room ${deco ? 'is-deco' : ''}" data-room="${id}" x="${x}" y="${y}" width="${w}" height="${h}" rx="4">
          <title>${deco ? 'Salle de bain' : esc(PIECES.find((p) => p.id === id).nom)}</title></rect>`;
      })
      .join('')}
    ${Object.entries(icoFor)
      .map(([id, ico]) => {
        const [cx, cy] = center(id);
        return `<g class="ico" transform="translate(${cx - 6} ${cy - 9}) scale(0.5)">${ICONES[ico].replace(/<\/?svg[^>]*>/g, '')}</g>`;
      })
      .join('')}
    <polyline class="route" points="${route}" />
    <polyline class="route-done" id="routeDone" points="" />
    <circle class="here-ring" id="hereRing" r="5" cx="80" cy="120" />
    <circle class="here" id="here" r="4.5" cx="80" cy="120" />`;
  svg.addEventListener('click', (e) => {
    const r = e.target.closest('[data-room]');
    if (!r || r.classList.contains('is-deco')) return;
    document.getElementById('piece-' + r.dataset.room).scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
  });
  $('#progressDots').innerHTML = PIECES.map(() => '<i></i>').join('');
  return { center, order };
}

let planCtx;
let lastPlanKey = '';
const seen = new Set();
function updatePlan(s) {
  const { center, order } = planCtx;
  const vues = order.map((id) => VUES[id]);
  // pièce la plus proche de l'endroit où l'on se trouve
  let idx = -1;
  vues.forEach((v, i) => {
    if (Math.abs(s - v) < 0.6) idx = i;
  });
  const inRoom = idx >= 0;
  // position du point "vous êtes ici" sur le plan
  let x = 80;
  let y = 128;
  if (s < vues[0]) {
    const [ex, ey] = center(order[0]);
    const t = Math.max(0, Math.min(1, s / vues[0]));
    x = ex;
    y = 128 + (ey - 128) * t;
  } else {
    let a = vues.length - 1;
    for (let i = 0; i < vues.length - 1; i++) if (s < vues[i + 1]) { a = i; break; }
    const b = Math.min(vues.length - 1, a + 1);
    const t = b === a ? 0 : Math.max(0, Math.min(1, (s - vues[a]) / (vues[b] - vues[a])));
    const k = t < 0.35 ? 0 : (t - 0.35) / 0.65;
    const [ax, ay] = center(order[a]);
    const [bx, by] = center(order[b]);
    x = ax + (bx - ax) * k;
    y = ay + (by - ay) * k;
  }
  for (const id of ['here', 'hereRing']) {
    const c = document.getElementById(id);
    c.setAttribute('cx', x.toFixed(1));
    c.setAttribute('cy', y.toFixed(1));
  }
  const chaud = Math.min(1, s / (DERNIERE - 0.5));
  $('#planTemp').textContent = Math.round(19 + chaud * 18) + '°';
  $('#thermoFill').style.height = 8 + chaud * 92 + '%';
  const passed = vues.filter((v) => s > v + 0.6).length;
  const label = inRoom ? PIECES[idx].nom : s < vues[0] - 0.6 ? (s < 0.6 ? 'Dehors' : 'Devant la porte') : s > DERNIERE - 0.6 ? 'Toute la maison' : 'En chemin…';
  const key = `${idx}|${passed}|${label}`;
  if (key === lastPlanKey) return;
  lastPlanKey = key;
  const done = [];
  order.forEach((id, i) => {
    const el = document.querySelector(`[data-room="${id}"]`);
    el.classList.toggle('is-current', i === idx);
    el.classList.toggle('is-done', i < passed && i !== idx);
    if (i <= Math.max(idx, passed - 1)) done.push(center(id).join(','));
  });
  document.getElementById('routeDone').setAttribute('points', done.join(' '));
  if (inRoom) {
    seen.add(order[idx]);
    document.querySelectorAll('#finRecap [data-piece]').forEach((a) => a.classList.toggle('is-seen', seen.has(a.dataset.piece)));
  }
  $('#planHere').textContent = label;
  $('#progressLabel').textContent = inRoom ? `${idx + 1}/${order.length} · ${label}` : label;
  document.querySelectorAll('#progressDots i').forEach((d, i) => {
    d.classList.toggle('is-current', i === idx);
    d.classList.toggle('is-done', i < passed && i !== idx);
  });
}

/* ----------------------------- Défilement ----------------------------- */
let anchors = [];
function measure() {
  anchors = [...document.querySelectorAll('[data-view]')]
    .map((el) => ({ y: el.getBoundingClientRect().top + window.scrollY, v: Number(el.dataset.view) }))
    .sort((a, b) => a.v - b.v);
}
// position de défilement -> étape de la visite (0 = dehors, 13 = toute la maison)
function scrollToS() {
  const y = window.scrollY;
  if (!anchors.length || y <= anchors[0].y) return 0;
  for (let i = 0; i < anchors.length - 1; i++) {
    const a = anchors[i];
    const b = anchors[i + 1];
    if (y < b.y) return a.v + ((y - a.y) / (b.y - a.y)) * (b.v - a.v);
  }
  return anchors[anchors.length - 1].v;
}

/* ------------------------------ Démarrage ------------------------------ */
async function boot() {
  $('#year').textContent = new Date().getFullYear();
  const seuil = prix(CONFIG.livraisonOfferteDes).replace(',00', '');
  $('#heroShipping').textContent = `Livraison offerte dès ${seuil}`;
  $('#engShip').textContent = `Livraison offerte dès ${seuil}`;
  $('#footerMail').href = `mailto:${CONFIG.email}`;

  renderPieces();
  $('#fin-visite').dataset.view = VUES.fin;
  renderShop();
  renderFaq();
  planCtx = renderPlan();
  setLoad(0.15);

  // 3D : on vérifie que le navigateur sait l'afficher
  let world = null;
  let studio = null;
  const canWebGL = (() => {
    try {
      const c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
    } catch {
      return false;
    }
  })();

  if (canWebGL) {
    try {
      const [{ World }, { Studio }] = await Promise.all([import('./scene/world.js'), import('./scene/studio.js')]);
      setLoad(0.4);
      world = new World($('#scene'), { reducedMotion, lite });
      setLoad(0.65);
      studio = new Studio();
      setStudio(studio);
    } catch (e) {
      console.warn('3D indisponible :', e);
      world = null;
      studio = null;
      setStudio(null);
    }
  }
  if (!world) document.documentElement.classList.add('no-webgl');

  // vignettes produits (rendu 3D ou photos)
  await new Promise((r) => setTimeout(r, 20));
  fillThumbs();
  setLoad(0.9);

  initQuickView({ studio, onToggle: (open) => world && (world.paused = open) });
  initCart({ quickView: ouvrirProduit });
  refreshCart();

  // actions globales
  document.addEventListener('click', (e) => {
    const add = e.target.closest('[data-add]');
    if (add && add.dataset.add) {
      const p = produit(add.dataset.add);
      // les produits à pointure passent par la fiche pour choisir la taille
      if (p.tailles.length) ouvrirProduit(p.id);
      else ajouter(p.id, { from: add.closest('.card, .mini') || add });
      return;
    }
    const qv = e.target.closest('[data-qv]');
    if (qv && !qv.closest('#cart')) ouvrirProduit(qv.dataset.qv);
  });

  $('#clubForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = $('#clubEmail').value.trim();
    if (!email) return;
    if (CONFIG.newsletterUrl) {
      fetch(CONFIG.newsletterUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) }).catch(() => {});
    } else {
      window.location.href = `mailto:${CONFIG.email}?subject=${encodeURIComponent('Inscription au Club Cocon')}&body=${encodeURIComponent('Je souhaite rejoindre le Club Cocon avec cette adresse : ' + email)}`;
    }
    $('#clubForm').hidden = true;
    $('#clubOk').hidden = false;
  });

  // apparition douce des blocs
  const io = new IntersectionObserver(
    (entries) => entries.forEach((en) => en.isIntersecting && en.target.classList.add('is-in')),
    { threshold: 0.15 }
  );
  document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

  // points produits dans la scène 3D
  const hotLayer = $('#hotspots');
  if (world) {
    world.hotspots.forEach((h) => {
      const p = produit(h.productId);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'hotspot';
      b.tabIndex = -1;
      b.setAttribute('aria-hidden', 'true');
      b.innerHTML = `<span class="hotspot__dot"></span><span class="hotspot__label">${esc(p.court)} · <b>${prix(p.price)}</b></span>`;
      b.addEventListener('click', () => ouvrirProduit(p.id));
      hotLayer.appendChild(b);
      h.el = b;
    });
  }

  // boucle principale
  measure();
  window.addEventListener('resize', measure);
  window.addEventListener('load', measure);
  document.fonts && document.fonts.ready.then(measure);
  setTimeout(measure, 1200);

  let current = scrollToS();
  let last = performance.now();
  const header = $('#header');
  const plan = $('#plan');
  const prog = $('#progressMobile');
  const sheet = $('#sheet');

  if (world && !coarse) {
    window.addEventListener('pointermove', (e) => {
      world.setPointer((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    });
  }

  // On touche les objets de la maison directement en 3D
  const canvas = $('#scene');
  const ndc = (e) => [(e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1];
  const bubbleEl = $('#bubble');
  const bubble = { entry: null, timer: 0 };
  function placeBubble() {
    const p = world.screenOf(bubble.entry.top);
    // la bulle reste toujours entièrement visible à l'écran
    const w = bubbleEl.offsetWidth;
    const h = bubbleEl.offsetHeight;
    const x = Math.min(Math.max(p.x, 16 + w * 0.1), window.innerWidth - w * 0.9 - 16);
    const y = Math.min(Math.max(p.y, 90 + h + 14), window.innerHeight - 16);
    bubbleEl.style.transform = `translate(${x.toFixed(0)}px, ${y.toFixed(0)}px)`;
    bubbleEl.classList.toggle('is-off', !p.visible);
  }
  function showBubble(entry) {
    bubble.entry = entry;
    const p = entry.productId ? produit(entry.productId) : null;
    bubbleEl.innerHTML = `<p>${esc(entry.ligne)}</p>${p ? `<button type="button" data-qv="${p.id}">${ICONES.rotation}Voir ${esc(p.court)} en 3D</button>` : ''}`;
    bubbleEl.hidden = false;
    placeBubble();
    clearTimeout(bubble.timer);
    bubble.timer = setTimeout(hideBubble, 6000);
  }
  function hideBubble() {
    bubble.entry = null;
    bubbleEl.hidden = true;
  }
  bubbleEl.addEventListener('click', hideBubble);
  if (world) {
    let lastMove = 0;
    canvas.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const now = performance.now();
      if (now - lastMove < 40) return;
      lastMove = now;
      const hit = world.hover(...ndc(e));
      canvas.style.cursor = hit ? 'pointer' : '';
    });
    canvas.addEventListener('pointerleave', () => world.hover(null));
    canvas.addEventListener('click', (e) => {
      const hit = world.pick(...ndc(e));
      if (!hit) return hideBubble();
      if (hit.kind === 'product') {
        hideBubble();
        ouvrirProduit(hit.productId);
      } else if (hit.kind === 'door') {
        const target = current < VUES.porte - 0.3 ? '#porte' : '#piece-entree';
        $(target).scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
      } else {
        world.poke(hit);
        showBubble(hit);
      }
    });
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const target = scrollToS();
    current += (target - current) * (reducedMotion ? 1 : 1 - Math.exp(-dt * 5));
    if (Math.abs(target - current) < 0.0005) current = target;

    const sheetTop = sheet.getBoundingClientRect().top;
    const covered = sheetTop <= 0;
    header.classList.toggle('is-solid', window.scrollY > 40);
    plan.classList.toggle('is-hidden', current < 0.85 || sheetTop < window.innerHeight * 0.6);
    prog.classList.toggle('is-hidden', current < 0.85 || sheetTop < window.innerHeight * 0.6);
    if (bubble.entry) placeBubble();
    updatePlan(current);

    if (world && !world.paused && !covered && !document.hidden) {
      world.update(current, dt);
      world.render();
      const pts = world.projectHotspots();
      for (const { h, x, y, visible } of pts) {
        h.el.classList.toggle('is-on', visible);
        h.el.style.pointerEvents = visible ? 'auto' : 'none';
        if (visible) h.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-11px, -50%)`;
      }
    } else if (world && covered) {
      world.hotspots.forEach((h) => h.el.classList.remove('is-on'));
    }
    requestAnimationFrame(frame);
  }

  // premier rendu puis on lève le rideau
  if (world) {
    world.update(current, 0.016);
    world.render();
  }
  setLoad(1);
  setTimeout(() => $('#loader').classList.add('is-done'), 350);
  requestAnimationFrame(frame);
}

boot();
