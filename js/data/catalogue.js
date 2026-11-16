/* =====================================================================
   MAISON MELLOW — CATALOGUE & TEXTES
   ---------------------------------------------------------------------
   C'est le seul fichier à modifier pour changer vos produits, vos prix,
   vos couleurs ou les textes du parcours. Pas besoin de toucher au reste.

   • price / compareAt : en euros (compareAt = ancien prix barré, optionnel)
   • image : chemin vers une vraie photo (ex. "assets/produits/chaussons.jpg").
             Laissez vide ("") pour afficher le rendu 3D automatique.
   • model : forme 3D utilisée dans la scène ("chaussons", "bandeau",
             "nuque", "coffret", "housse")
   ===================================================================== */

export const CONFIG = {
  marque: 'Maison Mellow',
  devise: 'EUR',
  livraisonOfferteDes: 49,      // seuil de livraison offerte (en €)
  fraisDePort: 4.9,             // frais de port en dessous du seuil
  // Lien de paiement (Stripe Payment Link, Shopify, SumUp…).
  // Tant qu'il est vide, le bouton "Commander" ouvre la liste d'attente.
  lienPaiement: '',
  // Adresse d'inscription newsletter (Brevo, Mailchimp…). Vide = envoi par email.
  newsletterUrl: '',
  email: 'bonjour@maisonmellow.fr',
  instagram: 'https://instagram.com/',
  tiktok: 'https://tiktok.com/',
};

/* Couleurs proposées (nom affiché + teinte utilisée pour le rendu 3D) */
export const COLORIS = {
  creme:      { nom: 'Crème',        hex: '#efe2cf' },
  caramel:    { nom: 'Caramel',      hex: '#c48a5a' },
  sauge:      { nom: 'Sauge',        hex: '#a3ad8f' },
  rose:       { nom: 'Rose poudré',  hex: '#e6b9ad' },
  terracotta: { nom: 'Terracotta',   hex: '#bf6b47' },
  moka:       { nom: 'Moka',         hex: '#7a5638' },
};

