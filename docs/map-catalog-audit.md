# Audit du catalogue de cartes — 18 octobre 2026

## Périmètre et méthode

Inventaire des **21 cartes proposées**, après retrait du catalogue des ID 2, 4, 10, 11, 12 et 17. Les anciens liens et sauvegardes restent compatibles ; les ID ne sont pas réutilisés.

Données tirées des fichiers de cartes, de leurs dimensions et des caractéristiques générées. Les unités comptent les deux camps. Le pourcentage d’eau compte les cases dont le terrain jouable est l’eau, pas les ponts routiers. Le tag de symétrie vérifie terrain, bâtiments et déploiements ; il ne prouve pas à lui seul l’équilibre d’une partie. Cet audit rapide ne mesure ni les taux de victoire, ni la durée des parties, ni les temps d’IA.

Le tag mobile correspond à des cases d’au moins 32 px dans une zone de jeu portrait de référence de 320 × 480 px. Un aéroport indique une possibilité de production aérienne, pas nécessairement des avions au départ.

## Répartition actuelle

| Taille | Nombre | Part approximative |
| ------ | -----: | -----------------: |
| XXS    |      1 |                5 % |
| XS     |      1 |                5 % |
| S      |      5 |               24 % |
| M      |      3 |               14 % |
| L      |      3 |               14 % |
| XL     |      1 |                5 % |
| XXL    |      7 |               33 % |

- **14 paysages, 5 carrés, seulement 2 portraits.**
- **4 cartes adaptées au mobile** : Entre voisins, Un peu de place, Priorité à droite et Pas les bottes !
- **7 cartes symétriques**, mais une seule combine symétrie et mobile : Pas les bottes !
- **2 cartes avec des navires au départ**, Les Îles et Ponts de discorde, toutes deux XXL. Pont brisé ajoute des bases navales, également en XXL.
- **6 cartes avec des unités aériennes au départ**, toutes de taille L ou supérieure. Plusieurs petites cartes ont néanmoins des aéroports.

Le manque prioritaire est donc une offre compacte, verticale et variée. Ajouter encore de grandes cartes terrestres ne comblerait pas ce manque. Une répartition homogène ne nécessite pas un nombre strictement identique de cartes dans chaque taille.

## Inventaire

| ID  | Carte                 | Dimensions | Taille | Orientation | Mobile | Symétrique | Unités |  Eau | Air / naval au départ |
| --- | --------------------- | ---------- | ------ | ----------- | ------ | ---------- | -----: | ---: | --------------------- |
| 1   | Entre voisins         | 8 × 8      | XXS    | Carré       | Oui    | Non        |     10 |  3 % | 0 / 0                 |
| 3   | Après vous            | 11 × 11    | M      | Carré       | Non    | Non        |     10 |  1 % | 0 / 0                 |
| 5   | La Vallée Boisée      | 12 × 9     | S      | Paysage     | Non    | Non        |     12 |  6 % | 0 / 0                 |
| 6   | Un peu de place       | 9 × 11     | S      | Portrait    | Oui    | Non        |     10 |  6 % | 0 / 0                 |
| 7   | Bientôt arrivés ?     | 16 × 7     | S      | Paysage     | Non    | Non        |     10 |  0 % | 0 / 0                 |
| 8   | Priorité à droite     | 10 × 13    | M      | Portrait    | Oui    | Non        |     10 |  0 % | 0 / 0                 |
| 9   | Les pieds au sec      | 12 × 10    | S      | Paysage     | Non    | Non        |     10 | 26 % | 0 / 0                 |
| 13  | Pas les bottes !      | 10 × 8     | XS     | Paysage     | Oui    | Oui        |     10 | 20 % | 0 / 0                 |
| 14  | On passe où ?         | 12 × 12    | M      | Carré       | Non    | Non        |     14 | 15 % | 0 / 0                 |
| 15  | Ville d’eau           | 14 × 7     | S      | Paysage     | Non    | Non        |      8 | 27 % | 0 / 0                 |
| 16  | Terres volcaniques    | 13 × 13    | L      | Carré       | Non    | Non        |     20 | 19 % | 2 / 0                 |
| 18  | Long Island Iced Tea  | 24 × 16    | XXL    | Paysage     | Non    | Non        |     12 | 47 % | 0 / 0                 |
| 19  | Randonnée en montagne | 24 × 12    | XXL    | Paysage     | Non    | Non        |      8 | 40 % | 0 / 0                 |
| 20  | Genève                | 24 × 12    | XXL    | Paysage     | Non    | Non        |     16 | 26 % | 0 / 0                 |
| 21  | Une longue journée    | 31 × 11    | XXL    | Paysage     | Non    | Oui        |     36 | 22 % | 8 / 0                 |
| 22  | On se croisera        | 21 × 11    | XL     | Paysage     | Non    | Oui        |     22 | 19 % | 4 / 0                 |
| 23  | Central Park          | 17 × 11    | L      | Paysage     | Non    | Oui        |     44 |  0 % | 8 / 0                 |
| 24  | Vue sur le lac        | 17 × 11    | L      | Paysage     | Non    | Oui        |     24 | 37 % | 4 / 0                 |
| 25  | Pont brisé            | 24 × 16    | XXL    | Paysage     | Non    | Non        |     14 | 31 % | 0 / 0                 |
| 26  | Les Îles              | 31 × 23    | XXL    | Paysage     | Non    | Oui        |     30 | 56 % | 4 / 6                 |
| 27  | Ponts de discorde     | 17 × 17    | XXL    | Carré       | Non    | Oui        |     34 | 51 % | 0 / 4                 |

