/*
 * Éditeur du catalogue : widget personnalisé Grist (accès complet au document).
 * Les réglages sont enregistrés en JSON dans la description de la colonne technique
 * « Config_catalogue » de la table. La page publique (index.html) les lit.
 */
(function () {
  "use strict";

  var K = window.Catalogue;
  var E = { tableId: null, colonnes: [], lignes: [], types: {}, config: null, colConfig: false, vue: "liste", modifie: false, apercu: null, base: null };

  var FORMATS = [
    ["texte", "Texte"], ["paragraphes", "Paragraphes (une ligne = un paragraphe)"], ["liste", "Liste à puces"],
    ["etapes", "Étapes numérotées"], ["liste-titree", "Liste « Titre : texte »"], ["encadre", "Encadré de mise en avant"],
    ["vigilance", "Encadré de vigilance (jaune)"], ["citation", "Citation"], ["en-ligne", "Ligne « Titre : valeur »"],
    ["etiquettes", "Étiquettes (mots-clés)"], ["message", "Message d'information fixe"]
  ];
  var TRIS = [["alterne", "Mélange (alterne les sections)"], ["section", "Par ordre des sections, puis plus récentes"], ["recent", "Plus récentes d'abord"], ["alpha", "Ordre alphabétique"]];

  /* ---------- Utilitaires ---------- */

  function $(s) { return document.querySelector(s); }
  function esc(s) {
    return String(s === null || s === undefined ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  function enLignes(t) {
    var cles = Object.keys(t);
    return (t.id || []).map(function (_, i) { var o = {}; cles.forEach(function (k) { o[k] = t[k][i]; }); return o; });
  }
  function P(chemin) { return esc(JSON.stringify(chemin)); }
  function lire(chemin) { return chemin.reduce(function (o, k) { return o === undefined || o === null ? undefined : o[k]; }, E.config); }
  function ecrire(chemin, valeur) {
    var o = E.config;
    for (var i = 0; i < chemin.length - 1; i++) {
      if (o[chemin[i]] === undefined || o[chemin[i]] === null || typeof o[chemin[i]] !== "object") { o[chemin[i]] = typeof chemin[i + 1] === "number" ? [] : {}; }
      o = o[chemin[i]];
    }
    if (valeur === undefined) { delete o[chemin[chemin.length - 1]]; } else { o[chemin[chemin.length - 1]] = valeur; }
  }
  var nId = 0;
  function id() { return "c" + (++nId); }

  function message(type, texte) {
    var z = $("#message");
    if (!texte) { z.innerHTML = ""; return; }
    z.innerHTML = "<div class=\"fr-alert fr-alert--" + type + " fr-alert--sm\"><p>" + esc(texte) + "</p></div>";
    if (type === "success") { setTimeout(function () { if (z.textContent.indexOf(texte) >= 0) { z.innerHTML = ""; } }, 4000); }
  }
  function modifie(v) {
    E.modifie = v !== false;
    var e = $("#etat");
    e.className = "fr-badge fr-badge--sm " + (E.modifie ? "fr-badge--warning" : "fr-badge--success");
    e.textContent = E.modifie ? "Non enregistré" : "Enregistré";
  }
  function valeursDe(colonne) {
    var vus = {}, out = [];
    E.lignes.forEach(function (r) {
      var v = r[colonne];
      var sep = (E.config && E.config.separateurs || {})[colonne];
      if (sep && typeof v === "string") { v = ["L"].concat(v.split(sep).map(function (x) { return x.trim(); }).filter(Boolean)); }
      var l = Array.isArray(v) ? (v[0] === "L" ? v.slice(1) : v) : (v === true ? ["true"] : (v === null || v === undefined || v === "" || v === false ? [] : [v]));
      l.forEach(function (x) { x = String(x); if (!vus[x]) { vus[x] = 1; out.push(x); } });
    });
    return out.sort(function (a, b) { return a.localeCompare(b, "fr", { numeric: true }); }).slice(0, 80);
  }

  /* ---------- Champs ---------- */

  function aide(t) { return t ? "<span class=\"fr-hint-text\">" + esc(t) + "</span>" : ""; }
  function texte(ch, lib, o) {
    o = o || {}; var i = id(); var v = lire(ch);
    var ctrl = o.multiligne ?
      "<textarea class=\"fr-input\" id=\"" + i + "\" rows=\"" + (o.lignes || 3) + "\" data-c=\"" + P(ch) + "\">" + esc(v) + "</textarea>" :
      "<input class=\"fr-input\" id=\"" + i + "\" type=\"" + (o.nombre ? "number" : "text") + "\" data-c=\"" + P(ch) + "\"" + (o.nombre ? " data-t=\"nombre\"" : "") + " value=\"" + esc(v) + "\">";
    return "<div class=\"fr-input-group\"><label class=\"fr-label\" for=\"" + i + "\">" + esc(lib) + aide(o.aide) + "</label>" + ctrl + "</div>";
  }
  function caseC(ch, lib, a) {
    var i = id();
    return "<div class=\"fr-checkbox-group fr-mb-2w\"><input type=\"checkbox\" id=\"" + i + "\" data-c=\"" + P(ch) + "\" data-t=\"case\" data-r=\"1\"" + (lire(ch) ? " checked" : "") + ">" +
      "<label class=\"fr-label\" for=\"" + i + "\">" + esc(lib) + aide(a) + "</label></div>";
  }
  function choix(ch, lib, options, o) {
    o = o || {}; var i = id(); var v = lire(ch);
    if (v === undefined || v === null) { v = ""; }
    return "<div class=\"fr-select-group\"><label class=\"fr-label\" for=\"" + i + "\">" + esc(lib) + aide(o.aide) + "</label>" +
      "<select class=\"fr-select\" id=\"" + i + "\" data-c=\"" + P(ch) + "\" data-r=\"1\">" +
      options.map(function (x) { return "<option value=\"" + esc(x[0]) + "\"" + (String(x[0]) === String(v) ? " selected" : "") + ">" + esc(x[1]) + "</option>"; }).join("") + "</select></div>";
  }
  function colonne(ch, lib, o) {
    o = o || {};
    var opts = [["", o.vide || "— Aucune —"]].concat(E.colonnes.filter(function (c) {
      return !o.types || o.types.some(function (t) { return c.type.indexOf(t) === 0; });
    }).map(function (c) { return [c.colId, c.label + (c.label !== c.colId ? " (" + c.colId + ")" : "")]; }));
    return choix(ch, lib, opts, o);
  }
  function couleur(ch, lib) {
    var i = id(), v = lire(ch);
    return "<div class=\"fr-input-group ce-couleur\"><label class=\"fr-label\" for=\"" + i + "\">" + esc(lib) + "</label>" +
      "<div class=\"pe-couleur\"><input type=\"color\" id=\"" + i + "\" data-c=\"" + P(ch) + "\" data-r=\"1\" value=\"" + esc(v || "#000091") + "\">" +
      (v ? "<span class=\"fr-text--sm\">" + esc(v) + "</span><button type=\"button\" class=\"fr-btn fr-btn--sm fr-btn--tertiary-no-outline\" data-effacer=\"" + P(ch) + "\">Par défaut</button>" : "<span class=\"fr-text--sm\">Par défaut</span>") +
      "</div></div>";
  }
  function cocheValeurs(ch, lib, valeurs, a, libelles) {
    var sel = lire(ch) || [];
    if (!valeurs.length) { return "<p class=\"fr-text--sm\">" + esc(lib) + " : aucune valeur dans la table.</p>"; }
    return "<fieldset class=\"fr-fieldset\"><legend class=\"fr-fieldset__legend fr-fieldset__legend--regular\">" + esc(lib) + aide(a) + "</legend>" +
      "<div class=\"ce-cases\">" + valeurs.map(function (v) {
        var i = id();
        return "<div class=\"fr-checkbox-group fr-checkbox-group--sm\"><input type=\"checkbox\" id=\"" + i + "\" data-cv=\"" + P(ch) + "\" data-v=\"" + esc(v) + "\"" + (sel.indexOf(v) >= 0 ? " checked" : "") + ">" +
          "<label class=\"fr-label\" for=\"" + i + "\">" + esc((libelles && libelles[v]) || (v === "true" ? "Oui (case cochée)" : v)) + "</label></div>";
      }).join("") + "</div></fieldset>";
  }
  function liste(ch, titre, rendreItem, modele, ajout) {
    var items = lire(ch) || [];
    var h = "<div class=\"ce-liste\"><h3 class=\"fr-h6\">" + esc(titre) + "</h3>";
    items.forEach(function (_, i) {
      h += "<div class=\"pe-ligne\">" + rendreItem(ch.concat([i]), i) +
        "<ul class=\"fr-btns-group fr-btns-group--inline fr-btns-group--sm\">" +
        (i > 0 ? "<li><button type=\"button\" class=\"fr-btn fr-btn--tertiary\" data-l=\"" + P(ch) + "\" data-i=\"" + i + "\" data-a=\"monter\">Monter</button></li>" : "") +
        "<li><button type=\"button\" class=\"fr-btn fr-btn--tertiary\" data-l=\"" + P(ch) + "\" data-i=\"" + i + "\" data-a=\"supprimer\">Supprimer</button></li></ul></div>";
    });
    h += "<button type=\"button\" class=\"fr-btn fr-btn--sm fr-btn--secondary\" data-l=\"" + P(ch) + "\" data-a=\"ajouter\" data-modele=\"" + esc(JSON.stringify(modele)) + "\">" + esc(ajout) + "</button></div>";
    return h;
  }
  function condition(ch) {
    var c = lire(ch) || {};
    var h = "<details class=\"ce-condition\"" + (c.colonne ? " open" : "") + "><summary class=\"fr-text--sm\">Afficher seulement si… " + (c.colonne ? "(condition active)" : "") + "</summary>";
    h += colonne(ch.concat(["colonne"]), "Colonne testée", { vide: "— Toujours afficher —" });
    if (c.colonne) {
      if (!c.mode) { c.mode = c.vide === true ? "vide" : c.vide === false ? "rempli" : c.exclure ? "exclure" : "valeurs"; ecrire(ch, c); }
      h += choix(ch.concat(["mode"]), "Condition", [["valeurs", "a l'une des valeurs cochées"], ["exclure", "n'a aucune des valeurs cochées"], ["vide", "est vide"], ["rempli", "est remplie"]]);
      var mode = c.mode;
      if (mode === "valeurs" || mode === "exclure") { h += cocheValeurs(ch.concat(["valeurs"]), "Valeurs", valeursDe(c.colonne)); }
    }
    return h + "</details>";
  }
  // Normalise la condition saisie (mode -> vide / exclure).
  function normaliserConditions(o) {
    if (!o || typeof o !== "object") { return; }
    Object.keys(o).forEach(function (k) {
      var v = o[k];
      if ((k === "condition") && v && typeof v === "object") {
        if (!v.colonne) { delete o[k]; return; }
        if (v.mode) {
          delete v.vide; delete v.exclure;
          if (v.mode === "vide") { v.vide = true; }
          if (v.mode === "rempli") { v.vide = false; }
          if (v.mode === "exclure") { v.exclure = true; }
        }
      } else if (v && typeof v === "object") { normaliserConditions(v); }
    });
  }

  /* ---------- Vues ---------- */

  function vuePage() {
    var z = document.createElement("div");
    z.className = "ed-panneau ed-textes";
    $("#vue").innerHTML = "";
    $("#vue").appendChild(z);
    E.config.page = E.config.page || {};
    window.PageEditeur.monter(z, E.config.page, function () { modifie(true); });
  }

  function htmlSections() {
    var s = E.config.sections = E.config.sections || {};
    var h = "<h2 class=\"fr-h5 ed-section-titre\">Sections</h2><p class=\"fr-text--sm\">Les sections découpent le catalogue (par exemple par type). Elles s'affichent en boutons au-dessus de la recherche.</p>";
    h += colonne(["sections", "colonne"], "Colonne des sections");
    if (!s.colonne) { return h; }
    h += choix(["sections", "affichage"], "Apparence", [["boutons", "Boutons avec le nombre de fiches"], ["etiquettes", "Étiquettes"]]);
    h += texte(["sections", "libelleTout"], "Libellé du bouton « tout »", { aide: "Par exemple « Tout »." });
    h += texte(["sections", "aide"], "Texte d'aide sous les sections (facultatif)");
    var vals = valeursDe(s.colonne);
    var ordre = (s.ordre || []).filter(function (v) { return vals.indexOf(v) >= 0; });
    vals.forEach(function (v) { if (ordre.indexOf(v) < 0) { ordre.push(v); } });
    var incl = s.valeurs && s.valeurs.length ? s.valeurs : null;
    h += "<table class=\"ce-table\"><caption class=\"fr-text--sm\">Ordre, libellé affiché et sections retenues</caption><thead><tr><th scope=\"col\">Valeur</th><th scope=\"col\">Libellé affiché</th><th scope=\"col\">Afficher</th><th scope=\"col\">Ordre</th></tr></thead><tbody>";
    ordre.forEach(function (v, i) {
      var idL = id(), idC = id();
      h += "<tr><td>" + esc(v) + "</td><td><label class=\"fr-sr-only\" for=\"" + idL + "\">Libellé de " + esc(v) + "</label><input class=\"fr-input\" id=\"" + idL + "\" data-c=\"" + P(["sections", "libelles", v]) + "\" value=\"" + esc((s.libelles || {})[v] || "") + "\" placeholder=\"" + esc(v) + "\"></td>" +
        "<td><div class=\"fr-checkbox-group fr-checkbox-group--sm\"><input type=\"checkbox\" id=\"" + idC + "\" data-section-incl=\"" + esc(v) + "\"" + (!incl || incl.indexOf(v) >= 0 ? " checked" : "") + "><label class=\"fr-label\" for=\"" + idC + "\"><span class=\"fr-sr-only\">Afficher " + esc(v) + "</span></label></div></td>" +
        "<td>" + (i > 0 ? "<button type=\"button\" class=\"fr-btn fr-btn--sm fr-btn--tertiary-no-outline\" data-section-monter=\"" + i + "\">Monter</button>" : "") + "</td></tr>";
    });
    h += "</tbody></table>";
    E._ordreSections = ordre;
    return h;
  }

  function vueListe() {
    var c = E.config;
    var h = "<div class=\"ed-panneau ed-textes\">";
    h += "<h2 class=\"fr-h5\">Présentation</h2>";
    h += texte(["titre"], "Titre du catalogue");
    h += texte(["introduction"], "Texte d'introduction (facultatif)", { multiligne: true, aide: "**gras** et [lien](https://…) acceptés." });
    h += "<div class=\"ce-ligne3\">" + texte(["elements", "singulier"], "Nom d'une fiche", { aide: "Ex. : ressource" }) +
      texte(["elements", "pluriel"], "Au pluriel", { aide: "Ex. : ressources" }) +
      choix(["elements", "feminin"], "Genre", [["true", "Féminin (une, aucune)"], ["false", "Masculin (un, aucun)"]]) + "</div>";

    h += "<h2 class=\"fr-h5 ed-section-titre\">Colonnes utilisées</h2><p class=\"fr-text--sm\">Indiquez quelle colonne de la table joue chaque rôle.</p>";
    h += colonne(["colonnes", "titre"], "Titre de la fiche", { vide: "— Choisir —" });
    h += colonne(["colonnes", "resume"], "Résumé (texte court sur la carte et en tête de fiche)");
    h += colonne(["colonnes", "description"], "Description (si pas de résumé)");
    h += colonne(["colonnes", "image"], "Vignette (pièce jointe image)", { types: ["Attachments"] });
    h += colonne(["colonnes", "cadrage"], "Cadrage de la vignette (facultatif)", { aide: "Valeurs reconnues : Remplir, Remplir (haut), Zoom. Vide : image entière." });
    h += colonne(["colonnes", "fichiers"], "Fichiers à télécharger", { types: ["Attachments"] });
    h += colonne(["colonnes", "lien"], "Lien externe");
    h += colonne(["colonnes", "date"], "Date (tri « plus récentes », badge « Nouveau »)", { types: ["Date", "DateTime"] });
    h += colonne(["colonnes", "publie"], "Case « publiée » (seules les fiches cochées s'affichent)", { types: ["Bool"] });
    h += colonne(["colonnes", "aLaUne"], "Case « à la une » (mise en avant)", { types: ["Bool"] });

    h += htmlSections();

    h += "<h2 class=\"fr-h5 ed-section-titre\">Entrées thématiques</h2><p class=\"fr-text--sm\">Des raccourcis (« Je veux… ») qui regroupent plusieurs valeurs d'une colonne.</p>";
    h += texte(["entrees", "titre"], "Intitulé", { aide: "Ex. : Je veux…" });
    h += colonne(["entrees", "colonne"], "Colonne utilisée");
    if (c.entrees && c.entrees.colonne) {
      var vE = valeursDe(c.entrees.colonne);
      h += liste(["entrees", "liste"], "Entrées", function (ch) {
        return texte(ch.concat(["libelle"]), "Libellé") + cocheValeurs(ch.concat(["valeurs"]), "Valeurs regroupées", vE);
      }, { libelle: "", valeurs: [] }, "Ajouter une entrée");
    }

    h += "<h2 class=\"fr-h5 ed-section-titre\">Filtres</h2>";
    h += liste(["filtres"], "Filtres", function (ch) {
      var f = lire(ch);
      return colonne(ch.concat(["colonne"]), "Colonne") + texte(ch.concat(["libelle"]), "Libellé") +
        texte(ch.concat(["libelleTous"]), "Libellé du choix « tous »", { aide: "Par défaut : Tous" }) +
        caseC(ch.concat(["multiple"]), "Choix multiples (les fiches doivent avoir toutes les valeurs cochées)") +
        caseC(ch.concat(["dansSection"]), "Afficher seulement quand une section est choisie") +
        caseC(ch.concat(["decroissant"]), "Ordre décroissant (ex. : années)") +
        (f.colonne ? texte(["separateurs", f.colonne], "Séparateur dans les cellules de texte (facultatif)", { aide: "Si une cellule contient plusieurs valeurs, par exemple « 2025-2026 / 2026-2027 », indiquez « / »." }) : "") +
        (f.colonne ? "<details><summary class=\"fr-text--sm\">Libellés affichés</summary>" + valeursDe(f.colonne).map(function (v) {
          return texte(ch.concat(["libelles", v]), v);
        }).join("") + "</details>" : "");
    }, { colonne: "", libelle: "" }, "Ajouter un filtre");

    h += "<h2 class=\"fr-h5 ed-section-titre\">Étiquettes de couleur</h2><p class=\"fr-text--sm\">Les étiquettes affichent la valeur d'une colonne sur les cartes et les fiches (statut, type…).</p>";
    h += liste(["etiquettes"], "Étiquettes", function (ch) {
      var e = lire(ch);
      var bool = e.colonne && String(E.types[e.colonne] || "").indexOf("Bool") === 0;
      var hh = colonne(ch.concat(["colonne"]), "Colonne") +
        "<div class=\"ce-ligne3\">" + couleur(ch.concat(["fond"]), "Couleur de fond") + couleur(ch.concat(["texte"]), "Couleur du texte") + "</div>";
      if (!e.colonne) { return hh; }
      if (bool) { hh += texte(ch.concat(["libelleVrai"]), "Texte de l'étiquette quand la case est cochée"); }
      var vals = valeursDe(e.colonne);
      hh += cocheValeurs(ch.concat(["valeurs"]), "N'afficher que ces valeurs", vals, "Aucune case cochée : toutes les valeurs s'affichent.");
      if (!bool) {
        hh += "<details><summary class=\"fr-text--sm\">Couleur et libellé par valeur</summary>" + vals.map(function (v) {
          return "<div class=\"ce-ligne3\"><p class=\"fr-text--sm fr-text--bold\">" + esc(v) + "</p>" + couleur(ch.concat(["couleurs", v, "fond"]), "Fond") + couleur(ch.concat(["couleurs", v, "texte"]), "Texte") + "</div>" +
            texte(ch.concat(["libelles", v]), "Libellé affiché pour « " + v + " »");
        }).join("") + "</details>";
      }
      hh += caseC(ch.concat(["seulementSiUnique"]), "Seulement si la fiche n'a qu'une valeur");
      hh += choix(ch.concat(["carte"]), "Sur les cartes", [["", "Oui"], ["false", "Non"]]) + choix(ch.concat(["fiche"]), "Sur les fiches", [["", "Oui"], ["false", "Non"]]);
      return hh;
    }, { colonne: "" }, "Ajouter une étiquette");
    h += texte(["nouveau", "jours"], "Étiquette « Nouveau » pendant (jours)", { nombre: true, aide: "0 : désactivée. Nécessite la colonne Date." });

    h += "<h2 class=\"fr-h5 ed-section-titre\">Cartes, recherche et tri</h2>";
    h += liste(["carte", "details"], "Informations sous le titre des cartes", function (ch) {
      return texte(ch, "Colonne(s)", { aide: "Nom de colonne. « date|annee » : la première non vide." });
    }, "", "Ajouter une information");
    h += cocheValeurs(["recherche", "colonnes"], "Colonnes parcourues par la recherche", E.colonnes.map(function (x) { return x.colId; }), "Aucune case : titre, résumé, description et section.");
    h += liste(["tris"], "Tris proposés (le premier est le tri par défaut)", function (ch) {
      return choix(ch.concat(["mode"]), "Tri", TRIS) + texte(ch.concat(["libelle"]), "Libellé");
    }, { mode: "alpha", libelle: "Ordre alphabétique" }, "Ajouter un tri");
    h += "</div>";
    $("#vue").innerHTML = h;
  }

  function vueFiche() {
    var h = "<div class=\"ed-panneau ed-textes\">";
    h += "<h2 class=\"fr-h5\">Fiche détaillée</h2>";
    h += texte(["fiche", "lienRetour"], "Lien de retour", { aide: "Ex. : Retour au catalogue" });
    h += texte(["fiche", "titreFichiers"], "Titre de la zone des fichiers");
    h += texte(["fiche", "libelleLien"], "Libellé du bouton de lien externe");
    h += colonne(["fiche", "galerie"], "Galerie d'images (carrousel)", { types: ["Attachments"], aide: "Remplace la vignette sur la fiche." });
    h += "<h3 class=\"fr-h6 ed-section-titre\">Aperçu du document PDF</h3>";
    h += caseC(["fiche", "apercuPdf", "actif"], "Afficher un aperçu du premier fichier PDF (recto et verso)");
    if (lire(["fiche", "apercuPdf", "actif"])) { h += condition(["fiche", "apercuPdf", "condition"]); }
    h += liste(["fiche", "infos"], "Informations clés (sous le résumé)", function (ch) {
      return texte(ch.concat(["colonne"]), "Colonne(s)", { aide: "Nom de colonne. « date|annee » : la première non vide." }) + texte(ch.concat(["libelle"]), "Libellé");
    }, { colonne: "", libelle: "" }, "Ajouter une information");
    h += liste(["fiche", "blocs"], "Blocs de contenu (dans l'ordre d'affichage)", function (ch) {
      var b = lire(ch);
      var hh = choix(ch.concat(["format"]), "Présentation", FORMATS);
      if (b.format === "message") {
        hh += texte(ch.concat(["texte"]), "Texte du message", { multiligne: true });
      } else {
        hh += colonne(ch.concat(["colonne"]), "Colonne") + texte(ch.concat(["titre"]), "Titre du bloc");
      }
      if (b.format === "vigilance") { hh += texte(ch.concat(["titrePluriel"]), "Titre si plusieurs lignes"); }
      if (b.format === "liste") { hh += choix(ch.concat(["separateur"]), "Séparateur", [["", "Une ligne par élément"], [";", "Point-virgule"]]); }
      return hh + condition(ch.concat(["condition"]));
    }, { format: "texte", colonne: "", titre: "" }, "Ajouter un bloc");
    h += "</div>";
    $("#vue").innerHTML = h;
  }

  function vueApercu() {
    $("#vue").innerHTML = "<div class=\"fr-notice fr-notice--info fr-mb-2w\"><div class=\"fr-container\"><div class=\"fr-notice__body\">" +
      "<p class=\"fr-notice__title\">Aperçu avec les réglages en cours (même non enregistrés). Les fiches non publiées sont masquées.</p></div></div></div>" +
      "<div class=\"ce-apercu\"><div id=\"ap-entete\"></div><main class=\"fr-container fr-py-4w\" id=\"ap-contenu\"></main><div id=\"ap-pied\"></div></div>";
    if (E.apercu) { E.apercu.detruire(); }
    window.PageDSFR.appliquer(E.config.page, { entete: $("#ap-entete"), pied: $("#ap-pied") });
    E.apercu = K.monter($("#ap-contenu"), { config: E.config, lignes: E.lignes, types: E.types, source: E.source, titrePage: false, base: "" });
  }

  function lienPublic() {
    if (!E.base) { return null; }
    var u = new URL("index.html", location.href);
    return u.href + "?grist=" + encodeURIComponent(E.base.replace("/api/docs/", "/")) + "&table=" + encodeURIComponent(E.tableId);
  }

  function vuePublication() {
    var lien = lienPublic();
    var h = "<div class=\"ed-panneau ed-textes\">";
    h += "<h2 class=\"fr-h5\">1. Rendre le document lisible publiquement</h2>" +
      "<ol class=\"fr-text--sm\"><li>Dans Grist : <strong>Partager</strong> › accès public <strong>Lecteur</strong>.</li>" +
      "<li>Dans <strong>Permissions avancées</strong>, réservez la lecture des visiteurs aux fiches publiées, par exemple : règle <code>rec." + esc(lire(["colonnes", "publie"]) || "valide") + "</code> → Lecture, puis Lecture refusée pour tous les autres.</li>" +
      "<li>Masquez aux visiteurs les colonnes internes (notes, contacts…).</li></ol>";
    h += "<button type=\"button\" class=\"fr-btn fr-btn--secondary\" data-action=\"verifier\">Vérifier l'accès public</button><div id=\"verif\" class=\"fr-mt-2w\" aria-live=\"polite\"></div>";
    h += "<h2 class=\"fr-h5 ed-section-titre\">2. Lien à diffuser</h2>";
    if (lien) {
      h += "<div class=\"fr-input-group\"><label class=\"fr-label\" for=\"lien-public\">Page publique du catalogue</label><input class=\"fr-input ed-code\" id=\"lien-public\" readonly value=\"" + esc(lien) + "\"></div>" +
        "<ul class=\"fr-btns-group fr-btns-group--inline fr-btns-group--sm\"><li><button type=\"button\" class=\"fr-btn fr-btn--secondary\" data-action=\"copier\" data-cible=\"lien-public\">Copier le lien</button></li>" +
        "<li><a class=\"fr-btn fr-btn--tertiary\" href=\"" + esc(lien) + "\" target=\"_blank\" rel=\"noopener\" title=\"Ouvrir le catalogue - nouvelle fenêtre\">Ouvrir le catalogue</a></li></ul>" +
        "<div class=\"fr-input-group\"><label class=\"fr-label\" for=\"code-integration\">Code d'intégration (iframe, sans en-tête ni pied de page)</label>" +
        "<textarea class=\"fr-input ed-code\" readonly rows=\"3\" id=\"code-integration\">" + esc("<iframe src=\"" + lien + "&integre=1\" title=\"" + (E.config.titre || "Catalogue") + "\" style=\"width:100%;height:1200px;border:0\"></iframe>") + "</textarea></div>";
    }
    h += "<h2 class=\"fr-h5 ed-section-titre\">Réglages (JSON)</h2><p class=\"fr-text--sm\">Pour réutiliser ces réglages dans un autre document. Ils ne contiennent aucune fiche.</p>" +
      "<div class=\"fr-input-group\"><label class=\"fr-label\" for=\"config-json\">Réglages</label><textarea class=\"fr-input ed-code\" rows=\"8\" id=\"config-json\">" + esc(JSON.stringify(E.config, null, 2)) + "</textarea></div>" +
      "<ul class=\"fr-btns-group fr-btns-group--inline fr-btns-group--sm\"><li><button type=\"button\" class=\"fr-btn fr-btn--secondary\" data-action=\"copier\" data-cible=\"config-json\">Copier</button></li>" +
      "<li><button type=\"button\" class=\"fr-btn fr-btn--tertiary\" data-action=\"importer\">Remplacer par le texte ci-dessus</button></li></ul>";
    h += "</div>";
    $("#vue").innerHTML = h;
  }

  async function verifier() {
    var z = $("#verif");
    z.innerHTML = "<p class=\"fr-text--sm\">Vérification…</p>";
    try {
      var r = await fetch(E.base + "/tables/" + encodeURIComponent(E.tableId) + "/columns", { credentials: "omit" });
      if (!r.ok) { throw new Error("Le document n'est pas lisible publiquement (erreur " + r.status + "). Partagez-le en lecture publique."); }
      var cols = (await r.json()).columns;
      var conf = cols.find(function (c) { return c.id === K.NOM_COLONNE_CONFIG; });
      if (!conf || !conf.fields.description) { throw new Error("Les réglages ne sont pas lisibles publiquement : enregistrez-les, puis vérifiez que la colonne " + K.NOM_COLONNE_CONFIG + " n'est pas masquée aux visiteurs."); }
      var recs = await fetch(E.base + "/tables/" + encodeURIComponent(E.tableId) + "/records", { credentials: "omit" }).then(function (x) { return x.json(); });
      var pub = lire(["colonnes", "publie"]);
      var nonPubliees = pub ? recs.records.filter(function (x) { return x.fields[pub] !== true; }).length : 0;
      z.innerHTML = "<div class=\"fr-alert fr-alert--" + (nonPubliees ? "warning" : "success") + " fr-alert--sm\"><p>Document lisible publiquement : " + recs.records.length + " fiche(s) visibles par les visiteurs, " + cols.length + " colonne(s)." +
        (nonPubliees ? " Attention : " + nonPubliees + " fiche(s) non publiée(s) sont lisibles par les visiteurs (masquées par la page, mais accessibles par l'API). Ajoutez une règle d'accès." : "") + "</p></div>";
    } catch (e) {
      z.innerHTML = "<div class=\"fr-alert fr-alert--error fr-alert--sm\"><p>" + esc(e.message) + "</p></div>";
    }
  }

  function afficher() {
    var y = window.scrollY;
    if (E.vue !== "apercu" && E.apercu) { E.apercu.detruire(); E.apercu = null; }
    if (E.vue === "page") { vuePage(); }
    else if (E.vue === "liste") { vueListe(); }
    else if (E.vue === "fiche") { vueFiche(); }
    else if (E.vue === "apercu") { vueApercu(); }
    else { vuePublication(); }
    window.scrollTo(0, y);
  }

  /* ---------- Enregistrement ---------- */

  async function enregistrer() {
    var b = $("#enregistrer");
    b.disabled = true;
    try {
      normaliserConditions(E.config);
      E.config.version = 1;
      E.config.majLe = new Date().toISOString();
      E.config.publication = { lienPublic: lienPublic() };
      var actions = [];
      if (!E.colConfig) { actions.push(["AddColumn", E.tableId, K.NOM_COLONNE_CONFIG, { type: "Text", label: K.NOM_COLONNE_CONFIG }]); }
      actions.push(["ModifyColumn", E.tableId, K.NOM_COLONNE_CONFIG, { description: JSON.stringify(E.config) }]);
      await grist.docApi.applyUserActions(actions);
      E.colConfig = true;
      modifie(false);
      message("success", "Réglages enregistrés.");
    } catch (e) {
      message("error", "Échec de l'enregistrement : " + (e.message || e));
    } finally { b.disabled = false; }
  }

  /* ---------- Événements ---------- */

  function convertir(el) {
    var t = el.getAttribute("data-t");
    if (t === "case") { return el.checked || undefined; }
    if (t === "nombre") { return el.value === "" ? undefined : Number(el.value); }
    if (el.tagName === "SELECT" && (el.value === "true" || el.value === "false")) { return el.value === "true"; }
    return el.value === "" ? undefined : el.value;
  }

  function surSaisie(ev, finale) {
    var t = ev.target;
    if (t.name === "onglet") { if (finale) { E.vue = t.value; afficher(); } return; }
    if (t.closest(".pe-ligne, .pe-image") && !t.hasAttribute("data-c") && !t.hasAttribute("data-cv")) { return; }
    if (t.hasAttribute("data-c")) {
      ecrire(JSON.parse(t.getAttribute("data-c")), convertir(t));
      modifie(true);
      if (finale && t.hasAttribute("data-r")) { afficher(); }
      return;
    }
    if (t.hasAttribute("data-cv") && finale) {
      var ch = JSON.parse(t.getAttribute("data-cv"));
      var l = (lire(ch) || []).slice();
      var v = t.getAttribute("data-v");
      if (t.checked && l.indexOf(v) < 0) { l.push(v); }
      if (!t.checked) { l = l.filter(function (x) { return x !== v; }); }
      ecrire(ch, l.length ? l : undefined);
      modifie(true);
      return;
    }
    if (t.hasAttribute("data-section-incl") && finale) {
      var s = E.config.sections;
      var incl = s.valeurs && s.valeurs.length ? s.valeurs.slice() : E._ordreSections.slice();
      var val = t.getAttribute("data-section-incl");
      incl = t.checked ? incl.concat(incl.indexOf(val) < 0 ? [val] : []) : incl.filter(function (x) { return x !== val; });
      s.valeurs = incl.length === E._ordreSections.length ? undefined : incl;
      if (!s.valeurs) { delete s.valeurs; }
      modifie(true);
    }
  }

  document.addEventListener("input", function (ev) { surSaisie(ev, false); });
  document.addEventListener("change", function (ev) { surSaisie(ev, true); });
  document.addEventListener("click", function (ev) {
    var b = ev.target.closest("button");
    if (!b) { return; }
    if (b.id === "enregistrer") { enregistrer(); return; }
    if (b.hasAttribute("data-l")) {
      var ch = JSON.parse(b.getAttribute("data-l"));
      var l = (lire(ch) || []).slice();
      var i = Number(b.getAttribute("data-i"));
      var a = b.getAttribute("data-a");
      if (a === "ajouter") { l.push(JSON.parse(b.getAttribute("data-modele"))); }
      if (a === "supprimer") { l.splice(i, 1); }
      if (a === "monter") { l.splice(i - 1, 0, l.splice(i, 1)[0]); }
      ecrire(ch, l);
      modifie(true);
      afficher();
      return;
    }
    if (b.hasAttribute("data-effacer")) { ecrire(JSON.parse(b.getAttribute("data-effacer")), undefined); modifie(true); afficher(); return; }
    if (b.hasAttribute("data-section-monter")) {
      var k = Number(b.getAttribute("data-section-monter"));
      var o = E._ordreSections.slice();
      o.splice(k - 1, 0, o.splice(k, 1)[0]);
      E.config.sections.ordre = o;
      modifie(true); afficher(); return;
    }
    var act = b.getAttribute("data-action");
    if (act === "verifier") { verifier(); }
    if (act === "copier") {
      var champ = document.getElementById(b.getAttribute("data-cible"));
      champ.select();
      (navigator.clipboard ? navigator.clipboard.writeText(champ.value) : Promise.reject()).then(function () { message("success", "Copié."); }, function () { document.execCommand("copy"); message("success", "Copié."); });
    }
    if (act === "importer") {
      try {
        var c = JSON.parse($("#config-json").value);
        if (typeof c !== "object" || !c) { throw new Error("objet attendu"); }
        E.config = K.completer(c);
        E.config.page = c.page || {};
        modifie(true);
        message("success", "Réglages importés. Vérifiez puis enregistrez.");
        afficher();
      } catch (e) { message("error", "Texte invalide : " + e.message); }
    }
  });
  window.addEventListener("beforeunload", function (ev) { if (E.modifie) { ev.preventDefault(); ev.returnValue = ""; } });

  /* ---------- Démarrage ---------- */

  function configParDefaut() {
    var texteCols = E.colonnes.filter(function (c) { return c.type === "Text"; });
    var bool = E.colonnes.find(function (c) { return c.type === "Bool" && /valid|publi/i.test(c.colId); });
    return {
      version: 1,
      page: { marque: "République\nfrançaise", titre: E.tableId, sousTitre: "", boutons: [], pied: { accessibilite: "non conforme" } },
      titre: E.tableId,
      colonnes: { titre: texteCols[0] ? texteCols[0].colId : "", publie: bool ? bool.colId : undefined },
      tris: [{ mode: "alpha", libelle: "Ordre alphabétique" }],
      fiche: { blocs: texteCols.slice(1, 4).map(function (c) { return { colonne: c.colId, titre: c.label, format: "texte" }; }) }
    };
  }

  async function demarrer() {
    E.source = K.sourceWidget();
    var d = await E.source.charger();
    E.tableId = d.tableId;
    E.lignes = d.lignes;
    E.types = d.types;
    var tables = enLignes(await grist.docApi.fetchTable("_grist_Tables"));
    var ref = (tables.find(function (t) { return t.tableId === E.tableId; }) || {}).id;
    var cols = enLignes(await grist.docApi.fetchTable("_grist_Tables_column")).filter(function (c) { return c.parentId === ref; });
    E.colConfig = cols.some(function (c) { return c.colId === K.NOM_COLONNE_CONFIG; });
    E.colonnes = cols.filter(function (c) { return c.colId !== K.NOM_COLONNE_CONFIG && c.colId !== "manualSort" && c.colId.indexOf("gristHelper_") !== 0; })
      .map(function (c) { return { colId: c.colId, label: c.label || c.colId, type: c.type }; });
    var tok = await grist.docApi.getAccessToken({ readOnly: true });
    E.base = tok.baseUrl;
    E.config = d.config ? K.completer(d.config) : K.completer(configParDefaut());
    E.config.page = (d.config && d.config.page) || E.config.page || {};
    modifie(!d.config);
    if (!d.config) {
      message("info", "Aucun réglage enregistré : un catalogue a été préparé à partir des colonnes de la table « " + E.tableId + " ». Ajustez-le puis enregistrez.");
      if (!E.lignes.length) { proposerExemple(); }
    }
    afficher();
  }

  /* ---------- Démarrage avec l'exemple ---------- */

  // Sur une table vide et sans réglages, l'éditeur propose un catalogue d'exemple complet :
  // colonnes, fiches fictives et réglages. Tout se supprime ensuite comme n'importe quelle donnée.
  function proposerExemple() {
    $("#message").insertAdjacentHTML("beforeend", "<p class=\"fr-mt-1w\"><button type=\"button\" class=\"fr-btn fr-btn--sm fr-btn--secondary\" id=\"ed-exemple\">" +
      "Créer un catalogue d'exemple (colonnes, fiches fictives et réglages)</button></p>");
    $("#ed-exemple").addEventListener("click", function () {
      this.disabled = true;
      chargerExemple().catch(function (e) { message("error", "Création de l'exemple impossible : seuls les propriétaires du document peuvent ajouter des colonnes. (" + (e.message || e) + ")"); });
    });
  }

  async function chargerExemple() {
    var ex = await fetch("exemples/demo.json").then(function (r) { return r.json(); });
    var existantes = {};
    E.colonnes.forEach(function (c) { existantes[c.colId] = true; });
    var actions = [];
    Object.keys(ex.types).forEach(function (c) {
      if (existantes[c]) { return; }
      var info = { type: ex.types[c] };
      if (/^Choice/.test(ex.types[c])) {
        var vals = {};
        ex.lignes.forEach(function (l) { var v = l[c]; (Array.isArray(v) ? v.slice(v[0] === "L" ? 1 : 0) : [v]).forEach(function (x) { if (x) { vals[x] = true; } }); });
        info.widgetOptions = JSON.stringify({ choices: Object.keys(vals) });
      }
      actions.push(["AddColumn", E.tableId, c, info]);
    });
    var cols = {};
    Object.keys(ex.types).forEach(function (c) {
      cols[c] = ex.lignes.map(function (l) {
        var v = l[c] === undefined ? null : l[c];
        if (ex.types[c] === "ChoiceList" && Array.isArray(v) && v[0] !== "L") { v = ["L"].concat(v); }
        if (ex.types[c] === "Date" && typeof v === "string") { v = Date.parse(v) / 1000; }
        return v;
      });
    });
    actions.push(["BulkAddRecord", E.tableId, ex.lignes.map(function () { return null; }), cols]);
    if (!E.colConfig) { actions.push(["AddColumn", E.tableId, K.NOM_COLONNE_CONFIG, { type: "Text", label: K.NOM_COLONNE_CONFIG }]); }
    actions.push(["ModifyColumn", E.tableId, K.NOM_COLONNE_CONFIG, { description: JSON.stringify(ex.config) }]);
    await grist.docApi.applyUserActions(actions);
    await demarrer();
    message("success", "Catalogue d'exemple créé. Les colonnes de départ de la table (A, B, C…) peuvent être supprimées.");
  }

  if (typeof grist === "undefined") {
    $("#etat").textContent = "Hors de Grist";
    $("#vue").innerHTML = "<div class=\"fr-alert fr-alert--info\"><h1 class=\"fr-alert__title\">Ce widget s'utilise dans Grist</h1><p>Ajoutez une vue « Personnalisée » sur la table du catalogue, avec l'adresse de cette page et l'accès complet au document.</p></div>";
    return;
  }
  grist.ready({ requiredAccess: "full" });
  var lance = false;
  function lancer() {
    if (lance) { return; }
    lance = true;
    demarrer().catch(function (e) { lance = false; message("error", "Lecture impossible : accordez l'accès complet au document. (" + (e.message || e) + ")"); });
  }
  grist.onRecords(lancer);
  setTimeout(lancer, 800);
})();