export const PRODUITS = [
  {
    id: 'chaussons-nuage',
    nom: 'Chaussons bouillotte « Nuage »',
    court: 'Chaussons bouillotte',
    accroche: 'Vos pieds au chaud, comme au coin du feu.',
    description:
      "Des chaussons tout doux avec une poche chauffante amovible. Quelques minutes au micro-ondes et la chaleur enveloppe vos pieds pendant de longues minutes. Parfaits pour les soirées d'hiver, la circulation et les pieds toujours froids.",
    price: 34.9,
    compareAt: null,
    badge: 'Best-seller',
    model: 'chaussons',
    image: '',
    categories: ['pieds'],
    usages: ['Pieds froids', 'Détente', 'Circulation'],
    coloris: ['creme', 'caramel', 'sauge', 'rose'],
    tailles: ['35-38', '39-42', '43-46'],
    details: [
      'Extérieur ultra-doux effet moumoute',
      'Poche chauffante amovible',
      'Housse lavable en machine à 30 °C',
      'Semelle antidérapante',
    ],
  },
  {
    id: 'bandeau-cocon',
    nom: 'Bandeau bouillotte multifonction « Cocon »',
    court: 'Bandeau bouillotte',
    accroche: "Un seul bandeau, mille façons de s'apaiser.",
    description:
      "Le bandeau chauffant qui suit votre corps : sur le ventre pendant les règles, après un repas un peu lourd pour la digestion, ou dans le bas du dos. Sa ceinture réglable le maintient en place pour que vous puissiez bouger librement.",
    price: 29.9,
    compareAt: null,
    badge: 'Multifonction',
    model: 'bandeau',
    image: '',
    categories: ['ventre', 'digestion', 'dos'],
    usages: ['Règles', 'Digestion', 'Lombaires'],
    coloris: ['rose', 'creme', 'terracotta'],
    tailles: [],
    details: [
      'Ceinture réglable, maintien sans les mains',
      'Compartiments pour une chaleur bien répartie',
      'Housse douce et lavable',
      'Chaud au micro-ondes, frais au congélateur',
    ],
  },
  {
    id: 'nuque-douceur',
    nom: 'Bouillotte nuque & épaules « Douceur »',
    court: 'Bouillotte nuque',
    accroche: 'Pour dénouer les tensions de la journée.',
    description:
      "Elle épouse la forme de la nuque et vient se poser sur les épaules. Idéale après une journée devant l'écran, pendant la lecture ou juste avant de dormir.",
    price: 27.9,
    compareAt: null,
    badge: 'Nouveau',
    model: 'nuque',
    image: '',
    categories: ['dos'],
    usages: ['Nuque', 'Épaules', 'Stress'],
    coloris: ['sauge', 'creme', 'moka'],
    tailles: [],
    details: [
      'Forme ergonomique en U',
      'Poids enveloppant et rassurant',
      'Housse amovible et lavable',
    ],
  },
  {
    id: 'coffret-soiree-cocon',
    nom: 'Coffret « Soirée Cocon »',
    court: 'Coffret Soirée Cocon',
    accroche: 'Le duo chaleur, prêt à offrir.',
    description:
      "Les chaussons « Nuage » et le bandeau « Cocon » réunis dans une jolie boîte avec un mot doux. L'idée cadeau qui fait toujours plaisir (et qu'on a souvent envie de garder pour soi).",
    price: 59.9,
    compareAt: 64.8,
    badge: '-8 %',
    model: 'coffret',
    image: '',
    categories: ['coffrets'],
    usages: ['Cadeau', 'Duo', 'Pieds + ventre'],
    coloris: ['creme', 'rose'],
    tailles: ['35-38', '39-42', '43-46'],
    details: [
      '1 paire de chaussons « Nuage »',
      '1 bandeau multifonction « Cocon »',
      'Boîte cadeau + carte personnalisable',
    ],
  },
  {
    id: 'housse-rechange',
    nom: 'Housse de rechange',
    court: 'Housse de rechange',
    accroche: 'Toujours une housse propre sous la main.',
    description:
      "Une housse supplémentaire pour votre bandeau ou votre bouillotte nuque : on lave l'une pendant qu'on profite de l'autre.",
    price: 9.9,
    compareAt: null,
    badge: '',
    model: 'housse',
    image: '',
    categories: ['accessoires'],
    usages: ['Entretien'],
    coloris: ['creme', 'rose', 'sauge', 'terracotta'],
    tailles: [],
    details: ['Lavable en machine à 30 °C', 'Fermeture invisible'],
  },
];

/* ---------------------------------------------------------------------
   LE PARCOURS : chaque "pièce" de la maison met en scène un besoin.
   Comme dans un grand magasin, le client passe d'une pièce à l'autre
   et découvre toute la gamme avant d'arriver à la boutique.
   --------------------------------------------------------------------- */
