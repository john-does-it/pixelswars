# Validation des dépenses de l’IA

Validation locale du 18 octobre 2026, avant publication.

## Méthode

Le script scripts/audit-ai-economy.mjs joue l’IA Expert bleue contre l’IA moyenne rouge avec le contrôleur du jeu. Il journalise le budget avant/après, le revenu prévu, les bâtiments occupés, le plan de recrutement et chaque achat avec son bâtiment. Il vérifie que la somme des achats correspond exactement au budget débité.

Commande : node --experimental-strip-types scripts/audit-ai-economy.mjs 16 13 15 24

La limite porte sur 16 tours individuels, soit 8 tours par camp. Les préférences de recrutement sont initialisées par une graine liée à la carte. Le moteur conserve son budget de recherche temporel, donc les décisions peuvent varier selon la machine.

## Résultats observés

| Carte          | Achats Expert | Dépenses | Solde maximal en fin de tour | Plusieurs achats depuis une même usine |
| -------------- | ------------: | -------: | ---------------------------: | -------------------------------------- |
| Not the Shoes! |             3 |      800 |                         1000 | Non nécessaire dans ce parcours        |
| Water Town     |             8 |     3100 |                          900 | Tours 7 et 11                          |
| Lake View      |            14 |     7200 |                          400 | Tours 7 et 15                          |

Sur Lake View, l’IA conserve 400 au tour 3 pour acheter un antiaérien à 1000 au tour 5. Au tour 15 elle effectue six achats, dont quatre dans la même usine, et termine avec 0. Sur Not the Shoes!, elle finit par vaincre au tour 15 avec 1000 restants. Un solde non dépensé ne signale donc pas nécessairement un blocage.

Les 52 tests ciblés des plans de production, de la progression Expert, du budget de recherche et du profil passent. Ils couvrent notamment la réutilisation d’une usine aux quatre difficultés, les sites occupés, l’annulation d’une épargne devenue inutile, le plafond de deux rentrées de revenu et les achats d’urgence.

Ces parcours valident les cas signalés dans AI-01 et AI-02 sans prétendre démontrer l’équilibrage de toutes les cartes ou le comportement de toutes les parties. Aucun plafond d’un achat par usine n’a été observé.
