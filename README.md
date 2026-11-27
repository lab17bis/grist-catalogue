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

Démonstration avec des données fictives : <https://lab17bis.github.io/grist-catalogue/v1/?demo>

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

1. **Ajouter l'éditeur** : dans un document Grist, même vide, ajoutez une page *Personnalisé* sur la table de vos fiches (ou sur la table de départ), avec l'adresse `https://lab17bis.github.io/grist-catalogue/v1/editeur.html`, et accordez l'**accès complet**.
2. **Démarrer** : l'éditeur prépare un catalogue à partir des colonnes de la table. Sur une table vide, il propose aussi *Créer un catalogue d'exemple* : colonnes, fiches fictives et réglages, prêts à adapter.
3. **Régler** : onglet *Réglages* (sous-onglets *Catalogue* et *Fiche*), puis *En-tête et pied*. Vérifiez dans *Aperçu*, puis cliquez sur *Enregistrer*.
4. **Ouvrir au public** : partagez le document en lecture publique (*Partager › accès public : Lecteur*). Avec les *Permissions avancées*, réservez la lecture des visiteurs aux fiches publiées : l'onglet *Publication* donne la règle à copier.
5. **Diffuser** : l'onglet *Publication* vérifie l'accès public et donne le lien de la page :
   `https://lab17bis.github.io/grist-catalogue/v1/?grist=<lien du document>&table=<table>`

Conseil : donnez à la table un nom simple, sans tiret bas final (`Ressources` plutôt que `Base_de_donnees_ressources_`). Certaines messageries coupent ce caractère en fin de lien.

Pour un catalogue interne, non public : ajoutez dans Grist une vue *Personnalisée* avec l'adresse `https://lab17bis.github.io/grist-catalogue/v1/index.html` (accès complet). Le catalogue s'affiche alors avec les droits de chaque personne connectée.

Le modèle [`modele/modele-grist-catalogue.grist`](modele/modele-grist-catalogue.grist) reste disponible pour qui préfère importer un document tout prêt, règles d'accès comprises.

## Le régler

L'éditeur, ouvert dans Grist, a la barre commune aux widgets du Lab 17 bis : nom et statut à gauche, quatre onglets au centre, *Enregistrer* à droite.

