# grist-catalogue

> **Widget de mise en page pour Grist, clé en main.** Il transforme une table Grist en catalogue au Système de design de l'État (DSFR) : cartes, fiches détaillées, recherche, filtres, étiquettes de couleur, téléchargement des pièces jointes.

Tout se règle dans Grist, sans toucher au code : en-tête, logo, boutons, sections, filtres, couleurs, contenu des fiches. Le dépôt ne contient que le code : aucune donnée, aucun contenu propre à un usage.

## À quoi ça sert

Vous avez une table Grist de fiches : outils, méthodes, ressources, projets, actions, interventions, offres de service… Vous voulez la **mettre à disposition** sous forme de site consultable, aux couleurs de l'État, sans développer de site et sans quitter Grist.

| Vous avez | Vous obtenez |
| --- | --- |
| Une table Grist, une ligne par fiche | Une page web en pleine page, au DSFR |
| Des colonnes (titre, type, thèmes, fichiers…) | Des cartes, des filtres, une recherche, des fiches détaillées |
| Des pièces jointes (PDF, images) | Des vignettes, un aperçu du PDF, des boutons de téléchargement |
| Une case « publié » | Seules les fiches validées s'affichent |

Démonstration avec des données fictives : <https://lab17bis.github.io/grist-catalogue/?demo>

## Ce que le widget sait faire

- **En-tête et pied de page** : bloc-marque, logo, titre, sous-titre, boutons à droite (contact, contribution…), logos et liens en pied de page, mention d'accessibilité.
- **Sections** : un découpage principal (par type, par statut…), avec ordre et libellés au choix.
- **Entrées thématiques** : des raccourcis du type « Je veux… » qui regroupent plusieurs valeurs.
- **Filtres** : par colonne, à choix unique ou multiple, visibles partout ou seulement dans une section.
- **Étiquettes de couleur** : sur les cartes et les fiches, une couleur par colonne ou par valeur, et l'étiquette « Nouveau ».
- **Recherche** et **tris** : mélange, par section, plus récentes, ordre alphabétique.
- **Mise en avant** : un bloc « À la une ».
- **Fiche détaillée** : informations clés et blocs de contenu au choix (texte, liste, étapes numérotées, encadré, vigilance, citation, étiquettes, message), affichables sous condition.
- **Pièces jointes** : vignette, galerie d'images, aperçu du PDF, téléchargement.
- **Lien direct** vers chaque fiche, et code d'intégration (iframe) pour un autre site.

## Le brancher en 5 minutes

1. **Partir du modèle** (recommandé) : téléchargez [`modele/modele-grist-catalogue.grist`](modele/modele-grist-catalogue.grist), puis importez-le dans Grist (*Ajouter › Importer un document*). Il contient une table d'exemple vide, les réglages, les règles d'accès et les pages de l'éditeur. Vous pouvez aussi partir de votre propre table.
2. **Ajouter l'éditeur** : dans le document, ajoutez une vue *Personnalisée* sur la table, avec l'adresse `https://lab17bis.github.io/grist-catalogue/editeur.html`, et accordez l'**accès complet**. Cette étape est déjà faite dans le modèle.
3. **Régler** : onglets *En-tête et pied*, *Catalogue* et *Fiche*. Vérifiez dans *Aperçu*, puis cliquez sur *Enregistrer*.
4. **Ouvrir au public** : partagez le document en lecture publique (*Partager › accès public : Lecteur*). Avec les *Permissions avancées*, réservez la lecture des visiteurs aux fiches publiées. Le modèle contient déjà ces règles.
5. **Diffuser** : l'onglet *Publication* vérifie l'accès public et donne le lien de la page :
   `https://lab17bis.github.io/grist-catalogue/?grist=<lien du document>&table=<table>`

Pour un catalogue interne, non public : ajoutez dans Grist une vue *Personnalisée* avec l'adresse `https://lab17bis.github.io/grist-catalogue/index.html` (accès complet). Le catalogue s'affiche alors avec les droits de chaque personne connectée.

## Le régler

L'éditeur, ouvert dans Grist, compte cinq onglets :

| Onglet | Ce qu'on y règle |
| --- | --- |
| En-tête et pied | Logo, bloc-marque, titre, sous-titre, boutons, pied de page, mention d'accessibilité |
| Catalogue | Colonnes utilisées, sections, entrées thématiques, filtres, recherche, tris, étiquettes et couleurs |
| Fiche | Informations clés, blocs de contenu et leurs conditions, pièces jointes, aperçu du PDF |
| Aperçu | Le catalogue tel qu'il s'affichera, avec vos données |
| Publication | Vérification de l'accès public, lien de la page, code d'intégration, export et import des réglages |

