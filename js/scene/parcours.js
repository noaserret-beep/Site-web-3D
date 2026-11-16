/* =====================================================================
   LE PARCOURS DANS LA MAISON
   Chaque étape = où se tient le visiteur (pos) et ce qu'il regarde (look).
   La molette / le swipe fait avancer la caméra d'une étape à l'autre,
   à hauteur d'yeux, en douceur.
   ===================================================================== */
export const ETAPES = [
  { nom: 'Dehors', pos: [9, 8.2, 46], look: [9, 7.0, 0], fov: 34, shift: 0.7, light: [0.8, 2.8, 6] },
  { nom: 'Devant la porte', pos: [0.8, 2.7, 11.5], look: [0.8, 2.3, 3.8], fov: 42, shift: 0.45, light: [0.8, 3.0, 6.5] },
  { nom: 'Le seuil', pos: [0.85, 2.95, 5.6], look: [0.6, 2.3, -1], fov: 52, shift: 0.35, light: [0.6, 3.6, 1.8] },
  { nom: "L'Entrée", pos: [1.1, 3.1, 3.05], look: [-1.3, 1.5, -2.6], fov: 56, shift: 1, light: [0.4, 3.6, 1.0] },
  { nom: 'Le Salon', pos: [7.4, 3.1, 3.05], look: [10.0, 1.1, -0.8], fov: 56, shift: 1, light: [9.8, 2.2, -1.2] },
  { nom: 'La Cuisine', pos: [15.0, 3.1, 3.05], look: [17.6, 1.5, 0.8], fov: 56, shift: 1, light: [17.4, 3.6, 1.0] },
  { nom: "L'escalier", pos: [17.0, 3.2, -0.6], look: [21.5, 5.6, -2.45], fov: 58, shift: 0.45, light: [19, 4, -1] },
  { nom: "L'étage", pos: [20.4, 7.2, -2.2], look: [21.0, 8.4, 1.5], fov: 58, shift: 0.45, light: [20, 8.5, -1] },
  { nom: 'La Chambre', pos: [20.4, 8.6, 3.05], look: [15.9, 6.6, -0.7], fov: 56, shift: 1, light: [17, 9.2, 1.2] },
  { nom: 'Le Coin lecture', pos: [11.8, 8.6, 3.05], look: [8.2, 6.6, -0.1], fov: 56, shift: 1, light: [8.6, 9.0, 1.2] },
  { nom: "L'échelle", pos: [5.8, 9.2, -1.4], look: [5.7, 12.8, -2.6], fov: 58, shift: 0.45, light: [6, 10, -1] },
  { nom: 'Sous les toits', pos: [6.0, 13.5, -1.5], look: [9.5, 12.6, 1.0], fov: 58, shift: 0.45, light: [8, 14, 0] },
  { nom: 'Le Grenier', pos: [9.0, 13.9, 3.05], look: [9.0, 11.6, 0.0], fov: 56, shift: 1, light: [9, 14.2, 1.0] },
  { nom: 'Toute la maison', pos: [9, 9.4, 50], look: [9, 7.6, 0], fov: 34, shift: 0, light: [9, 8, 8] },
];

// Étape du parcours où l'on s'arrête pour chaque section de la page
export const VUES = { accueil: 0, porte: 1, entree: 3, salon: 4, cuisine: 5, chambre: 8, lecture: 9, grenier: 12, fin: 13 };
export const DERNIERE = ETAPES.length - 1;
