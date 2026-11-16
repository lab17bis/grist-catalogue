# Ressources du Lab 17 bis : catalogues au DSFR adossés à Grist

**Publier un catalogue de ressources (outils, méthodes, conseils, assistants) et un catalogue d'interventions sous forme de pages web au Système de design de l'État (DSFR), alimentées par une base Grist.**

Conçu par le [Lab 17 bis](https://lab17bis.github.io/ressources/), laboratoire d'innovation publique de l'[académie de Reims](https://www.ac-reims.fr/), au sein de l'équipe Dynamique Modernisation et Transformation (DMT) du rectorat.

> Le dépôt ne contient **que le code des pages** : aucune ressource, aucun fichier, aucune donnée. Les fiches, descriptions et pièces jointes restent dans Grist, protégées par les règles d'accès du document.

## En bref

| Catalogue | Adresse publique | À quoi il sert |
| --- | --- | --- |
| **Catalogue de ressources** | <https://lab17bis.github.io/ressources/> | Partager les outils, méthodes, conseils et assistants du Lab 17 bis : intelligence collective, conduite de projet, accompagnement du changement. Chaque fiche peut être consultée, téléchargée et partagée par un lien direct. |
| **Catalogue des interventions** | <https://lab17bis.github.io/ressources/interventions/> | Rendre visible l'offre de service du Lab 17 bis : animations, formations et acculturations, sessions de facilitation, accompagnements de projet, demandes de conseil. |

Les deux pages fonctionnent de deux façons :

- **en page publique autonome**, en pleine page, pour les visiteurs ;
- **en widget personnalisé dans Grist**, comme vue de travail dans le document.

## Fonctionnalités

**Catalogue de ressources**

- Entrée par le besoin (« Je veux… comprendre une situation, cadrer et décider, imaginer et concevoir, faire échanger un groupe, formaliser et piloter le changement »).
- Sections par type (outils, méthodes, assistants, conseils, livrables, ateliers clés en main) et filtres propres à chaque section.
- Recherche plein texte et tri.
- Fiche détaillée : en bref, ce que ça apporte, comment faire, points de vigilance, matériel, aperçu des fiches PDF (recto et verso), téléchargement des pièces jointes.
- Lien direct partageable vers chaque fiche (`#r/<identifiant>`).
- Bouton « Contribuer » : message pré-rempli vers le Lab 17 bis.

**Catalogue des interventions**

- Filtres par statut (en cours, à venir, réalisées), type, année scolaire et origine (sollicitation ou initiative du Lab).
- Fiche détaillée : besoin, démarche, livrables, effets, ressources mobilisées, citation.
- Bouton « Solliciter le Lab ».

## Fonctionnement

```
Visiteur ──> GitHub Pages : page DSFR (code seulement)
         ──> API Grist, sans identifiant : fiches publiées et colonnes publiques uniquement
```

- En **page autonome**, la page interroge l'API de Grist comme un visiteur anonyme. Elle ne voit que ce que les **règles d'accès du document** (Permissions avancées) autorisent : seules les fiches publiées (case `valide`) et les colonnes publiques remontent. Ne retirez pas ces règles.
- En **widget Grist**, la page lit les données par l'API des widgets, avec les droits de la personne connectée.
- Les anciennes adresses `plein-ecran.html` redirigent vers la page autonome, en conservant le lien vers une fiche.
- Ajouter `?demo=1` à l'adresse affiche des données fictives.

## Mise en place

1. Dans Grist, préparez la table : colonnes `titre`, `type`, `description`, `tags`, `fichier`, `image`, `valide`, etc. La liste complète figure dans la constante `COLONNES` de `app.js` (et de `interventions/app.js`).
2. Posez les règles d'accès : les visiteurs ne lisent que les lignes publiées et les colonnes publiques.
3. Partagez le document en lecture publique.
4. Renseignez l'adresse du document et le nom de la table dans la constante `SOURCE` de `app.js`.
5. Pour la vue de travail, ajoutez dans Grist un widget **Personnalisé** avec l'adresse `https://lab17bis.github.io/ressources/` (ou `…/ressources/interventions/`), accès **lecture de la table**, puis associez les colonnes.

## Contenu du dépôt

| Fichier | Contenu |
| --- | --- |
| `index.html`, `app.js`, `style.css` | Catalogue de ressources. |
| `interventions/` | Catalogue des interventions (même socle). |
| `plein-ecran.html`, `interventions/plein-ecran.html` | Anciennes adresses, redirigées vers les pages autonomes. |
| `assets/` | Logos, visuels des assistants, lecteur PDF ([PDF.js](https://mozilla.github.io/pdf.js/)). |
| `dsfr/` | Feuilles de style, polices et icônes du DSFR (version 1.15.4), embarquées. |

## Écosystème

- **[Grist](https://grist.numerique.gouv.fr)** : tableur-base de données libre ([gristlabs/grist-core](https://github.com/gristlabs/grist-core)), proposé aux agents de l'État par la [DINUM](https://www.numerique.gouv.fr/) dans [La Suite numérique](https://lasuite.numerique.gouv.fr/).
- **[Système de design de l'État (DSFR)](https://www.systeme-de-design.gouv.fr/)** ([GouvernementFR/dsfr](https://github.com/GouvernementFR/dsfr)).
- **[Communauté Grist francophone](https://forum.grist.libre.sh/)**.
- Autres outils du Lab 17 bis : [questionnaires DSFR avec logique conditionnelle](https://github.com/lab17bis/questionnaires), [suivi de projets](https://github.com/lab17bis/projets).

## Mots-clés

Grist, widget Grist, catalogue, centre de ressources, bibliothèque d'outils, boîte à outils, fiches méthodes, intelligence collective, facilitation, conduite du changement, offre de service, DSFR, Système de design de l'État, La Suite numérique, DINUM, Éducation nationale, académie de Reims, laboratoire d'innovation publique, innovation publique.

## Licences et mentions

- Les **contenus** du catalogue (fiches, visuels) sont publiés sous licence [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/deed.fr), sauf mention contraire.
- Le **DSFR** (`dsfr/`) et la police Marianne sont fournis par le Gouvernement. Leur usage est réservé aux sites et services de la sphère publique. Voir <https://www.systeme-de-design.gouv.fr/>.
- Le **code** propre à ce dépôt est la production du Lab 17 bis.

Contact : Lab 17 bis, <lab17bis@ac-reims.fr>
