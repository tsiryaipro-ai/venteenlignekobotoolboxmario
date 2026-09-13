BOENY NECTAR — URL CMS KOBO INTÉGRÉE
=====================================

URL Kobo fournie :
https://kf.kobotoolbox.org/api/v2/assets/aRDi7maSxCyYuAT8Pd9JR4/data.json

UID CMS : aRDi7maSxCyYuAT8Pd9JR4

Cette version de script.js :
- n'utilise aucun fichier data.json local ;
- tente d'abord de lire directement l'URL Kobo CMS fournie ;
- accepte un retour Kobo sous forme de tableau JSON ou {results:[...]};
- utilise le proxy Cloudflare uniquement en secours pour la lecture CMS si CORS/projet privé bloque l'accès direct ;
- conserve le proxy pour les opérations privées/authentifiées comme l'enregistrement des commandes.

IMPORTANT :
Si l'URL data.json s'ouvre dans votre navigateur sans demander de connexion ET que Kobo autorise CORS pour cette ressource, l'affichage du site peut fonctionner sans Cloudflare.
Si GitHub Pages affiche encore une erreur CORS, le proxy reste nécessaire pour cette lecture.
