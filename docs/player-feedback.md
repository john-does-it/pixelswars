# Retours joueurs

Synthèse des captures Discord et Reddit fournies le **13 octobre 2026**. Les retours sont reformulés et regroupés par thème ; les deux captures Discord identiques ne comptent qu'une fois. Les impressions d'équilibrage restent des observations de joueurs, pas des résultats de tests.

## Ce qui plaît

- **Transport et capture en chaîne** — cynthia apprécie de débarquer une première unité pour commencer une capture, puis une seconde pour la terminer. Cela donne une vraie utilité au VTB.
- **Production immédiatement exploitable** — pouvoir produire, déplacer la nouvelle unité, puis produire à nouveau depuis le même bâtiment est particulièrement apprécié (cynthia).
- **Gestion des formations** — le blocage par les unités alliées paraît inhabituel au départ, mais pourrait rendre intéressants les passages dans les lignes, le remplacement des blessés et leur repli vers les soins (cynthia).
- **Bases du jeu prometteuses** — cynthia souligne les bonnes mécaniques ; Taxtengo salue le travail réalisé.
- **Graphismes et jeu sur téléphone** — artemi7 aime le rendu et a pu jouer aux premières cartes sur son téléphone dans de bonnes conditions.

## Interface et compréhension

| Réf.  | Retour                                                                                                             | Source                         | Suite à envisager                                                                                                                       |
| ----- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| UX-01 | Les noms des unités et des bâtiments ont disparu de la preview, ce qui rend leur identification moins évidente.    | cynthia ; échange avec artemi7 | Vérifier la lisibilité des noms et l'accès aux détails, notamment sur mobile. Une réponse Reddit annonce déjà le retour du nom d'unité. |
| UX-02 | Il manque une indication du revenu gagné à chaque tour.                                                            | cynthia                        | Afficher une prévision des revenus à côté du budget.                                                                                    |
| UX-03 | Les allers-retours entre la carte et les boutons d'action sont pénibles ; davantage de raccourcis seraient utiles. | Taxtengo                       | Mieux faire découvrir les raccourcis existants et préciser les actions encore mal couvertes, notamment la sélection d'unités.           |
| UX-04 | Une confirmation de fin de tour pourrait éviter d'oublier des actions.                                             | artemi7                        | Envisager une option désactivable, ou une confirmation seulement si des unités peuvent encore se déplacer ou tirer.                     |
| UX-05 | La production des unités aériennes n'était pas évidente à trouver.                                                 | cynthia                        | Friction de découverte à garder en tête ; le joueur a ensuite trouvé et barré sa remarque. Ce n'est pas un blocage toujours signalé.    |
| UX-06 | Les effets sonores sont jugés étranges et agaçants.                                                                | Taxtengo                       | Identifier les sons concernés avant de les remplacer ou d'ajouter de la variété. La demande de précision reste sans réponse visible.    |

## IA et économie

| Réf.  | Retour                                                                                                                | Source   | Suite à envisager                                                                                                                    |
| ----- | --------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| AI-01 | L'IA experte accumule environ 5 000 tout en produisant peu.                                                           | cynthia  | Vérifier que l'épargne correspond à un achat utile et que les usines disponibles sont exploitées.                                    |
| AI-02 | L'IA semble limitée à une unité produite par tour et par bâtiment, ou économise excessivement, jusqu'à 7 000 et plus. | Taxtengo | Distinguer une limite de production, une usine occupée et une décision d'épargne. Mesurer les achats et l'utilisation des bâtiments. |

Ces deux retours décrivent un problème convergent de dépenses insuffisantes. Ils ne prouvent pas à eux seuls que tous les cas ont la même cause.

**Suivi local au moment de cette synthèse :** la limite de réutilisation d'une usine par l'IA a été retirée ; des plans de production économique, de transport, de contre et d'offensive ont été ajoutés. Voir [le fonctionnement de l'IA](ai.md). Ces changements restent à confronter aux parties des joueurs : leur présence dans le code ne vaut pas confirmation que les signalements sont résolus en production.

## Combat, équilibre et cartes

| Réf.   | Retour                                                                                                                                                 | Source  | Suite à envisager                                                                                                                                       |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BAL-01 | Les chars paraissent trop faibles, notamment en points de vie, par rapport à l'artillerie.                                                             | cynthia | Comparer leur survie, leur coût et leur efficacité contre des compositions variées. Le premier avis est explicitement présenté comme provisoire.        |
| BAL-02 | Le début de partie fonctionne bien, mais les unités semblent mourir trop vite lorsque les armées grossissent.                                          | cynthia | Observer les tirs concentrés, les possibilités de retrait et l'intérêt réel des soins en milieu et fin de partie.                                       |
| BAL-03 | Une économie abondante pourrait favoriser une composition presque entièrement composée d'artillerie.                                                   | cynthia | Vérifier si les chars et les autres unités conservent un rôle rentable en fin de partie, particulièrement en PvP.                                       |
| BAL-04 | Déplacer puis faire tirer les unités indirectes dans le même tour leur donne un fort avantage et facilite le harcèlement à distance.                   | Banjo   | Évaluer les contreparties possibles : dégâts, coût, résistance et possibilités de les rattraper.                                                        |
| BAL-05 | La portée des unités indirectes paraît étrange : les distances accessibles diffèrent entre les axes et les diagonales.                                 | Banjo   | Clarifier la géométrie attendue et son affichage. Le développeur demande si la remarque concerne une portée carrée ; aucune confirmation n'est visible. |
| MAP-01 | Les bâtiments sont très spécialisés : soins à l'hôpital, revenus séparés des bases de production. Les cartes ouvertes pourraient manquer de bâtiments. | cynthia | Évaluer leur densité et leur répartition sur plusieurs types de cartes. La carte en couloir jouée semblait convenir.                                    |
| MOV-01 | L'impossibilité de traverser ses propres unités surprend, même si elle ouvre des possibilités tactiques.                                               | cynthia | Expliquer cette règle et examiner séparément le cas des unités aériennes.                                                                               |

