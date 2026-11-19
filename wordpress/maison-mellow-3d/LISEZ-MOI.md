# Maison Mellow 3D : extension WordPress

Cette extension affiche la visite 3D de la maison Maison Mellow en plein écran sur une page de
votre site WordPress, et la relie à WooCommerce pour le panier et le paiement.

## 1. Installer l'extension

1. Dans WordPress : **Extensions › Ajouter une extension › Téléverser une extension**.
2. Choisissez le fichier `maison-mellow-3d.zip`, puis **Installer maintenant** et **Activer**.

Le fichier pèse environ 20 Mo (meubles 3D et textures). Si votre hébergeur refuse un fichier aussi
lourd, décompressez-le et envoyez le dossier `maison-mellow-3d` dans `wp-content/plugins/` avec le
gestionnaire de fichiers de votre hébergeur (ou en FTP), puis activez l'extension.

## 2. Choisir la page de la visite

1. **Pages › Ajouter** : créez une page vide, par exemple « Accueil ». Publiez-la.
2. **Réglages › Maison Mellow 3D** : choisissez cette page dans « Page de la visite ».
3. Pour en faire la page d'accueil : **Réglages › Lecture › Une page statique**, puis choisissez-la.

Autres façons d'afficher la visite sur une page : le modèle de page
« Maison Mellow : visite 3D (plein écran) », ou le code court `[maison_mellow_3d]`.

La visite s'affiche en plein écran, avec son propre design : l'en-tête et le pied de page du thème
n'apparaissent pas sur cette page.

## 3. Relier vos produits WooCommerce

Dans **Réglages › Maison Mellow 3D**, associez chaque produit de la maison à votre produit
WooCommerce. Ensuite :

- les **prix**, les **promotions**, le **stock** et les **photos** viennent de WooCommerce ;
- le bouton **Commander** du panier remplit le panier WooCommerce et ouvre votre page de
  paiement (Stripe, PayPal, CB… selon vos réglages WooCommerce).

### Produits avec couleurs et pointures (produits variables)

Créez des **produits variables** avec des attributs nommés **Coloris** et **Pointure** (ces noms
se changent dans les réglages). Les valeurs doivent être écrites exactement comme sur le site :

- Coloris : `Crème`, `Caramel`, `Sauge`, `Rose poudré`, `Terracotta`, `Moka`
- Pointure : `35-38`, `39-42`, `43-46`

Un produit sans variantes (par exemple la housse) peut être un **produit simple**.

## 4. Modifier les textes

Les textes de la visite (pièces, descriptions, FAQ) se trouvent dans
`site/js/data/catalogue.js`. Les prix affichés sont remplacés par ceux de WooCommerce dès que
les produits sont reliés.

## Bon à savoir

- Sans WooCommerce, le bouton « Commander » propose au client d'envoyer sa commande par email.
- Si vous utilisez une extension de cache (WP Rocket, LiteSpeed…), videz le cache après chaque
  modification.
- Meubles, textures et éclairage 3D : Poly Haven, licence CC0.
