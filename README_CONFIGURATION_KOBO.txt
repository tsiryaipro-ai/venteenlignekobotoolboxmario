BOENY NECTAR — GITHUB PAGES + KOBOTOOLBOX — VERSION CORRIGÉE CORS
================================================================

Cette version N'UTILISE AUCUN data.json local.

ARCHITECTURE
------------
GitHub Pages -> Cloudflare Worker (proxy CORS) -> KoboToolbox

Le token Kobo est conservé directement dans script.js comme demandé.

FICHIERS PRINCIPAUX
-------------------
- homeindex.html
- script.js
- style.css
- email_Javascript.html
- cloudflare-worker-kobo-proxy.js
- Boeny_Nectar_Kobo_CMS_Backend.xlsx
- Boeny_Nectar_Kobo_Commandes.xlsx
- README_CORRECTION_CORS.txt

CONFIGURATION OBLIGATOIRE
-------------------------
1. Déployer cloudflare-worker-kobo-proxy.js dans Cloudflare Workers.
2. Copier l'URL workers.dev.
3. La coller dans script.js à la valeur PROXY_BASE_URL.
4. Importer et déployer les deux XLSForm Kobo.
5. Créer au moins une soumission CMS avec publication_status=published.
6. Publier les fichiers frontend dans GitHub Pages.

Pourquoi le Worker est nécessaire : le navigateur applique CORS et les serveurs
KoboToolbox de production ne permettent pas l'accès API authentifié direct depuis
un domaine GitHub Pages. Un simple changement de fetch(), mode:no-cors ou
Access-Control-Allow-Origin dans le HTML ne peut pas corriger cela côté navigateur.
