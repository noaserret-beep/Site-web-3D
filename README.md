# Maison Mellow : site e-commerce 3D

Le site de **Maison Mellow** (chaussons bouillotte, bandeau bouillotte multifonction, bouillotte nuque…).

Le principe : comme chez IKEA, le client **visite une maison en 3D, pièce par pièce**, en suivant un
chemin de points lumineux. Chaque pièce met en scène un besoin (pieds froids, règles, digestion,
nuque…) et les produits qui y répondent. La visite se termine sur la boutique complète.

## Ce que contient le site

- **Accueil 3D** : la maison Maison Mellow sous la neige. En faisant défiler, la façade s'ouvre comme
  une maison de poupée.
- **6 pièces** : Entrée, Salon (chaussons), Cuisine (digestion), Chambre (règles),
  Coin lecture (nuque et dos), Grenier à cadeaux (coffret).
- **Points produits 3D** cliquables dans chaque pièce, avec le prix.
- **Plan de la maison** (en bas à droite) avec un « Vous êtes ici » et un thermomètre qui monte
  au fil de la visite : le site se réchauffe à mesure qu'on avance.
- **Raccourci boutique**, toujours accessible, pour ceux qui veulent aller droit au but.
- **Fiche produit** avec le produit en 3D qu'on fait tourner, choix du coloris (la 3D change de
  couleur en direct), pointure, quantité et suggestions « Ça va très bien avec ».
- **Panier** avec barre « Plus que X € pour la livraison offerte » et suggestions pour
  compléter le panier.
- Boutique filtrable, engagements, FAQ, newsletter « Club Cocon », pied de page.
- Version mobile, mode « animations réduites » respecté, et une version sans 3D si le navigateur
  ne la supporte pas.

## Modifier les produits, prix et textes

Tout se trouve dans **un seul fichier** : [`js/data/catalogue.js`](js/data/catalogue.js).

- `CONFIG` : seuil de livraison offerte, frais de port, email de contact, lien de paiement.
- `COLORIS` : les couleurs proposées.
- `PRODUITS` : nom, prix, description, coloris, tailles, badges…
  Pour mettre une vraie photo, renseignez `image: 'assets/produits/ma-photo.jpg'`.
  Sans photo, le site affiche automatiquement un rendu 3D du produit.
- `PIECES` : les textes de chaque pièce de la visite.
- `FAQ` : questions et réponses.

## Le paiement

Tant que `CONFIG.lienPaiement` est vide, le bouton **Commander** ouvre une fenêtre qui permet au
client d'envoyer sa commande par email (pratique pour démarrer).

Pour encaisser en ligne, plusieurs options simples :

1. **Stripe Payment Links** ou **SumUp** : créez un lien de paiement et collez-le dans
   `CONFIG.lienPaiement`.
2. **Shopify** (Starter ou Buy Button) : gestion des stocks, paiements, expéditions. Le site peut
   servir de vitrine et renvoyer vers le panier Shopify.

## Voir le site sur son ordinateur

Le site n'a besoin d'aucune installation, mais il doit être servi par un petit serveur web
(les navigateurs bloquent la 3D quand on ouvre le fichier directement) :

```bash
# depuis le dossier du projet
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```

## Mettre le site en ligne

Le site est 100 % statique : il peut être hébergé gratuitement.

- **GitHub Pages** : dans le dépôt GitHub, *Settings › Pages › Deploy from a branch*, choisir la
  branche et le dossier `/ (root)`.
- **Netlify** ou **Vercel** : glisser-déposer le dossier, ou connecter le dépôt.

## Structure

```
index.html              la page
css/style.css           le design
js/data/catalogue.js    produits, prix, textes (à modifier)
js/main.js              démarrage, défilement, plan, boutique
js/ui/                  panier, fiche produit, utilitaires
js/scene/world.js       la maison 3D et la visite
js/scene/models.js      les modèles 3D (produits et mobilier)
js/scene/studio.js      le "studio photo" 3D des fiches produit
js/scene/textures.js    textures dessinées (parquet, papier peint…)
assets/                 logo, favicon
vendor/three/           moteur 3D three.js (licence MIT)
```
