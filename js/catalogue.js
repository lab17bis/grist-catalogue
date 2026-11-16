/*
 * Catalogue DSFR adossé à une table Grist : moteur générique.
 *
 * Aucun contenu n'est écrit dans ce fichier : titres, colonnes, sections, filtres,
 * étiquettes, blocs de fiche et en-tête viennent des réglages (voir README).
 *
 * Catalogue.monter(conteneur, { config, lignes, types, source, demo, lienPublic })
 * Catalogue.sourceRest(lien, table) / Catalogue.sourceWidget() / Catalogue.sourceDemo(url)
 */
(function (global) {
  "use strict";

  var NOM_COLONNE_CONFIG = "Config_catalogue";
  var PIXEL = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";

  /* ---------- Outils ---------- */

  function esc(s) {
    return String(s === null || s === undefined ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  function norm(s) {
    return String(s === null || s === undefined ? "" : s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }
  function vide(v) { return v === null || v === undefined || v === "" || (Array.isArray(v) && (v.length === 0 || (v[0] === "L" && v.length === 1))); }
  function enListe(v) {
    if (vide(v)) { return []; }
    if (Array.isArray(v)) { return (v[0] === "L" ? v.slice(1) : v).filter(function (x) { return !vide(x); }); }
    if (v === true) { return ["true"]; }
    if (v === false) { return []; }
    return [v];
  }
  function lignesDe(t, sep) {
    if (vide(t)) { return []; }
    var parties = sep === ";" ? String(t).split(";") : String(t).split(/\r?\n/);
    return parties.map(function (x) { return x.trim(); }).filter(Boolean);
  }
  function fmtDate(v) {
    if (typeof v !== "number") { return ""; }
    return new Date(v * 1000).toLocaleDateString("fr-FR", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" });
  }
  function adresseWeb(u) {
    try {
      var x = new URL(String(u).trim(), location.href);
      return /^https?:$/.test(x.protocol) ? x.href : null;
    } catch (e) { return null; }
  }
  function couleurSure(c) { return /^#[0-9a-f]{3,8}$/i.test(String(c || "")) ? c : ""; }

  /* ---------- Réglages par défaut ---------- */

  function completer(c) {
    c = JSON.parse(JSON.stringify(c || {}));
    c.titre = c.titre || "Catalogue";
    c.elements = Object.assign({ singulier: "fiche", pluriel: "fiches", feminin: true }, c.elements || {});
    c.colonnes = Object.assign({ titre: "titre" }, c.colonnes || {});
    c.sections = c.sections || {};
    c.entrees = c.entrees || { liste: [] };
    c.entrees.liste = c.entrees.liste || [];
    c.filtres = c.filtres || [];
    c.recherche = c.recherche || { colonnes: [] };
    c.tris = c.tris && c.tris.length ? c.tris : [{ mode: "alpha", libelle: "Ordre alphabétique" }];
    c.etiquettes = c.etiquettes || [];
    c.nouveau = c.nouveau || { jours: 0 };
    c.carte = c.carte || { details: [] };
    c.fiche = Object.assign({ infos: [], blocs: [], lienRetour: "Retour au catalogue", titreFichiers: "Télécharger et consulter", libelleLien: "Ouvrir le lien externe" }, c.fiche || {});
    c.fiche.apercuPdf = c.fiche.apercuPdf || { actif: false };
    return c;
  }

  /* ---------- Sources de données ---------- */

  function analyserLienDocument(lien) {
    try {
      var u = new URL(String(lien).trim());
      var seg = u.pathname.split("/").filter(Boolean);
      var org = "";
      if (seg[0] === "o") { org = seg[1]; seg = seg.slice(2); }
      var doc = seg[0] === "doc" ? seg[1] : (seg[0] === "api" && seg[1] === "docs" ? seg[2] : seg[0]);
      if (!doc || doc === "api" || doc === "forms") { return null; }
      return { origine: u.origin, organisation: org, doc: doc, base: u.origin + (org ? "/o/" + org : "") + "/api/docs/" + doc };
    } catch (e) { return null; }
  }

  async function json(reponse) {
    if (!reponse.ok) { throw new Error("Erreur " + reponse.status); }
    return reponse.json();
  }

  function lireConfig(description) {
    try { return description ? JSON.parse(description) : null; } catch (e) { return null; }
  }

  // Page publique : document Grist partagé en lecture publique (lecture anonyme, règles d'accès respectées).
  function sourceRest(lien, table) {
    var cible = analyserLienDocument(lien);
    if (!cible || !table) { return null; }
    var base = cible.base;
    return {
      mode: "public",
      charger: async function () {
        var res = await Promise.all([
          fetch(base + "/tables/" + encodeURIComponent(table) + "/columns").then(json),
          fetch(base + "/tables/" + encodeURIComponent(table) + "/records").then(json)
        ]);
        var types = {}, config = null;
        res[0].columns.forEach(function (c) {
          types[c.id] = c.fields.type;
          if (c.id === NOM_COLONNE_CONFIG) { config = lireConfig(c.fields.description); }
        });
        var lignes = res[1].records.map(function (r) { return Object.assign({ id: r.id }, r.fields); });
        return { config: config, lignes: lignes, types: types };
      },
      urlPj: function (id, telechargement) {
        return Promise.resolve(base + "/attachments/" + encodeURIComponent(id) + (telechargement ? "/download" : ""));
      }
    };
  }

  function enLignes(t) {
    var cles = Object.keys(t);
    return (t.id || []).map(function (_, i) {
      var o = {};
      cles.forEach(function (k) { o[k] = t[k][i]; });
      return o;
    });
  }

  // Widget dans Grist : lecture avec les droits de la personne connectée.
  function sourceWidget() {
    var jeton = null;
    function token() {
      if (jeton && jeton.exp > Date.now()) { return Promise.resolve(jeton.t); }
      return grist.docApi.getAccessToken({ readOnly: true }).then(function (t) {
        jeton = { t: t, exp: Date.now() + Math.max(30000, (t.ttlMsecs || 120000) - 15000) };
        return t;
      });
    }
    return {
      mode: "widget",
      charger: async function () {
        var tableId = await grist.selectedTable.getTableId();
        var tables = enLignes(await grist.docApi.fetchTable("_grist_Tables"));
        var ref = (tables.find(function (t) { return t.tableId === tableId; }) || {}).id;
        var cols = enLignes(await grist.docApi.fetchTable("_grist_Tables_column")).filter(function (c) { return c.parentId === ref; });
        var types = {}, config = null;
        cols.forEach(function (c) {
          types[c.colId] = c.type;
          if (c.colId === NOM_COLONNE_CONFIG) { config = lireConfig(c.description); }
        });
        var lignes = enLignes(await grist.docApi.fetchTable(tableId));
        return { config: config, lignes: lignes, types: types, tableId: tableId };
      },
      urlPj: function (id, telechargement) {
        return token().then(function (t) {
          return t.baseUrl + "/attachments/" + encodeURIComponent(id) + (telechargement ? "/download" : "") + "?auth=" + encodeURIComponent(t.token);
        });
      }
    };
  }

  // Démonstration : données fictives.
  function sourceDemo(url) {
    var donnees = null;
    return {
      mode: "demo",
      charger: async function () {
        donnees = await fetch(url).then(json);
        return { config: donnees.config, lignes: donnees.lignes, types: donnees.types || {} };
      },
      urlPj: function (id) {
        var f = donnees && donnees.fichiers && donnees.fichiers[id];
        return Promise.resolve(f ? f.url : "");
      },
      infoPj: function (id) {
        var f = donnees && donnees.fichiers && donnees.fichiers[id];
        return Promise.resolve({ fileName: f ? f.nom : "fichier-" + id });
      }
    };
  }

  /* ---------- Montage ---------- */

  function monter(app, opts) {
    var c = completer(opts.config);
    var types = opts.types || {};
    var source = opts.source;
    var col = c.colonnes;
    var etat = { q: "", section: "", entree: "", filtres: {}, tri: c.tris[0].mode };
    var lignes = (opts.lignes || []).filter(function (r) {
      return !col.publie || r[col.publie] === true;
    });

    var el = c.elements;
    function nombre(n) { return n + " " + (n > 1 ? el.pluriel : el.singulier); }
    function aucun() { return (el.feminin ? "Aucune " : "Aucun ") + el.singulier + " ne correspond à votre recherche."; }

    function valeurTexte(v, colonne) {
      var t = String(types[colonne] || "");
      if (t.indexOf("Date") === 0) { return fmtDate(v); }
      if (v === true) { return "Oui"; }
      if (v === false) { return ""; }
      return enListe(v).join(" · ");
    }

    // « a|b » : première colonne non vide.
    function premiere(r, spec) {
      var noms = String(spec || "").split("|");
      for (var i = 0; i < noms.length; i++) {
        if (!vide(r[noms[i]])) { return { colonne: noms[i], valeur: r[noms[i]] }; }
      }
      return null;
    }

    function verifie(cond, r) {
      if (!cond || !cond.colonne) { return true; }
      var vals = enListe(r[cond.colonne]).map(function (v) { return norm(v); });
      if (cond.vide === true) { return vals.length === 0; }
      if (cond.vide === false) { return vals.length > 0; }
      if (!cond.valeurs || !cond.valeurs.length) { return true; }
      var attendus = cond.valeurs.map(norm);
      var trouve = vals.some(function (v) { return attendus.indexOf(v) >= 0; });
      return cond.exclure ? !trouve : trouve;
    }

    /* --- étiquettes --- */
    function etiquettes(r, ou, petite) {
      var html = "";
      c.etiquettes.forEach(function (e) {
        if (ou === "carte" && e.carte === false) { return; }
        if (ou === "fiche" && e.fiche === false) { return; }
        var vals = enListe(r[e.colonne]).map(String);
        if (e.seulementSiUnique && vals.length !== 1) { return; }
        if (e.valeurs && e.valeurs.length) {
          var permis = e.valeurs.map(norm);
          vals = vals.filter(function (v) { return permis.indexOf(norm(v)) >= 0; });
        }
        vals.forEach(function (v) {
          var lib = (e.libelles && e.libelles[v]) || (v === "true" ? (e.libelleVrai || e.colonne) : v);
          var coul = (e.couleurs && e.couleurs[v]) || {};
          var fond = couleurSure(coul.fond || e.fond), texte = couleurSure(coul.texte || e.texte);
          html += "<li><p class=\"fr-badge " + (petite ? "fr-badge--sm " : "") + "fr-badge--no-icon\"" +
            (fond || texte ? " style=\"" + (fond ? "background-color:" + fond + ";" : "") + (texte ? "color:" + texte + ";" : "") + "\"" : "") +
            ">" + esc(lib) + "</p></li>";
        });
      });
      if (c.nouveau && c.nouveau.jours > 0 && col.date && estNouveau(r)) {
        html += "<li><p class=\"fr-badge " + (petite ? "fr-badge--sm " : "") + "fr-badge--new\">Nouveau</p></li>";
      }
      return html ? "<ul class=\"fr-badges-group\">" + html + "</ul>" : "";
    }

    var datePremiere = Infinity;
    if (col.date) {
      lignes.forEach(function (r) { if (typeof r[col.date] === "number") { datePremiere = Math.min(datePremiere, r[col.date]); } });
    }
    function estNouveau(r) {
      var d = r[col.date];
      if (typeof d !== "number") { return false; }
      return d > datePremiere + 86400 && Date.now() / 1000 - d < c.nouveau.jours * 86400;
    }

    /* --- sections, filtres, recherche, tri --- */
    var sec = c.sections;
    function valeursDe(colonne, lst) {
      var vus = {}, out = [];
      (lst || lignes).forEach(function (r) {
        enListe(r[colonne]).map(String).forEach(function (v) { if (!vus[v]) { vus[v] = 1; out.push(v); } });
      });
      return out;
    }
    function ordonner(vals, ordre) {
      ordre = ordre || [];
      return vals.sort(function (a, b) {
        var ia = ordre.indexOf(a), ib = ordre.indexOf(b);
        return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib) || a.localeCompare(b, "fr", { numeric: true });
      });
    }
    function sectionsDisponibles() {
      if (!sec.colonne) { return []; }
      var vals = valeursDe(sec.colonne);
      if (sec.valeurs && sec.valeurs.length) { vals = vals.filter(function (v) { return sec.valeurs.indexOf(v) >= 0; }); }
      return ordonner(vals, sec.ordre);
    }
    function dansSection(r, s) { return !s || enListe(r[sec.colonne]).map(String).indexOf(s) >= 0; }

    function correspond(r, ignorerFiltre) {
      if (etat.section && !dansSection(r, etat.section)) { return false; }
      if (etat.entree && c.entrees.colonne) {
        var e = c.entrees.liste[Number(etat.entree)];
        if (e) {
          var attendus = (e.valeurs || []).map(norm);
          if (!enListe(r[c.entrees.colonne]).some(function (v) { return attendus.indexOf(norm(v)) >= 0; })) { return false; }
        }
      }
      for (var i = 0; i < c.filtres.length; i++) {
        var f = c.filtres[i];
        if (f.colonne === ignorerFiltre) { continue; }
        var sel = etat.filtres[f.colonne];
        if (!sel) { continue; }
        var vals = enListe(r[f.colonne]).map(String);
        if (f.multiple) {
          var choisis = Object.keys(sel).filter(function (k) { return sel[k]; });
          for (var j = 0; j < choisis.length; j++) { if (vals.indexOf(choisis[j]) < 0) { return false; } }
        } else if (vals.indexOf(sel) < 0) { return false; }
      }
      var q = norm(etat.q).trim();
      if (!q) { return true; }
      var champs = c.recherche.colonnes && c.recherche.colonnes.length ? c.recherche.colonnes :
        [col.titre, col.resume, col.description, sec.colonne].filter(Boolean);
      return norm(champs.map(function (k) { return enListe(r[k]).join(" "); }).join(" ")).indexOf(q) >= 0;
    }

    function titre(r) { return String(r[col.titre] || "(sans titre)"); }
    function parTitre(a, b) { return titre(a).localeCompare(titre(b), "fr", { numeric: true }); }
    function temps(r) { return col.date && typeof r[col.date] === "number" ? r[col.date] : 0; }
    function rangSection(r) {
      var v = enListe(r[sec.colonne]).map(String)[0];
      var i = (sec.ordre || []).indexOf(v);
      return i < 0 ? 999 : i;
    }
    function trier(lst) {
      var l = lst.slice();
      if (etat.tri === "recent") { return l.sort(function (a, b) { return temps(b) - temps(a) || parTitre(a, b); }); }
      if (etat.tri === "section" && sec.colonne) { return l.sort(function (a, b) { return rangSection(a) - rangSection(b) || temps(b) - temps(a) || parTitre(a, b); }); }
      l.sort(parTitre);
      if (etat.tri !== "alterne" || !sec.colonne || etat.section) { return l; }
      // Alterné : une fiche de chaque section à tour de rôle.
      var groupes = {}, ordre = [];
      l.forEach(function (r) { var k = String(enListe(r[sec.colonne])[0] || ""); if (!groupes[k]) { groupes[k] = []; ordre.push(k); } groupes[k].push(r); });
      ordre = ordonner(ordre, sec.ordre);
      var out = [], i = 0, reste = true;
      while (reste) {
        reste = false;
        ordre.forEach(function (k) { if (groupes[k][i]) { out.push(groupes[k][i]); reste = true; } });
        i++;
      }
      return out;
    }

    function filtreActif() {
      return !!(etat.q || etat.section || etat.entree || Object.keys(etat.filtres).some(function (k) {
        var s = etat.filtres[k];
        return typeof s === "string" ? !!s : Object.keys(s || {}).some(function (x) { return s[x]; });
      }));
    }

    /* --- images --- */
    var cacheBlob = {};
    function blobDe(id) {
      if (!cacheBlob[id]) {
        cacheBlob[id] = source.urlPj(id, true).then(function (u) { return fetch(u); })
          .then(function (r) { if (!r.ok) { throw new Error("http " + r.status); } return r.blob(); })
          .then(function (b) { return URL.createObjectURL(b); });
        cacheBlob[id].catch(function () { delete cacheBlob[id]; });
      }
      return cacheBlob[id];
    }
    function chargerImages() {
      Array.prototype.forEach.call(app.querySelectorAll("img[data-pj]"), function (img) {
        if (img.getAttribute("data-ok")) { return; }
        img.setAttribute("data-ok", "1");
        blobDe(img.getAttribute("data-pj")).then(function (u) { img.src = u; }).catch(function () {
          var h = img.closest(".fr-card__header"); if (h) { h.remove(); } else { img.remove(); }
        });
      });
    }
    function infoPj(id) {
      if (source.infoPj) { return source.infoPj(id); }
      return source.urlPj(id, false).then(function (u) { return fetch(u); })
        .then(function (r) { return r.ok ? r.json() : { fileName: "Fichier " + id }; })
        .catch(function () { return { fileName: "Fichier " + id }; });
    }
    function classesCadrage(r) {
      var mode = norm(col.cadrage ? r[col.cadrage] : "") || norm(c.carte.cadrage || "");
      if (mode.indexOf("zoom") >= 0) { return " ca-zoom"; }
      if (mode.indexOf("remplir") >= 0) { return mode.indexOf("haut") >= 0 ? " ca-remplir-haut" : " ca-remplir"; }
      return "";
    }
    function imageCarte(r) {
      var id = enListe(col.image ? r[col.image] : null)[0] || enListe(c.fiche.galerie ? r[c.fiche.galerie] : null)[0];
      if (!id) { return ""; }
      return "<div class=\"fr-card__header\"><div class=\"fr-card__img\"><img class=\"fr-responsive-img ca-vignette" + classesCadrage(r) +
        "\" data-pj=\"" + esc(id) + "\" alt=\"\" src=\"" + PIXEL + "\"></div></div>";
    }

    /* --- liste --- */
    function carte(r) {
      var texte = premiere(r, [col.resume, col.description].filter(Boolean).join("|"));
      var details = (c.carte.details || []).map(function (spec) {
        var p = premiere(r, spec);
        return p ? valeurTexte(p.valeur, p.colonne) : "";
      }).filter(Boolean).join(" · ");
      return "<div class=\"fr-col-12 fr-col-md-6 fr-col-lg-4\"><div class=\"fr-card fr-enlarge-link\"><div class=\"fr-card__body\"><div class=\"fr-card__content\">" +
        "<h3 class=\"fr-card__title\"><a href=\"#r/" + esc(r.id) + "\">" + esc(titre(r)) + "</a></h3>" +
        (texte ? "<p class=\"fr-card__desc ca-coupe\">" + esc(texte.valeur) + "</p>" : "") +
        "<div class=\"fr-card__start\">" + etiquettes(r, "carte", true) + (details ? "<p class=\"fr-card__detail\">" + esc(details) + "</p>" : "") + "</div>" +
        "</div></div>" + imageCarte(r) + "</div></div>";
    }
    function grille(lst) {
      return "<div class=\"fr-grid-row fr-grid-row--gutters\">" + lst.map(carte).join("") + "</div>";
    }

    function boutonsFiltre(f) {
      if (f.dansSection && !etat.section) { return ""; }
      var base = lignes.filter(function (r) { return correspond(r, f.colonne) || false; });
      var vals = valeursDe(f.colonne, base);
      if (f.valeurs && f.valeurs.length) { vals = vals.filter(function (v) { return f.valeurs.indexOf(v) >= 0; }); }
      vals = ordonner(vals, f.ordre);
      if (f.decroissant) { vals.reverse(); }
      var sel = etat.filtres[f.colonne];
      if (vals.length < 2 && !sel) { return ""; }
      var lib = function (v) { return (f.libelles && f.libelles[v]) || (v === "true" ? "Oui" : v); };
      if (f.multiple) {
        sel = sel || {};
        return "<div class=\"ca-filtre\" role=\"group\" aria-label=\"" + esc(f.libelle || f.colonne) + "\">" +
          (f.libelle ? "<span class=\"fr-text--sm ca-filtre__titre\">" + esc(f.libelle) + "</span>" : "") +
          vals.map(function (v) {
            return "<button type=\"button\" class=\"fr-tag\" data-filtre=\"" + esc(f.colonne) + "\" data-valeur=\"" + esc(v) + "\" aria-pressed=\"" + (!!sel[v]) + "\">" + esc(lib(v)) + "</button>";
          }).join("") + "</div>";
      }
      return "<div class=\"ca-filtre\" role=\"group\" aria-label=\"" + esc(f.libelle || f.colonne) + "\">" +
        (f.libelle ? "<span class=\"fr-text--sm ca-filtre__titre\">" + esc(f.libelle) + "</span>" : "") +
        "<button type=\"button\" class=\"fr-tag\" data-filtre=\"" + esc(f.colonne) + "\" data-valeur=\"\" aria-pressed=\"" + (!sel) + "\">" + esc(f.libelleTous || "Tous") + "</button>" +
        vals.map(function (v) {
          return "<button type=\"button\" class=\"fr-tag\" data-filtre=\"" + esc(f.colonne) + "\" data-valeur=\"" + esc(v) + "\" aria-pressed=\"" + (sel === v) + "\">" + esc(lib(v)) + "</button>";
        }).join("") + "</div>";
    }

    function resultats() { return trier(lignes.filter(function (r) { return correspond(r); })); }

    function htmlResultats() {
      var res = resultats();
      var h = "";
      var une = col.aLaUne && !filtreActif() ? res.filter(function (r) { return r[col.aLaUne] === true; }) : [];
      if (une.length) {
        h += "<section class=\"ca-une\" aria-labelledby=\"ca-une-titre\"><h2 class=\"fr-h5\" id=\"ca-une-titre\">" + esc(c.titreALaUne || "À la une") + "</h2>" + grille(une) + "</section>";
        res = res.filter(function (r) { return r[col.aLaUne] !== true; });
        if (res.length) { h += "<h2 class=\"fr-h5 ca-titre-tous\">" + esc(c.titreTous || "Tout le catalogue") + "</h2>"; }
      }
      h += res.length ? grille(res) : (une.length ? "" : "<p>" + esc(aucun()) + "</p>");
      return { html: h, nombre: res.length + une.length };
    }

    function rendreListe() {
      var h = "<h1 class=\"fr-h3\">" + esc(c.titre) + "</h1>";
      if (c.introduction) { h += "<div class=\"ca-intro\">" + formater(c.introduction) + "</div>"; }
      if (opts.demo) { h += "<div class=\"fr-alert fr-alert--info fr-alert--sm fr-mb-2w\"><p>Démonstration avec des données fictives.</p></div>"; }

      if (c.entrees.colonne && c.entrees.liste.length) {
        h += "<div class=\"ca-entrees\" role=\"group\" aria-label=\"" + esc(c.entrees.titre || "Entrées") + "\">" +
          (c.entrees.titre ? "<p class=\"fr-text--sm fr-mb-1v\"><strong>" + esc(c.entrees.titre) + "</strong></p>" : "") +
          "<div class=\"ca-etiquettes\">" + c.entrees.liste.map(function (e, i) {
            return "<button type=\"button\" class=\"fr-tag\" data-entree=\"" + i + "\" aria-pressed=\"" + (etat.entree === String(i)) + "\">" + esc(e.libelle) + "</button>";
          }).join("") + "</div></div>";
      }

      var sections = sectionsDisponibles();
      if (sections.length > 1) {
        var compter = function (s) { return lignes.filter(function (r) { return dansSection(r, s); }).length; };
        var etiq = sec.affichage === "etiquettes";
        var btn = function (s, lib) {
          var actif = etat.section === s;
          return etiq ?
            "<button type=\"button\" class=\"fr-tag\" data-section=\"" + esc(s) + "\" aria-pressed=\"" + actif + "\">" + esc(lib) + "</button>" :
            "<button type=\"button\" class=\"fr-btn fr-btn--sm " + (actif ? "" : "fr-btn--tertiary") + "\" data-section=\"" + esc(s) + "\" aria-pressed=\"" + actif + "\">" + esc(lib) + "</button>";
        };
        h += "<div class=\"ca-sections\" role=\"group\" aria-label=\"" + esc(sec.libelle || "Sections") + "\">" +
          btn("", (sec.libelleTout || "Tout") + (etiq ? "" : " (" + lignes.filter(function (r) { return sections.some(function (s) { return dansSection(r, s); }); }).length + ")")) +
          sections.map(function (s) { return btn(s, ((sec.libelles && sec.libelles[s]) || s) + (etiq ? "" : " (" + compter(s) + ")")); }).join("") + "</div>";
        if (sec.aide && !etat.section) { h += "<p class=\"fr-hint-text fr-mb-2w\">" + esc(sec.aide) + "</p>"; }
      }

      var nomRecherche = "Rechercher " + (el.feminin ? "une " : "un ") + el.singulier;
      h += "<div class=\"fr-search-bar fr-mt-2w\" role=\"search\"><label class=\"fr-label\" for=\"ca-q\">" + esc(nomRecherche) + "</label>" +
        "<input class=\"fr-input\" type=\"search\" id=\"ca-q\" placeholder=\"" + esc(nomRecherche) + "\" value=\"" + esc(etat.q) + "\">" +
        "<button class=\"fr-btn\" type=\"button\" title=\"Rechercher\">Rechercher</button></div>";

      h += c.filtres.map(boutonsFiltre).join("");

      var r = htmlResultats();
      h += "<div class=\"ca-barre\"><p class=\"fr-text--sm ca-compte\" id=\"ca-compte\" role=\"status\">" + esc(nombre(r.nombre)) + "</p>";
      if (c.tris.length > 1) {
        h += "<div class=\"fr-select-group ca-tri\"><label class=\"fr-label\" for=\"ca-tri\">Trier par</label><select class=\"fr-select\" id=\"ca-tri\">" +
          c.tris.map(function (t) { return "<option value=\"" + esc(t.mode) + "\"" + (etat.tri === t.mode ? " selected" : "") + ">" + esc(t.libelle) + "</option>"; }).join("") + "</select></div>";
      }
      h += "</div><div id=\"ca-resultats\">" + r.html + "</div>";
      app.innerHTML = h;
      chargerImages();
    }

    function majResultats() {
      var r = htmlResultats();
      document.getElementById("ca-resultats").innerHTML = r.html;
      document.getElementById("ca-compte").textContent = nombre(r.nombre);
      chargerImages();
    }

    /* --- fiche --- */
    function formater(t) {
      return String(t || "").trim().split(/\n\s*\n/).filter(Boolean).map(function (p) {
        var s = esc(p.trim()).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
          .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+|mailto:[^)\s]+)\)/g, function (_, l, u) {
            return "<a href=\"" + u + "\"" + (u.indexOf("mailto:") ? " target=\"_blank\" rel=\"noopener\" title=\"" + l + " - nouvelle fenêtre\"" : "") + ">" + l + "</a>";
          }).replace(/\n/g, "<br>");
        return "<p>" + s + "</p>";
      }).join("");
    }

    function htmlBloc(b, r) {
      if (!verifie(b.condition, r)) { return ""; }
      var titreBloc = b.titre ? "<h2 class=\"fr-h5 fr-mt-3w ca-bloc-titre\">" + esc(b.titre) + "</h2>" : "";
      var v = b.colonne ? r[b.colonne] : null;
      if (b.format === "message") {
        return b.texte ? "<div class=\"fr-alert fr-alert--info fr-alert--sm fr-mb-2w\"><p>" + esc(b.texte) + "</p></div>" : "";
      }
      if (vide(v)) { return ""; }
      var items = lignesDe(Array.isArray(v) ? enListe(v).join("\n") : v, b.separateur);
      switch (b.format) {
        case "paragraphes":
          return titreBloc + items.map(function (x) { return "<p>" + esc(x) + "</p>"; }).join("");
        case "liste":
          return titreBloc + "<ul class=\"ca-liste\">" + items.map(function (x) { return "<li>" + esc(x.charAt(0).toUpperCase() + x.slice(1)) + "</li>"; }).join("") + "</ul>";
        case "etapes":
          var avant = "";
          if (/^Avant\s*:/i.test(items[0] || "")) { avant = "<p><strong>Avant de commencer :</strong> " + esc(items[0].replace(/^Avant\s*:\s*/i, "")) + "</p>"; items = items.slice(1); }
          return titreBloc + avant + "<ol class=\"ca-etapes\">" + items.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ol>";
        case "liste-titree":
          return titreBloc + "<ul class=\"ca-liste\">" + items.map(function (x) {
            var i = x.indexOf(" : ");
            return "<li>" + (i > 0 ? "<strong>" + esc(x.slice(0, i)) + "</strong><br>" + esc(x.slice(i + 3)) : esc(x)) + "</li>";
          }).join("") + "</ul>";
        case "encadre":
          return "<div class=\"fr-callout ca-encadre\">" + (b.titre ? "<h2 class=\"fr-callout__title fr-h6\">" + esc(b.titre) + "</h2>" : "") +
            "<p class=\"fr-callout__text\">" + esc(String(v)) + "</p></div>";
        case "vigilance":
          var t = items.length > 1 && b.titrePluriel ? b.titrePluriel : b.titre;
          return "<div class=\"fr-callout fr-callout--yellow-tournesol ca-encadre\">" + (t ? "<h3 class=\"fr-callout__title\">" + esc(t) + "</h3>" : "") +
            (items.length > 1 ? "<ul class=\"ca-liste\">" + items.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>" :
              "<p class=\"fr-callout__text\">" + esc(items[0]) + "</p>") + "</div>";
        case "citation":
          return titreBloc + "<figure class=\"fr-quote ca-citation\"><blockquote><p>" + esc(String(v)) + "</p></blockquote></figure>";
        case "en-ligne":
          return "<p class=\"ca-en-ligne\">" + (b.titre ? "<strong>" + esc(b.titre) + " :</strong> " : "") + esc(valeurTexte(v, b.colonne)) + "</p>";
        case "etiquettes":
          return titreBloc + "<ul class=\"fr-tags-group fr-mt-2w\">" + enListe(v).map(function (x) { return "<li><p class=\"fr-tag\">" + esc(x) + "</p></li>"; }).join("") + "</ul>";
        default:
          return titreBloc + "<p class=\"ca-pre\">" + esc(valeurTexte(v, b.colonne)) + "</p>";
      }
    }

    function htmlInfos(r) {
      var l = (c.fiche.infos || []).map(function (i) {
        var p = premiere(r, i.colonne);
        return p ? [i.libelle || i.colonne, valeurTexte(p.valeur, p.colonne)] : null;
      }).filter(function (x) { return x && x[1]; });
      return l.length ? "<dl class=\"ca-infos\">" + l.map(function (x) { return "<div><dt>" + esc(x[0]) + "</dt><dd>" + esc(x[1]) + "</dd></div>"; }).join("") + "</dl>" : "";
    }

    function carrousel(images, legendes, libelle) {
      var n = images.length;
      return "<div class=\"ca-carrousel\" role=\"group\" aria-roledescription=\"carrousel\" aria-label=\"" + esc(libelle) + "\" data-n=\"" + n + "\">" +
        images.map(function (src, i) {
          return "<figure class=\"ca-vue\" data-i=\"" + i + "\"" + (i ? " hidden" : "") + ">" + src +
            (legendes[i] ? "<figcaption class=\"fr-text--xs\">" + esc(legendes[i]) + "</figcaption>" : "") + "</figure>";
        }).join("") +
        (n > 1 ? "<div class=\"ca-carrousel__nav\"><button type=\"button\" class=\"fr-btn fr-btn--tertiary fr-btn--sm\" data-dir=\"-1\">‹ Précédent</button>" +
          "<span class=\"fr-text--sm ca-carrousel__pos\">1 / " + n + "</span>" +
          "<button type=\"button\" class=\"fr-btn fr-btn--tertiary fr-btn--sm\" data-dir=\"1\">Suivant ›</button></div>" : "") + "</div>";
    }
    function brancherCarrousel() {
      var k = app.querySelector(".ca-carrousel"); if (!k) { return; }
      var n = +k.getAttribute("data-n"), cur = 0;
      Array.prototype.forEach.call(k.querySelectorAll("[data-dir]"), function (b) {
        b.addEventListener("click", function () {
          cur = (cur + (+b.getAttribute("data-dir")) + n) % n;
          Array.prototype.forEach.call(k.querySelectorAll(".ca-vue"), function (f) { f.hidden = (+f.getAttribute("data-i") !== cur); });
          k.querySelector(".ca-carrousel__pos").textContent = (cur + 1) + " / " + n;
        });
      });
    }

    var pdfjs = null;
    function chargerPdfjs() {
      if (pdfjs) { return pdfjs; }
      pdfjs = new Promise(function (ok, ko) {
        if (global.pdfjsLib) { return ok(global.pdfjsLib); }
        var s = document.createElement("script");
        s.src = (opts.base || "") + "vendor/pdfjs/pdf.min.js";
        s.onload = function () { global.pdfjsLib.GlobalWorkerOptions.workerSrc = (opts.base || "") + "vendor/pdfjs/pdf.worker.min.js"; ok(global.pdfjsLib); };
        s.onerror = function () { ko(new Error("pdfjs")); };
        document.head.appendChild(s);
      });
      pdfjs.catch(function () { pdfjs = null; });
      return pdfjs;
    }
    function apercuPdf(r) {
      var zone = document.getElementById("ca-visuel");
      var ids = enListe(col.fichiers ? r[col.fichiers] : null);
      if (!zone || !ids.length) { return; }
      var suite = Promise.resolve(null);
      ids.forEach(function (id) {
        suite = suite.then(function (t) { return t || infoPj(id).then(function (i) { return /\.pdf$/i.test(i.fileName || "") ? id : null; }); });
      });
      suite.then(function (id) {
        if (!id) { return; }
        return Promise.all([chargerPdfjs(), blobDe(id)]).then(function (x) { return x[0].getDocument(x[1]).promise; }).then(function (pdf) {
          var max = Math.min(pdf.numPages, Number(c.fiche.apercuPdf.pages) || 2), toiles = [], p = Promise.resolve();
          for (var n = 1; n <= max; n++) {
            (function (n) {
              p = p.then(function () { return pdf.getPage(n); }).then(function (page) {
                var vp = page.getViewport({ scale: 2 });
                var cv = document.createElement("canvas");
                cv.width = vp.width; cv.height = vp.height;
                cv.setAttribute("role", "img"); cv.setAttribute("aria-label", "Aperçu du document, page " + n);
                toiles.push(cv);
                return page.render({ canvasContext: cv.getContext("2d"), viewport: vp }).promise;
              });
            })(n);
          }
          return p.then(function () { return toiles; });
        }).then(function (toiles) {
          var leg = c.fiche.apercuPdf.legendes || ["Recto", "Verso"];
          zone.innerHTML = carrousel(toiles.map(function (_, i) { return "<div data-toile=\"" + i + "\"></div>"; }), toiles.map(function (_, i) { return leg[i] || ("Page " + (i + 1)); }), "Aperçu du document");
          toiles.forEach(function (cv, i) { var d = zone.querySelector("[data-toile=\"" + i + "\"]"); d.replaceWith(cv); });
          brancherCarrousel();
        });
      }).catch(function () { /* aperçu facultatif */ });
    }

    function lienFiche(r) {
      return (opts.lienPublic || location.href.split("#")[0]) + "#r/" + encodeURIComponent(r.id);
    }
    function copierLien(url) {
      var ok = false;
      try {
        var t = document.createElement("textarea");
        t.value = url; t.setAttribute("readonly", ""); t.style.position = "fixed"; t.style.opacity = "0";
        document.body.appendChild(t); t.select(); ok = document.execCommand("copy"); t.remove();
      } catch (e) { ok = false; }
      var st = document.getElementById("ca-statut-copie"), b = document.getElementById("ca-copier");
      var man = document.getElementById("ca-lien-manuel"), ch = document.getElementById("ca-lien-champ");
      if (ok) {
        st.textContent = "Lien copié dans le presse-papiers";
        b.textContent = "Lien copié ✓";
        setTimeout(function () { b.textContent = "Copier le lien de cette fiche"; }, 2500);
      } else {
        ch.value = url; man.hidden = false; ch.focus(); ch.select();
      }
    }

    function rendreFiche(id) {
      var r = lignes.filter(function (x) { return String(x.id) === String(id); })[0];
      if (!r) { location.hash = ""; return; }
      var galerie = enListe(c.fiche.galerie ? r[c.fiche.galerie] : null);
      var image = enListe(col.image ? r[col.image] : null)[0];
      var visuel = galerie.length ?
        carrousel(galerie.map(function (g) { return "<img class=\"fr-responsive-img\" data-pj=\"" + esc(g) + "\" alt=\"Illustration de « " + esc(titre(r)) + " »\" src=\"" + PIXEL + "\">"; }), [], "Illustrations") :
        (image ? "<img class=\"fr-responsive-img ca-vignette-fiche\" data-pj=\"" + esc(image) + "\" alt=\"\" src=\"" + PIXEL + "\">" : "");
      var pdf = c.fiche.apercuPdf.actif && verifie(c.fiche.apercuPdf.condition, r) && col.fichiers && enListe(r[col.fichiers]).length;
      if (visuel || pdf) { visuel = "<div id=\"ca-visuel\">" + visuel + "</div>"; }

      var h = "<div class=\"ca-haut-fiche\"><a class=\"fr-link\" href=\"#\" id=\"ca-retour\"><span aria-hidden=\"true\">← </span>" + esc(c.fiche.lienRetour) + "</a>" +
        "<button type=\"button\" class=\"fr-btn fr-btn--tertiary fr-btn--sm\" id=\"ca-copier\">Copier le lien de cette fiche</button></div>" +
        "<p class=\"fr-text--sm ca-lien-manuel\" id=\"ca-lien-manuel\" hidden><label for=\"ca-lien-champ\">Copiez ce lien :</label> <input class=\"fr-input\" id=\"ca-lien-champ\" readonly></p>" +
        "<p class=\"fr-sr-only\" role=\"status\" id=\"ca-statut-copie\"></p>" +
        "<h1 class=\"fr-h2\">" + esc(titre(r)) + "</h1>" + etiquettes(r, "fiche", false) +
        "<div class=\"fr-grid-row fr-grid-row--gutters\">" +
        (visuel ? "<div class=\"fr-col-12 fr-col-lg-5\">" + visuel + "</div>" : "") +
        "<div class=\"fr-col-12" + (visuel ? " fr-col-lg-7" : "") + "\">" +
        (col.resume && !vide(r[col.resume]) ? "<p class=\"fr-text--lead ca-resume\">" + esc(r[col.resume]) + "</p>" : "") +
        htmlInfos(r) +
        c.fiche.blocs.map(function (b) { return htmlBloc(b, r); }).join("") +
        "</div></div>";
      var fichiers = enListe(col.fichiers ? r[col.fichiers] : null);
      var lien = col.lien ? adresseWeb(r[col.lien]) : null;
      if (fichiers.length || lien) {
        h += "<h2 class=\"fr-h5 fr-mt-3w\">" + esc(c.fiche.titreFichiers) + "</h2><ul class=\"ca-fichiers\">";
        fichiers.forEach(function (f) { h += "<li><button type=\"button\" class=\"fr-btn fr-btn--secondary\" data-fichier=\"" + esc(f) + "\">Chargement du fichier…</button></li>"; });
        if (lien) {
          var lib = (c.fiche.libellesLien && sec.colonne && c.fiche.libellesLien[String(enListe(r[sec.colonne])[0])]) || c.fiche.libelleLien;
          h += "<li><a class=\"fr-btn fr-btn--secondary\" href=\"" + esc(lien) + "\" target=\"_blank\" rel=\"noopener noreferrer\" title=\"" + esc(lib) + " - nouvelle fenêtre\">" + esc(lib) + "</a></li>";
        }
        h += "</ul>";
      }
      app.innerHTML = h;
      document.getElementById("ca-retour").addEventListener("click", function (e) { e.preventDefault(); location.hash = ""; });
      document.getElementById("ca-copier").addEventListener("click", function () { copierLien(lienFiche(r)); });
      Array.prototype.forEach.call(app.querySelectorAll("[data-fichier]"), function (b) {
        var fid = b.getAttribute("data-fichier");
        infoPj(fid).then(function (info) {
          var nom = info.fileName || ("Fichier " + fid);
          b.textContent = "Télécharger : " + nom;
          b.addEventListener("click", function () {
            blobDe(fid).then(function (u) {
              var a = document.createElement("a"); a.href = u; a.download = nom;
              document.body.appendChild(a); a.click(); a.remove();
            }).catch(function () { b.textContent = "Téléchargement impossible : " + nom; });
          });
        });
      });
      brancherCarrousel();
      if (pdf) { apercuPdf(r); }
      chargerImages();
      window.scrollTo(0, 0);
      return r;
    }

    /* --- navigation --- */
    var dernierMode = "";
    function rendre() {
      var m = /^#r\/(.+)$/.exec(location.hash);
      var fiche = m ? rendreFiche(decodeURIComponent(m[1])) : null;
      if (!m) { rendreListe(); }
      if (global.PageDSFR) { global.PageDSFR.contextualiser({ titre: fiche ? titre(fiche) : c.titre }); }
      if (opts.titrePage !== false) {
        var titreSite = (c.page && c.page.titre) || c.titre;
        document.title = fiche ? titre(fiche) + " – " + titreSite : c.titre + (titreSite !== c.titre ? " – " + titreSite : "");
      }
      var mode = m ? "fiche" : "liste";
      if (dernierMode && mode !== dernierMode) {
        var t = app.querySelector("h1"); if (t) { t.setAttribute("tabindex", "-1"); try { t.focus({ preventScroll: true }); } catch (e) { /* rien */ } }
      }
      dernierMode = mode;
    }

    app.addEventListener("input", function (ev) {
      if (ev.target.id === "ca-q") { etat.q = ev.target.value; majResultats(); }
    });
    app.addEventListener("change", function (ev) {
      if (ev.target.id === "ca-tri") { etat.tri = ev.target.value; majResultats(); }
    });
    app.addEventListener("click", function (ev) {
      var b = ev.target.closest("button");
      if (!b) { return; }
      if (b.hasAttribute("data-section")) { etat.section = b.getAttribute("data-section"); c.filtres.forEach(function (f) { if (f.dansSection) { delete etat.filtres[f.colonne]; } }); rendreListe(); }
      else if (b.hasAttribute("data-entree")) { var k = b.getAttribute("data-entree"); etat.entree = etat.entree === k ? "" : k; rendreListe(); }
      else if (b.hasAttribute("data-filtre")) {
        var colonne = b.getAttribute("data-filtre"), v = b.getAttribute("data-valeur");
        var f = c.filtres.find(function (x) { return x.colonne === colonne; });
        if (f && f.multiple) { etat.filtres[colonne] = etat.filtres[colonne] || {}; etat.filtres[colonne][v] = !etat.filtres[colonne][v]; }
        else { etat.filtres[colonne] = v; }
        rendreListe();
      }
    });
    window.addEventListener("hashchange", rendre);
    rendre();
    return {
      rendre: rendre,
      detruire: function () { window.removeEventListener("hashchange", rendre); }
    };
  }

  global.Catalogue = {
    NOM_COLONNE_CONFIG: NOM_COLONNE_CONFIG,
    completer: completer,
    analyserLienDocument: analyserLienDocument,
    sourceRest: sourceRest,
    sourceWidget: sourceWidget,
    sourceDemo: sourceDemo,
    monter: monter
  };
})(typeof window !== "undefined" ? window : globalThis);
