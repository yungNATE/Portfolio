---
titre: "Refonte des portails médiathèque Drupal"
sousTitre: "Modernisation UI et réduction de la dette technique sur les portails clients d'un éditeur de SIGB"
client: "Tech'Advantage (TAD)"
confidentiel: false
typeProjet: salarie
categorie:
  - web-app
  - accessibilite
statut: termine
dateDebut: "2024-09"
dateFin: "2026-01"
duree: "~16 mois (stage + CDD)"

resume: "Audit, refonte et modernisation des portails Drupal proposés aux médiathèques clientes de Tech'Advantage, avec une remontée de la conformité RGAA à 75%+ et une forte réduction de la dette technique."

contexte: "Tech'Advantage édite Syrtis, un SIGB pour médiathèques, et propose à ses clients des portails web en Drupal connectés au SIGB (compte médiathèque, recherche documentaire, listes...). Ces portails étaient anciens (Drupal 9 et antérieur), avec une UI vieillissante, des fonctionnalités inutilisées et un fort legacy. Chaque portail étant relativement custom malgré une base commune, leur création et leur maintenance coûtaient cher."

objectifs:
  - "Permettre à l'équipe de 3 développeurs portails d'absorber l'ensemble des tickets sans recruter"
  - "Réduire la dette technique en uniformisant les portails sur un thème de référence commun"
  - "Moderniser l'UI des portails clients"

cible: "Usagers et public des médiathèques (portail grand public), connecté au SIGB Syrtis"

monRole: "Audit des maquettes existantes (« dynamisation ») en itération avec la designeuse externe pour anticiper les contenus dynamiques gérés par les clients. Création de composants et fragments de page à la volée pour les besoins non anticipés, sans repasser par la designeuse. Développement et correction de bugs sur le legacy : intégration de maquettes front (Vanilla JS/Drupal), modifications profondes du back Drupal, interventions ponctuelles sur Syrtis (Spring) et sur les portails « pro » (Angular). Support front/design ponctuel pour les développeurs « pro », plus orientés back (tips, création d'icônes custom)."

equipe:
  taille: 3
  composition: "Équipe portails de 3 développeurs (dont moi), avec Gérald Poncon (lead dev senior, webmaster, forte connaissance historique du projet) et Émilie Bugat (développeuse senior). Écosystème plus large : ~10 développeurs sur les portails « pro »/Syrtis, 20 à 30 personnes sur l'ensemble du projet médiathèque, dans une société de 80-90 personnes (filiale de l'IFPEN)."

contraintes:
  - "Fort legacy sur Drupal 9 et antérieur"
  - "UI vieillissante et fonctionnalités inutilisées"
  - "Peu de documentation sur le projet Syrtis dans son ensemble (projet très ramifié)"
  - "Turnover élevé côté équipe, peu d'experts du legacy en interne"
  - "Plusieurs versions d'une même librairie importées pour coller aux besoins spécifiques de chaque client"

processus:
  - "Audit des maquettes existantes avec la designeuse pour identifier les failles techniques"
  - "Anticipation des cas de contenu dynamique (ex: titres trop longs) grâce à un profil hybride dev/UX/CMS"
  - "Création de composants à la volée pour les besoins spécifiques ou non anticipés"
  - "Développement et correction de bugs sur le legacy Drupal, Vanilla JS, et ponctuellement Angular/Spring"
  - "Support ponctuel front/design aux développeurs « pro »"

defis:
  - "Intervenir dans du code Angular sans connaître le framework"
  - "Travailler sur du legacy Drupal avec des ressources limitées"
  - "Naviguer un projet Syrtis très ramifié, avec peu ou pas de documentation globale"
  - "Plusieurs couches historiques du produit"
  - "Des fonctionnalités développées uniquement pour 1 ou 2 clients spécifiques"
  - "Plusieurs versions d'une même librairie importées pour coller à tous les portails"

solutions:
  - "Montée en compétence sur Angular par reverse-engineering direct du code" # à confirmer/ajuster
  - "Création d'un thème de référence commun pour réduire la dette technique et l'hétérogénéité entre portails"
  - "Documentation informelle capitalisée au fil des interventions pour pallier le manque de doc et le turnover" # à confirmer/ajuster

resultats:
  - label: "Impact"
    valeur: "Gain progressif de capacité pour l'équipe de 3 devs à absorber les tickets sans recrutement ; effets mesurables attendus à moyen/long terme"

apprentissages:
  - "Un projet en dette technique n'a pas besoin de métriques pour justifier une refonte : la remise à plat est une question de temps, pas de preuve."
  - "Naviguer un legacy multi-couches sans documentation développe une vraie capacité de reverse-engineering rapide."

stackTechnique:
  - "Drupal 9/10"
  - "Twig"
  - "PHP"
  - "Vanilla JS"
  - "AngularJS (legacy, ponctuel)"
  - "Spring/Java (Syrtis, ponctuel)"
  - "RGAA/WCAG"

accessibilite:
  niveau: "75%+ de conformité RGAA"
  details: "Audits et corrections d'accessibilité menés sur les portails Drupal"

liens:
  demo: "https://mediathequeslefil.cctdm.fr/"
  sitesExemples:
    - label: "Médiathèques Le Fil (portail courant)"
      url: "https://mediathequeslefil.cctdm.fr/"
    - label: "Astrolabe Grand Figeac (portail spécial, encore custom)"
      url: "https://www.astrolabe-grand-figeac.fr/"

competencesMobilisees:
  - "RGAA / WCAG"
  - "Drupal / Twig"
  - "Refactorisation de legacy"
  - "Audit UX/technique de maquettes"

# Exemple de composant (modale d'ajout à une liste, présente sur l'ensemble des portails) — nécessite d'être connecté pour voir le proto
maquettesFigma: "https://www.figma.com/proto/x3Vu49mrlNdua0tDjoLtru/Divers-TAD?node-id=197-1390&starting-point-node-id=197%3A789"

tags:
  - "Drupal"
  - "RGAA"
  - "Legacy"
  - "CMS"
  - "PHP"
  - "AngularJS"

niveauImportance: phare

visible: false # repasse à true une fois les visuels ajoutés
---

Portail des médiathèques clientes de Tech'Advantage, connecté au SIGB Syrtis.
