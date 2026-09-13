BOENY NECTAR — CORRECTION DE L'ERREUR « Failed to fetch »
=========================================================

CAUSE
-----
Le site GitHub Pages et l'API KoboToolbox sont sur deux domaines différents.
Les serveurs KoboToolbox de production n'autorisent pas l'appel API authentifié
arbitraire directement depuis JavaScript exécuté sur un autre domaine.
Le navigateur bloque donc la requête avant que script.js puisse lire la réponse :
« Failed to fetch ».

Aucun data.json n'est nécessaire.

SOLUTION DE CETTE VERSION
-------------------------
GitHub Pages -> Cloudflare Worker -> KoboToolbox

Le token Kobo reste écrit dans script.js, conformément à votre choix.
Le Worker ne contient pas le token. Il sert uniquement de relais CORS.

ÉTAPE 1 — DÉPLOYER LE WORKER
----------------------------
1. Ouvrez https://dash.cloudflare.com/
2. Workers & Pages -> Create -> Worker.
3. Remplacez le code d'exemple par le contenu de :
   cloudflare-worker-kobo-proxy.js
4. Cliquez sur Deploy.
5. Copiez l'URL obtenue, par exemple :
   https://boeny-kobo-proxy.VOTRE-COMPTE.workers.dev

ÉTAPE 2 — RENSEIGNER L'URL DANS script.js
-----------------------------------------
Au début de script.js, remplacez :

PROXY_BASE_URL: "COLLEZ_ICI_URL_DU_WORKER_CLOUDFLARE"

par l'URL exacte obtenue à l'étape 1.

Exemple :
PROXY_BASE_URL: "https://boeny-kobo-proxy.monsousdomaine.workers.dev"

ÉTAPE 3 — PUBLIER SUR GITHUB
----------------------------
Remplacez dans votre dépôt au minimum :
- homeindex.html
- script.js
- style.css
- email_Javascript.html

Conservez aussi le dossier images/ si vos valeurs Kobo utilisent encore des
chemins locaux ./images/...

ÉTAPE 4 — KOBO
--------------
Importer et déployer les deux XLSForm si ce n'est pas déjà fait :
- Boeny_Nectar_Kobo_CMS_Backend.xlsx
- Boeny_Nectar_Kobo_Commandes.xlsx

Dans le CMS, créez au moins une soumission et mettez publication_status=published.

IMPORTANT
---------
Le token est publiquement visible dans script.js sur GitHub Pages. Toute personne
qui consulte le code source peut le récupérer. Cette version conserve ce choix
parce qu'il a été explicitement demandé.

Le Worker limite volontairement les destinations aux deux domaines Kobo officiels
et aux chemins API/media/soumission nécessaires. Ce n'est donc pas un proxy Web
générique.
