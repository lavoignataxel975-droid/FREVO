# FREVO, site de démonstration (LAVA création)

Restaurant gastronomique fictif, Paris 3e. Site statique multi-pages, Vite + JavaScript natif.

```bash
npm install
npm run dev        # http://localhost:5210  (prévisualisation : /responsive-preview)
npm run build      # dist/, déployable tel quel sur Vercel (vercel.json : URLs propres)
npm run images     # régénère public/img depuis ../Design (fichiers d'origine jamais modifiés)
```

- Pages : `/`, `/menu`, `/events`, `/contact` ; `/responsive-preview` = outil interne (iPhone 16 + tablette), non lié, non indexé.
- Gabarits partagés dans `partials/` (header, navigation, réservation, footer), injectés au build par `vite.config.js`
  (`<include src="…">`, `{{img:…}}`, `{{icon:…}}`).
- Styles : `src/css/base.css` (tokens, typo, animations), `chrome.css` (éléments communs), `home.css`, `pages.css`.
- Réservation (`src/js/reserve.js`) et formulaire de contact : démonstrations locales, rien n'est envoyé.
- Police : Archivo variable (axe de largeur), auto-hébergée. Icônes : Phosphor.