export const PIECES = [
  {
    id: 'entree',
    nom: "L'Entrée",
    icone: 'maison',
    titre: 'Entrez, installez-vous.',
    texte:
      "Bienvenue chez Maison Mellow. Ici, tout est pensé pour la chaleur douce : celle qui détend les pieds, apaise le ventre et dénoue la nuque. Suivez le chemin, on vous fait visiter.",
    produits: [],
    astuce: null,
  },
  {
    id: 'salon',
    nom: 'Le Salon',
    icone: 'fauteuil',
    titre: 'Les pieds au chaud, enfin.',
    texte:
      "Fin de journée, plaid sur les genoux, feu qui crépite… Il ne manquait que des chaussons qui gardent la chaleur. On les réchauffe quelques minutes et le cocon commence.",
    produits: ['chaussons-nuage'],
    astuce: 'Le saviez-vous ? Quand les pieds sont au chaud, tout le corps se détend plus vite.',
  },
  {
    id: 'cuisine',
    nom: 'La Cuisine',
    icone: 'tasse',
    titre: 'Une digestion toute en douceur.',
    texte:
      "Après un bon repas, une infusion et un peu de chaleur sur le ventre : le bandeau multifonction devient votre allié digestion. Un produit, plusieurs usages.",
    produits: ['bandeau-cocon', 'housse-rechange'],
    astuce: "Retenez-le bien : vous allez le recroiser à l'étage, dans la chambre.",
  },
  {
    id: 'chambre',
    nom: 'La Chambre',
    icone: 'lit',
    titre: 'Un ventre apaisé pendant les règles.',
    texte:
      "Les douleurs de règles, on connaît. Le bandeau « Cocon » se pose sur le bas du ventre et diffuse une chaleur enveloppante, sans fil ni prise. Il vous suit du lit au canapé, et se glisse sous l'oreiller 20 minutes avant de dormir.",
    produits: ['bandeau-cocon'],
    astuce: "Oui, c'est le même bandeau qu'à la cuisine : c'est ça, le multifonction !",
  },
  {
    id: 'lecture',
    nom: 'Le Coin lecture',
    icone: 'livre',
    titre: 'Nuque détendue, épaules relâchées.',
    texte:
      "Écrans, sac lourd, longues journées… La bouillotte nuque se pose comme une écharpe chaude. Et le bandeau, glissé dans le bas du dos, soulage les lombaires.",
    produits: ['nuque-douceur', 'bandeau-cocon'],
    astuce: 'Le petit plus : 10 minutes de chaleur sur la nuque avant de lire, et tout se relâche.',
  },
  {
    id: 'grenier',
    nom: 'Le Grenier à cadeaux',
    icone: 'cadeau',
    titre: 'Faire plaisir (ou se faire plaisir).',
    texte:
      "Un anniversaire, Noël, une amie qui a toujours froid ? Le coffret « Soirée Cocon » réunit nos deux best-sellers dans une jolie boîte, prête à offrir.",
    produits: ['coffret-soiree-cocon'],
    astuce: 'Le coffret revient moins cher que les deux produits achetés séparément.',
  },
];

export const CATEGORIES = [
  { id: 'tout', nom: 'Tout voir' },
  { id: 'pieds', nom: 'Pieds' },
  { id: 'ventre', nom: 'Règles' },
  { id: 'digestion', nom: 'Digestion' },
  { id: 'dos', nom: 'Nuque & dos' },
  { id: 'coffrets', nom: 'Coffrets' },
  { id: 'accessoires', nom: 'Accessoires' },
];

export const FAQ = [
  {
    q: 'Comment réchauffer mes produits Maison Mellow ?',
    r: "Retirez la housse si la notice le demande, puis chauffez au micro-ondes en suivant exactement le temps et la puissance indiqués sur l'étiquette. Vérifiez toujours la température avant de poser le produit sur la peau.",
  },
  {
    q: 'Combien de temps la chaleur dure-t-elle ?',
    r: "Selon le produit et la pièce, la chaleur douce dure généralement entre 20 et 40 minutes. Vous pouvez la réactiver dès qu'elle retombe, en respectant les temps de chauffe conseillés.",
  },
  {
    q: 'Puis-je utiliser le bandeau en version froide ?',
    r: 'Oui : placé au congélateur dans un sac, le bandeau devient une poche de froid, pratique pour les jambes lourdes ou les petits coups.',
  },
  {
    q: 'Comment les entretenir ?',
    r: "Les housses se lavent en machine à 30 °C. La poche chauffante, elle, ne se lave pas : on la retire avant de laver la housse.",
  },
  {
    q: 'Quels sont les délais de livraison ?',
    r: 'Les commandes sont préparées avec soin sous 24 à 48 h ouvrées, puis livrées en 2 à 4 jours en France métropolitaine.',
  },
];