| Onglet | Ce qu'on y règle |
| --- | --- |
| Réglages › Catalogue | Colonnes utilisées, sections, entrées thématiques, filtres, recherche, tris, étiquettes et couleurs |
| Réglages › Fiche | Informations clés, blocs de contenu et leurs conditions, pièces jointes, aperçu du PDF |
| En-tête et pied | Logo, bloc-marque, titre, sous-titre, boutons, pied de page, mention d'accessibilité |
| Aperçu | Le catalogue tel qu'il s'affichera, avec vos données |
| Publication | Affichage de cette vue Grist (éditeur ou page d'usage), vérification de l'accès public, lien de la page, code d'intégration, export et import des réglages |

**Éditeur du widget ou page d'usage, avec le même lien.** Chaque vue Grist choisit ce qu'elle affiche (onglet *Publication*, rubrique *Affichage de cette vue Grist*) : l'**éditeur du widget** (affichage par défaut) ou la **page d'usage** (l'outil avec son en-tête et son pied de page, sans barre de réglages ; un lien *Éditer le widget*, en bas de page, rouvre l'éditeur). Après *Appliquer à cette vue*, cliquez sur *Enregistrer* en haut à droite de la vue Grist pour garder le choix. Pour avoir les deux dans un document, ajoutez deux vues Personnalisées avec la même adresse. Ce choix n'est pas une protection : les droits restent ceux du document (Partager, Permissions avancées).

Arrivé dans l'éditeur par le bouton *Configurer* de la page de lecture (`index.html`), le bouton *Fermer l'éditeur* y ramène.

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

## Version stable et version en cours

Dans Grist, utilisez l'adresse de la **version stable** : `https://lab17bis.github.io/grist-catalogue/v1/`. Elle ne change que pour corriger un défaut, sans toucher aux tables ni aux réglages. Une évolution qui les modifie paraît sous une nouvelle adresse (`v2/`) : les documents déjà en service restent sur `v1/` tant que vous ne changez pas l'adresse du widget.

L'adresse sans numéro (`https://lab17bis.github.io/grist-catalogue/`) suit la version en cours de développement. Elle sert à essayer les nouveautés ; ne l'utilisez pas pour un document en service.

Pour figer une nouvelle version stable après des tests réussis : `sh outils/figer-version.sh 1` (ou `2` pour une version qui change les tables), puis publiez le dépôt.

## Données partagées avec les autres outils

Plusieurs outils de la même famille peuvent travailler dans un même document Grist. Ils suivent une règle commune pour ne pas dupliquer les données :

- **Une seule table `Personnes`** par document. Colonne commune : `Nom`. Colonnes facultatives reconnues par tous : `Email` et `Structure` (référence à `Structures`). Un outil lit cette table si elle existe et la crée seulement si elle manque. Il n'y ajoute que ses propres colonnes.
- **Une seule table `Structures`** pour les équipes, services ou établissements : `Nom`, `Sigle`, `Type`, `Parent` (structure de rattachement).
- **Aucun outil ne supprime ni ne renomme** une table ou une colonne qu'il n'a pas créée.
- **Les autres tables portent des noms propres à chaque outil**, pour éviter les collisions (par exemple `Actions` pour grist-projet, `Actions_reunion` pour grist-reunion). Les réglages sont rangés dans la description d'une colonne technique propre à l'outil (`Config_…`).
- **Identifier la personne connectée** : un widget ne connaît pas l'adresse de la personne connectée. Les colonnes « créé par » utilisent une formule `user.Email` calculée à la création. Seul un outil qui doit relier la personne connectée à sa fiche crée la table `Comptes`.

Ce que fait cet outil : Il ne crée aucune table de personnes : les fiches vont dans la table que vous choisissez.

## Espaces clés en main

Ce widget est déjà assemblé, avec d'autres, dans des **espaces** : des documents Grist complets à importer en une fois, vides ou avec un exemple fictif.

- [espace-collaboratif](https://github.com/lab17bis/espace-collaboratif) : travailler ensemble : réunions, projets partagés et ressources communes.
- [espace-accompagnement](https://github.com/lab17bis/espace-accompagnement) : suivre les sollicitations : offre de service, fiches contact, satisfaction et indicateurs.
- [espace-communaute](https://github.com/lab17bis/espace-communaute) : animer une communauté de pratique ou un réseau : membres, groupes, rencontres et présences, ressources partagées (proposées aussi par formulaire public), retours et indicateurs.

## Autres outils de la même famille

- [grist-questionnaire](https://github.com/lab17bis/grist-questionnaire) : questionnaires au DSFR avec logique conditionnelle.
- [grist-graphique](https://github.com/lab17bis/grist-graphique) : tableaux de bord et graphiques au DSFR.
- [grist-projet](https://github.com/lab17bis/grist-projet) : espace d'équipe pour gérer des projets.
- [grist-reunion](https://github.com/lab17bis/grist-reunion) : réunions : ordre du jour, séance, compte rendu et suivi des actions.
- [grist-management](https://github.com/lab17bis/grist-management) : écran de management visuel d'équipe.
- [grist-consultation](https://github.com/lab17bis/grist-consultation) : consultations : boîte à idées, valorisation des réalisations, votes et suites données.
- [grist-annuaire](https://github.com/lab17bis/grist-annuaire) : annuaire des personnes et des structures d'un document : recherche, fiches, doublons, import, protection des données.
- [grist-carte](https://github.com/lab17bis/grist-carte) : carte interactive des lignes d'une table, au fond de l'IGN.
- [grist-graphe](https://github.com/lab17bis/grist-graphe) : cartographie des acteurs et de leurs liens.

Les widgets qui ont un en-tête et un pied de page partagent les mêmes réglages.

## Écosystème

- **[Grist](https://grist.numerique.gouv.fr)** : tableur-base de données libre ([gristlabs/grist-core](https://github.com/gristlabs/grist-core)), proposé aux agents publics par la [DINUM](https://www.numerique.gouv.fr/) dans [La Suite numérique](https://lasuite.numerique.gouv.fr/).
- **[Système de design de l'État (DSFR)](https://www.systeme-de-design.gouv.fr/)** ([GouvernementFR/dsfr](https://github.com/GouvernementFR/dsfr)). Son usage est réservé aux sites des services de l'État.
- **[Communauté Grist francophone](https://forum.grist.libre.sh/)**.

## Mots-clés

Grist, widget Grist, widget personnalisé, widget de mise en page, catalogue, centre de ressources, boîte à outils, base documentaire, fiches, offre de service, page publique, DSFR, Système de design de l'État, La Suite numérique, DINUM, service public, administration, clé en main, logiciel libre.

## Licence

Code sous licence MIT (voir `LICENSE`). Le DSFR (`vendor/dsfr/`) et PDF.js (`vendor/pdfjs/`) conservent leurs licences.

Conçu par le Lab 17 bis, laboratoire d'innovation publique de l'académie de Reims. Contributions bienvenues.

Widget conçu par le Lab 17 bis, le laboratoire d'innovation publique de l'académie de Reims.