**Pistes proposées par le joueur, sans décision prise :** augmenter les PV de certaines unités, ou attribuer un gain de PV après une élimination (cynthia). Elles répondent au ressenti de fragilité, mais ne constituent pas des solutions validées.

cynthia préfère s'appuyer sur le **joueur contre joueur** pour juger l'équilibrage, plutôt que sur des parties contre une IA encore peu efficace.

## Idées de contenu

| Réf.   | Suggestion                                                                           | Source                                           | Position exprimée dans les échanges                                                                                                               |
| ------ | ------------------------------------------------------------------------------------ | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| NEW-01 | Ajouter des unités navales.                                                          | Taxtengo ; attente également évoquée par artemi7 | Le développeur les annonce sur la roadmap. Aucun calendrier n'est donné.                                                                          |
| NEW-02 | Ajouter des voies ferrées permettant des transports rapides entre des gares.         | Taxtengo                                         | Idée accueillie favorablement, à étudier.                                                                                                         |
| NEW-03 | Ajouter des barrières destructibles qui ferment un passage jusqu'à leur destruction. | artemi7                                          | Suggestion permettant de créer des zones fermées sur les cartes. Aucune décision visible.                                                         |
| NEW-04 | Examiner une version retravaillée du même sprite sheet.                              | Taxtengo                                         | Ressource proposée : [Tiny Battle Revisions](https://taxtengo.itch.io/tiny-battle-revisions). Proposition d'assets, pas décision de remplacement. |

## Réponses et intentions du développeur

Ces éléments proviennent des réponses visibles dans les captures ; ils sont distincts des demandes des joueurs et ne garantissent pas un état de livraison actuel.

- **Artillerie :** conserver la possibilité de se déplacer et de tirer durant le même tour. Ajuster plutôt l'efficacité, la résistance ou les coûts si nécessaire.
- **Déplacement :** le blocage par les unités alliées est volontaire. Une éventuelle exception pour les unités aériennes est évoquée.
- **Production :** les actions immédiates des unités produites et la réutilisation d'un bâtiment libéré sont volontaires.
- **Dégâts :** ils dépendent des PV de l'unité attaquante ; des ajustements d'équilibrage sont évoqués, sans résultat définitif annoncé dans ces échanges.
- **Détails et raccourcis :** rappel de l'inspection avec **I**, de la navigation au clavier, d'**Entrée** pour confirmer, d'**Échap** pour annuler, d'**Espace** pour capturer et de **T** pour ouvrir les passagers d'un transport.
- **Visibilité :** agrandissement des sprites d'un facteur **1,25** et prévision de revenus évoqués dans la réponse Discord. Le retour du nom d'unité est annoncé dans la réponse Reddit.
- **Fin de tour :** si une confirmation est ajoutée, le développeur souhaite qu'elle reste optionnelle pour éviter les interruptions répétitives.
- **Audio et portée :** des précisions ont été demandées ; les réponses ne figurent pas dans les captures.

## Suivi proposé

Ordre de travail suggéré par cette synthèse, sans engagement de livraison :

1. **Valider les dépenses de l'IA en situation réelle**, avec suivi des revenus, achats, budgets inutilisés et usines bloquées.
2. **Rendre l'économie et les commandes plus lisibles** : revenu par tour, noms accessibles et raccourcis faciles à découvrir.
3. **Comparer chars et artillerie en PvP**, à plusieurs niveaux de richesse et sur des cartes ouvertes ou en couloir, avant de modifier globalement les PV.
4. **Clarifier les retours incomplets** sur la portée et les effets sonores.
5. **Étudier les nouvelles mécaniques séparément** : confirmation de fin de tour, barrières, naval et chemins de fer.

## Sources

Seules les captures fournies ont été utilisées ; les messages hors écran et les réponses repliées ne sont pas inclus. Les dates relatives Reddit ne permettent pas de dater précisément chaque commentaire.

- **Discord — EL_Famoso_Dodo, `#hors-sujet` :** cynthia, Banjo et avrelTwo.js. Un séparateur du 13 octobre 2026 est visible. Captures `codex-clipboard-7d4c3e18-8518-4a15-830d-258e98c003a6.png` et `codex-clipboard-8ec07256-39c3-4596-88be-445adf570725.png` (doublon).
- **Reddit — r/advancewars :** Taxtengo et réponse d'avreljs. Capture `codex-clipboard-d6604a43-1ddb-4324-abc3-0007f6cebcae.png`.
- **Reddit — r/advancewars :** artemi7 et réponse d'avreljs. Capture `codex-clipboard-95c99e28-502b-4ca9-91a5-d886bfe57132.png`.
