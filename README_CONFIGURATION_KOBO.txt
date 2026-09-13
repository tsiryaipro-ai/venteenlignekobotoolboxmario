BOENY NECTAR — VERSION GITHUB PAGES + KOBOTOOLBOX
==================================================

Cette version N'UTILISE PLUS data.json comme backend local.

FICHIERS PRINCIPAUX
-------------------
- homeindex.html : page d'accueil dynamique
- script.js : connexion directe à KoboToolbox
- style.css : styles actuels
- email_Javascript.html : page email existante
- Boeny_Nectar_Kobo_CMS_Backend.xlsx : contenu dynamique/CMS du site
- Boeny_Nectar_Kobo_Commandes.xlsx : commandes clients

1) IMPORTER LES FORMULAIRES DANS KOBOTOOLBOX
---------------------------------------------
Importer et déployer :
- Boeny_Nectar_Kobo_CMS_Backend.xlsx
- Boeny_Nectar_Kobo_Commandes.xlsx

2) RENSEIGNER LE TOKEN DANS script.js
-------------------------------------
Au début de script.js :

TOKEN: "COLLEZ_ICI_VOTRE_TOKEN_KOBO"

Remplacez uniquement le texte entre guillemets par votre vrai token.

ATTENTION : GitHub Pages est public. Le token sera donc publiquement visible.
Cette configuration est conservée parce qu'elle a été explicitement demandée.
Il est recommandé d'utiliser un token/compte ayant uniquement les permissions
nécessaires aux deux projets Boeny Nectar.

3) ASSET UID : DÉTECTION AUTOMATIQUE
------------------------------------
Le script cherche automatiquement ces deux noms de projet :
- Boeny Nectar — CMS dynamique du site
- Boeny Nectar — Commandes clients

Si vous renommez les projets, modifiez CMS_PROJECT_NAME et ORDERS_PROJECT_NAME.
Vous pouvez aussi renseigner directement CMS_ASSET_UID et ORDERS_ASSET_UID.

4) CRÉER LA CONFIGURATION DU SITE DANS LE CMS KOBO
---------------------------------------------------
Dans le projet CMS, soumettez au moins une configuration.
Mettez le champ publication_status à : published
Le frontend choisit la soumission publiée ayant le _id le plus élevé.

5) IMAGES
---------
Le CMS accepte :
- un chemin/URL (ex. ./images/baobab.jpg)
- ou une image téléversée dans Kobo.
Le script sait charger les pièces jointes Kobo avec le token.

6) COMMANDES
------------
Avant d'ouvrir WhatsApp/Email/SMS/etc., le navigateur tente d'enregistrer la
commande dans le formulaire Kobo « Commandes clients » via OpenRosa /submission.
En cas d'échec, le canal externe n'est pas ouvert afin d'éviter une commande
envoyée au vendeur mais absente de Kobo.

7) GITHUB
---------
Conservez votre dossier images/ existant si vos champs CMS utilisent encore des
chemins comme ./images/baobab.jpg. Aucun data.json n'est nécessaire.

LIMITATION IMPORTANTE
---------------------
Un token placé dans un JavaScript GitHub Pages n'est pas secret. De plus, selon
la politique CORS appliquée par le serveur Kobo, certaines requêtes directes du
navigateur peuvent être refusées. Dans ce cas, une couche proxy/backend sera
nécessaire, même si le code et les formulaires Kobo restent identiques.
