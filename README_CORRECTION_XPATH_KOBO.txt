BOENY NECTAR — CORRECTION XPATH KOBO
====================================

Erreur corrigée :
Invalid XPath in value set action declaration: '+261340903559'

Cause :
pyxform/Kobo peut interpréter certaines valeurs par défaut commençant par '+' ou ressemblant à des expressions comme du XPath dynamique.

Corrections appliquées dans la feuille survey, colonne default :
- cms_version : string('2026-09-13-v2')
- terroir_img_url : string('./images/terroir.jpg')
- seller_mvola_phone : string('+261340903559')
- about_phone : string('+261 34 09 035 59')

Version du formulaire : 2026091302
Le groupe 'meta' reste renommé en 'cms_info'.
Les libellés sont explicitement en Français (fr).

À faire dans KoboToolbox :
1. Ouvrir le projet Boeny Nectar — CMS dynamique du site.
2. Remplacer le formulaire par Boeny_Nectar_Kobo_CMS_Backend.xlsx de ce dossier.
3. Enregistrer la nouvelle version.
4. Cliquer sur DEPLOY.

Si Kobo affiche encore « Langue sans nom », cette mention peut provenir d'une langue héritée d'une version précédente du projet. Le nouveau XLSForm ne contient que des colonnes label::Français (fr) / hint::Français (fr) / constraint_message::Français (fr), et default_language = Français (fr).