Les réglages sont enregistrés en JSON dans la **description de la colonne `Config_catalogue`** de la table. Ne supprimez pas cette colonne.

## Le reprendre et l'adapter

- **L'utiliser tel quel** : pointez vos documents Grist vers les adresses ci-dessus. Aucune installation n'est nécessaire.
- **L'héberger chez vous** : copiez le dépôt (*Fork*), activez GitHub Pages ou déposez les fichiers sur n'importe quel serveur web statique. Aucune compilation n'est nécessaire.
- **Réutiliser des réglages** : l'onglet *Publication* exporte et importe les réglages en JSON. Ils ne contiennent aucune fiche.
- **Modifier le code** : `js/catalogue.js` (moteur), `js/editeur.js` (éditeur), `js/page-dsfr.js` (en-tête et pied de page communs).

| Fichier | Rôle |
| --- | --- |
| `index.html` | Page du catalogue (publique, ou vue de lecture dans Grist) |
| `editeur.html`, `js/editeur.js`, `css/editeur.css` | Éditeur des réglages (widget Grist) |
| `js/catalogue.js`, `css/catalogue.css` | Moteur du catalogue |
| `js/page-dsfr.js`, `js/page-editeur.js`, `css/page.css` | En-tête et pied de page configurables, communs aux outils `grist-*` |
| `exemples/demo.json` | Réglages et fiches fictives de la démonstration |
| `modele/` | Modèle de document Grist sans données, à importer |
| `vendor/` | DSFR 1.15.4 et PDF.js, embarqués |

## Fonctionnement et sécurité

```
Visiteur ──> page DSFR (ce dépôt, GitHub Pages)
         ──> API Grist, sans identifiant : fiches et colonnes autorisées par les règles d'accès
```

- La page publique lit le document comme un visiteur anonyme. Elle ne voit que ce que les **règles d'accès** du document autorisent.
- Une fiche masquée par la page (non publiée) reste lisible par l'API si aucune règle d'accès ne la protège. L'onglet *Publication* le signale.
- Paramètres d'adresse : `?demo` pour la démonstration, `&integre=1` pour masquer l'en-tête et le pied de page (intégration dans un autre site).

## Limites

- Le catalogue public suppose un document partagé en lecture publique. Pour un catalogue interne, utilisez la vue dans Grist.
- Les colonnes de type Référence s'affichent sous forme de numéro : préférez des colonnes Texte, Choix ou Liste de choix.
- Pas de pagination : le widget est prévu pour quelques centaines de fiches.
- Aucun audit RGAA n'a été mené.

## Autres outils de la même famille

- [grist-questionnaire](https://github.com/lab17bis/grist-questionnaire) : widget de mise en page pour Grist, questionnaires au DSFR avec logique conditionnelle.
- [grist-graphique](https://github.com/lab17bis/grist-graphique) : widget de mise en page pour Grist, tableaux de bord et graphiques au DSFR.
- [grist-projet](https://github.com/lab17bis/grist-projet) : widget-outil pour Grist, espace d'équipe pour gérer des projets au DSFR.

Ils partagent les mêmes réglages d'en-tête et de pied de page.

## Écosystème

- **[Grist](https://grist.numerique.gouv.fr)** : tableur-base de données libre ([gristlabs/grist-core](https://github.com/gristlabs/grist-core)), proposé aux agents publics par la [DINUM](https://www.numerique.gouv.fr/) dans [La Suite numérique](https://lasuite.numerique.gouv.fr/).
- **[Système de design de l'État (DSFR)](https://www.systeme-de-design.gouv.fr/)** ([GouvernementFR/dsfr](https://github.com/GouvernementFR/dsfr)). Son usage est réservé aux sites des services de l'État.
- **[Communauté Grist francophone](https://forum.grist.libre.sh/)**.

## Mots-clés

Grist, widget Grist, widget personnalisé, widget de mise en page, catalogue, centre de ressources, boîte à outils, base documentaire, fiches, offre de service, page publique, DSFR, Système de design de l'État, La Suite numérique, DINUM, service public, administration, clé en main, logiciel libre.

## Licence

Code sous licence MIT (voir `LICENSE`). Le DSFR (`vendor/dsfr/`) et PDF.js (`vendor/pdfjs/`) conservent leurs licences.

Conçu par le Lab 17 bis, laboratoire d'innovation publique de l'académie de Reims. Contributions bienvenues.