## Liste de cartes à créer

Noms de travail et briefs de conception. Après affinage, les ID 28–31 et 35 ont été intégrés au catalogue, ainsi que Les méandres (36). Les propositions 32–34 ont été supprimées. Deux ponts, pas un de plus (29) a ensuite été retirée du catalogue. Le catalogue compte maintenant 26 cartes ; les chiffres de l’audit ci-dessus décrivent le catalogue initial. Suivi : issues #19 à #26. Voir [le workflow des brouillons](draft-maps.md) pour les tester et les affiner.

P1 = première vague ; P2 = diversification ; P3 = après retour des joueurs. Difficulté estimée pour la conception et la validation de la carte avec les mécaniques actuelles, sans nouveau code moteur ni nouveaux sprites.

| Priorité | Nom de travail             | Format                  | Tags visés         | Concept et déploiement initial proposé                                                                                                                                        | Plus-value                                                                                                                    | Difficulté |
| -------- | -------------------------- | ----------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------- |
| P1       | Le carré des voisins       | 8 × 8 · XXS · carré     | Symétrique, mobile | Deux rues contournent un petit centre neutre. Par camp : deux infanteries et une jeep ; une usine et un hôpital accessibles.                                                  | Une deuxième très petite carte, réellement symétrique, avec plusieurs approches plutôt qu’un couloir unique.                  | Faible     |
| P1       | Deux ponts, pas un de plus | 8 × 10 · XS · portrait  | Symétrique, mobile | Rivière transversale avec deux ponts éloignés. Par camp : deux infanteries, une jeep et un char. Objectifs répartis pour rendre les deux passages utiles.                     | Un premier duel vertical compact à deux fronts.                                                                               | Moyenne    |
| P1       | Le petit détour            | 7 × 11 · XS · portrait  | Mobile             | Vallon et route en lacet ; trajet court coûteux contre détour routier. Trois unités terrestres par camp, objectifs à temps d’accès comparables malgré un terrain asymétrique. | Rend le choix de trajet intéressant sur un petit écran, sans surcharge d’unités.                                              | Moyenne    |
| P1       | Bac à sable                | 9 × 13 · S · portrait   | Symétrique, mobile | Deux rives, une petite île et un passage naval. Par camp : deux infanteries, un transport naval et un navire de combat. Bases navales accessibles.                            | Première entrée navale compacte ; apprend transport et débarquement dans une vraie partie libre.                              | Élevée     |
| P2       | Couloir aérien             | 10 × 15 · M · portrait  | Symétrique, mobile | Deux axes terrestres séparés par du relief. Par camp : trois infanteries, un hélicoptère et un antiaérien. Aéroports et usines donnent des possibilités de remplacement.      | Bataille interarmes lisible sur mobile ; aucune armée ne dépend d’un unique hélicoptère.                                      | Élevée     |
| P2       | La grande traversée        | 14 × 18 · XL · portrait | Symétrique         | Trois axes reliés par des routes latérales ; environ six unités terrestres par camp. Revenus répartis et positions de production éloignées des premières lignes.              | Comble le manque de XL et de grandes cartes verticales. Ne pas lui attribuer le tag mobile : 14 colonnes restent trop larges. | Moyenne    |
| P2       | Port à port                | 16 × 16 · XL · carré    | Symétrique         | Deux ports, un accès terrestre et des voies maritimes alternatives. Infanterie, blindé, transport et navire de combat ; environ six unités par camp.                          | Une bataille navale de taille intermédiaire, avant les archipels XXL.                                                         | Élevée     |
| P3       | En pente douce             | 7 × 9 · XXS · portrait  | Mobile             | Petites hauteurs, forêts et route centrale avec un détour. Trois unités par camp ; positions asymétriques mais objectifs et revenus comparables.                              | Une troisième carte très courte ; variété de terrain sans ajouter une vaste carte à montagnes.                                | Moyenne    |

