# Journal des modifications

Les adresses `/v1/` ne changent pas : chaque version ajoute ou corrige, sans retirer ce qui existe.

## 2026-11-27 (publication réservée)

### Ajouté

- Onglet Publication : rappel de la différence entre page publique et accès réservé aux personnes invitées, avec un lien réservé à copier pour le catalogue.

## 2026-11-26 (message de vérification de la publication)

### Corrigé
- « Vérifier l'accès public » signale aussi le cas d'une copie de travail non enregistrée (adresse contenant « ~ »), que personne d'autre ne peut lire.
- Publication > « Vérifier » : le message « Le document n'est pas lisible publiquement » donne maintenant la marche à suivre (Partager › accès public › Lecteur, réservé aux propriétaires), rappelle qu'une règle d'accès peut masquer la table aux visiteurs, et distingue l'erreur 404 (table introuvable pour un visiteur : nom de table ou partage public à vérifier).

## 2026-11-25 (mention de conception)

### Ajouté
- Mention discrète en pied de page, sur l'outil comme sur ses pages publiques : « Widget conçu par le Lab 17 bis, le laboratoire d'innovation publique de l'académie de Reims ».

## 2026-11-25 (audit de sécurité)

### Sécurité
- Les liens venant des données ou des réglages sont vérifiés par le navigateur lui-même : une adresse déguisée (« java⇥script: » avec tabulation, retour à la ligne ou caractère de contrôle) n'est plus acceptée. Elle permettait, sur le portail, d'exécuter du script au clic depuis une adresse fabriquée.
- Politique de sécurité de contenu stricte : seuls les scripts du site, l'API Grist et les scripts de la page connus par leur empreinte peuvent s'exécuter. L'évaluation de texte (« unsafe-eval ») reste permise : l'API officielle de Grist en a besoin (sans elle, les widgets restaient bloqués sur « Chargement… » dans Grist le 25/11 au matin). Un script injecté (lien javascript:, attribut onerror…) est bloqué même si un filtre le laissait passer.
- Feuilles de style du DSFR chargées depuis le CDN : empreinte d'intégrité (SRI), le navigateur refuse un fichier modifié.
- Code d'intégration (iframe) : le titre est échappé, un guillemet ne casse plus le code collé sur un autre site.

## 2026-11-24 (durcissement)

### Sécurité
- Les pages ajoutent une politique de sécurité de contenu minimale (pas d'objets embarqués, pas de balise base).

## 2026-11-24 (documentation)

### Modifié
- Documentation : l'outil de consultation s'appelle désormais `grist-consultation` (ancien nom `grist-decision`).

## 2026-11-24

### Ajouté
- Page du catalogue dans Grist : bouton « Configurer » qui ouvre l'éditeur.
- Éditeur (`editeur.html`) : bouton « Voir le catalogue » dans la barre du haut.

### Modifié
- Quand la table n'a pas encore de réglages de catalogue, la page ne montre plus seulement un message : elle propose le bouton « Configurer le catalogue ».
- L'éditeur garde ses onglets (réglages, en-tête et pied, aperçu, publication) et les adresses `editeur.html` et `index.html` restent valables.

## Versions antérieures

Voir l'historique des commits.
