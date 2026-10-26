# Intégration de la nouvelle identité

Branche : ui-update-based-on-figma-redesign.
Source : Figma Pixel’s War, Redesign website, layout 3071:517.

## Incohérences relevées
- Les compteurs Figma 12 / 21 / 122 sont des exemples. Utiliser les données du catalogue. Le troisième compteur devient « Types de terrains » (validé).
- Les cartes, unités et terrains répétés sont des exemples, pas des doublons à publier.
- Les suppressions de la maquette sont intentionnelles : pas de filtres symétrie/mobile, badges, compteur de résultats, résumé de partie, panneau JSON, aides détaillées de l’éditeur ou progression carte par carte dans la homepage. Ne pas les réintroduire dans un menu replié.
- La maquette décrit une sauvegarde des parties en cours. Le format actuel sauvegarde profil et réglages seulement. Ne pas annoncer une capacité absente.
- Les victoires multijoueur ne sont pas enregistrées dans le profil. Les neuf premiers succès sont dérivés des médailles IA ; pas de faux succès en ligne.
- Le tutoriel de la homepage utilise cinq exemples interactifs. La mission existante reste accessible à son ancienne URL, sans ajouter de lien absent de la maquette.
- Les exports de calques avec arrière-plan hérité ne conviennent pas au logo et aux médailles : exporter uniquement leur contenu, avec transparence.
- Les longues traductions et le mobile nécessitent une mise en page fluide, pas une réduction de la maquette entière.

- Le mode miroir actuel exige des dimensions impaires. Le plateau initial utilise donc 25 × 17 cases, de proportions proches du 24 × 16 illustré dans Figma, avec le miroir activé. Les sélecteurs avancent de deux cases dans ce mode et conservent les coordonnées lors du redimensionnement.

## Succès
first-victory, easy-victory, medium-victory, hard-victory, expert-victory,
five-battlefields, ten-battlefields, all-battlefields, map-master.
Les médailles d’anciennes révisions restent dans la sauvegarde mais ne valident pas une carte remaniée.


## Dimensions de référence
Valeurs prises dans Figma, sans réduction proportionnelle globale :
- Navigation : 1 980 px, logo 354 px.
- Galerie : illustrations 280 × 320 px, colonnes 327 px, intervalle 32 px, miniatures contenues dans 183 × 92 px.
- Éditeur : 1 220 px, palette 40 px, sélecteurs −/+ 80 × 40 px.
- Statistiques : 1 400 px, cartes 320 px avec 40 px de marge intérieure, sprites 120–124 px.
- Sections : 120 px d’espace vertical ; titres 48 px, sous-titres 36 px.
Aux largeurs intermédiaires, la galerie défile et les cartes statistiques passent sur moins de colonnes. Sur mobile, les contrôles et colonnes s’empilent, avec une typographie adaptée.

## Contrôle de fidélité et mobile
- Titres : 48/36 px et contour extérieur de 6 px ; titres des cartes : 36 px / 4 px. Les sélecteurs du tutoriel gardent 2 px de contour dans les deux états.
- Tutoriel : cases de 40 px, plateau de 320 px dans une zone de 346 px (cadre et dégagement des sélections), texte 640 px, intervalles 64 px ; encadré avec 40 px de marge intérieure ; boutons communs de 51 px de haut.
- Fiches statistiques : sprites 120 px, lignes de statistiques 40 px, espacement intérieur 8 px. La hauteur peut dépasser la maquette pour les descriptions et bonus réels ; aucune information n’est coupée.
- Succès : médailles contenues dans 60 × 116 px, intervalle de 16 px avant le titre puis 12 px avant la description.
- Mobile : contours adaptés à la taille du texte, cartes du catalogue lisibles avec aperçu de la suivante, balayage natif et recalage en fin de geste. Les commandes tactiles principales mesurent au moins 44 px.
- Les compteurs restent sur trois colonnes compactes ; le tutoriel s’empile et ses sujets passent au-dessus du plateau.
- Le tutoriel utilise `Board`, `BattlefieldViewport` et `Cell`, comme une partie : mêmes sprites, sélections, portées, animations et déplacements tactiles. Seule la taille des cases est fixée à 40 px ; le plateau se déplace horizontalement lorsque la place manque.

## Plateau et fenêtres
- Le plateau et ses fenêtres partagent la palette, les cadres prune de 4 px et les titres pixel avec contour extérieur de 2 px. Les icônes d’action et les boutons primary sont conservés.
- Le tutoriel et les parties utilisent la même preview (`SelectedUnitStrip`) et les mêmes statistiques (`StatsPanel`).
- Les fenêtres défilent sous un en-tête fixe : la fermeture reste accessible, y compris sur petit écran.
- Les préférences audio conservent le volume général, la musique et les voix de sélection indépendantes. Les mêmes contrôles servent à la homepage et au jeu.
- Les coins de sélection de la palette de création mesurent 16 px, au-dessus des éléments voisins.
