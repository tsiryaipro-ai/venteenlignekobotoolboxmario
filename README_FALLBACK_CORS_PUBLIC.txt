BOENY NECTAR — VERSION INSPIRÉE DU CHARGEMENT KOBO ROBUSTE FOURNI
=================================================================

OBJECTIF
-------
Cette version n'utilise aucun fichier data.json local.
Pour charger le CMS Kobo, script.js essaie automatiquement :

1. Direct KoboToolbox
2. CorsBridge
3. AllOrigins
4. CORS.lol
5. Proxy privé configuré dans PROXY_BASE_URL, uniquement si les quatre méthodes publiques échouent.

URL CMS utilisée :
https://kf.kobotoolbox.org/api/v2/assets/aRDi7maSxCyYuAT8Pd9JR4/data.json

IMPORTANT SUR LA CONFIDENTIALITÉ
--------------------------------
Aucun token Kobo n'est envoyé à CorsBridge, AllOrigins ou CORS.lol.
Ces proxys publics ne peuvent donc lire le CMS que si les soumissions du projet CMS sont accessibles anonymement.
Les données lues par un proxy public transitent par un service tiers : n'utilisez cette solution que pour le contenu public du site.

COMMANDES CLIENTS
-----------------
La lecture du CMS peut fonctionner sans Cloudflare Worker si le projet CMS est publiquement lisible.
En revanche, l'enregistrement d'une commande dans un projet Kobo privé est une opération authentifiée. La version conserve donc PROXY_BASE_URL comme solution pour l'écriture privée.

Si vous souhaitez n'utiliser aucun proxy privé pour les commandes, il faudra changer l'architecture d'envoi des commandes ou rendre le mécanisme de soumission public de manière compatible avec Kobo/OpenRosa ; ce point doit être testé séparément.

FICHIERS GITHUB À REMPLACER EN PRIORITÉ
---------------------------------------
- script.js
- homeindex.html (si votre version GitHub est plus ancienne que le présent pack)
- style.css si nécessaire

Après remplacement sur GitHub Pages : Ctrl+F5.
