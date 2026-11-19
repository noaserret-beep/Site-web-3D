// Réglages transmis par WordPress (extension Maison Mellow 3D).
// Hors WordPress, cet objet est vide et le site fonctionne seul.
export const WP = (typeof window !== 'undefined' && window.MAISON_MELLOW) || {};

// Adresse du dossier du site : vide hors WordPress (chemins relatifs)
export const BASE = WP.base || '';

// Chemin complet d'un fichier du site (les adresses complètes sont gardées telles quelles)
export const url = (p) => (!p || /^(https?:|data:|blob:|\/)/.test(p) ? p : BASE + p);