### Ordre conseillé

1. Créer les trois premières cartes terrestres et les tester : elles apportent le plus vite des options XXS/XS et portrait.
2. Prototyper **Bac à sable**, puis vérifier que le format compact n’empêche pas les transports de se croiser ou de débarquer.
3. Ajouter **Couloir aérien**, puis les deux XL après validation des temps de partie.
4. Garder **En pente douce** pour une seconde vague, selon les retours sur les petits terrains asymétriques.

Après ces huit ajouts : **29 cartes**, avec XXS 3, XS 3, S 6, M 4, L 3, XL 3 et XXL 7. Les portraits passeraient de **2 à 8**, et les cartes mobile friendly de **4 à 10** si leurs dimensions restent celles prévues. Ne pas créer de nouvelle XXL dans cette vague. La seule nouvelle S répond à un manque de gameplay naval, pas à un manque de petites cartes terrestres.

## Critères de validation avant publication

- Recalculer les tags depuis les données réelles ; ne pas attribuer « Symétrique » manuellement pour compenser une asymétrie.
- Vérifier toutes les cases de déploiement et les routes vers les objectifs. Éviter les unités bloquées au départ, sauf si un embarquement immédiatement possible est intentionnel.
- Sur les formats compacts : pas de tir initial involontaire entre les armées ; vérifier les portées de sniper, d’artillerie et les bonus de montagne.
- Pour le naval : zones de débarquement libres, itinéraires utilisables avec ponts occupés, aucun arrêt sous un pont, aucun camp isolé après la perte d’un seul transport.
- Pour l’aérien : moyens antiaériens des deux côtés et possibilité de continuer la partie après la perte de l’unité aérienne initiale.
- Jouer les deux camps et mesurer les tours nécessaires pour atteindre ville, usine et front. La symétrie géométrique ne remplace pas ces essais.
- Tester au moins sur des écrans portrait de 320 et 390 px, avec une unité sélectionnée et les commandes visibles ; le tag mobile reste une estimation à confirmer visuellement.
- Lancer plusieurs parties IA à différents niveaux pour repérer congestion, achats impossibles et objectifs inaccessibles. Réserver les simulations longues aux finalistes.

## Suite proposée

Transformer chaque ligne retenue en brief de carte avec objectifs, contraintes et critères d’acceptation. Cet audit n’a créé ni carte de jeu supplémentaire ni ticket GitHub : il fournit la liste à prioriser avant génération.
