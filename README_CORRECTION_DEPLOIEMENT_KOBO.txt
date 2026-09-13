CORRECTION DE DEPLOIEMENT KOBO — BOENY NECTAR CMS

Erreur observée :
There are more than one survey elements named 'meta' (case-insensitive).

Corrections appliquées :
1. Le groupe XLSForm nommé « meta » a été renommé « cms_info » pour éviter le conflit avec le nœud interne XForms/OpenRosa <meta>.
2. Les colonnes de langue ont été explicitées en « Français (fr) » afin d’éviter l’affichage simultané « Français (fr), Langue sans nom ».
3. script.js a été mis à jour pour lire les chemins cms_info/... tout en conservant un fallback vers les anciens chemins meta/...

Procédure dans KoboToolbox :
- Ouvrir le projet CMS non déployé.
- Utiliser Remplacer le formulaire / Replace form et sélectionner Boeny_Nectar_Kobo_CMS_Backend.xlsx de ce dossier, ou recréer le projet avec ce fichier.
- Déployer.
- Créer au moins une soumission de configuration avec publication_status = published.
