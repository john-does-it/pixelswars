# Cartes en brouillon

Les fichiers JSON de `src/lib/data/drafts/` sont des cartes non publiées. Le serveur de développement les découvre automatiquement : aperçu, badge **Brouillon** et lien direct vers l’éditeur. Aucun bouton de partie locale ou contre l’IA n’est affiché sur ces cartes.

- Modifier : `/map-editor/?draft=ID`. Chaque carte conserve ses retouches dans une clé locale séparée. **Recharger la source** permet de repartir du JSON du dépôt, avec annulation possible.
- Tester : utiliser le test intégré à l’éditeur. Les routes techniques `/play/draft-ID/` restent disponibles en développement seulement.
- Exporter le JSON puis remplacer le fichier correspondant. L’export seul ne modifie pas le dépôt et ne publie rien.
- Les brouillons ne donnent pas de médaille et n’écrasent pas la sauvegarde solo publique.

Le module de découverte et la galerie sont chargés uniquement dans une branche `$app/environment.dev`. Les JSON ne sont ni dans `static/`, ni dans le registre public. Le build de production ne contient pas leurs données et ne prérend aucune route de brouillon. Le paramètre d’éditeur `draft` est ignoré en production.

## État du premier lot

Les cartes 28, 29, 30, 31, 35 et 36 ont été approuvées pour le catalogue public. Le catalogue contient désormais 26 cartes proposées, plus les anciennes cartes accessibles par leurs liens historiques.

| ID  | Carte                      | État                 |
| --- | -------------------------- | -------------------- |
| 28  | Le carré des voisins       | Intégrée             |
| 29  | Deux ponts, pas un de plus | Retirée du catalogue |
| 30  | Le petit détour            | Intégrée             |
| 31  | Bac à sable                | Intégrée             |
| 32  | Couloir aérien             | Supprimée            |
| 33  | La grande traversée        | Supprimée            |
| 34  | Port à port                | Supprimée            |
| 35  | En pente douce             | Intégrée             |
| 36  | Les méandres               | Intégrée             |

La carte 36 provient de `board-15 (3).json`, avec un nouvel ID pour préserver la carte publique 15. Les exports (1) et (2) n’ont pas été intégrés. Les versions affinées du Petit détour et d’En pente douce sont symétriques.

Le générateur historique `scripts/generate-draft-maps.mjs` ne recrée ni les cartes publiées ni les trois cartes supprimées. Les ID supprimés restent réservés. Aucun brouillon n’est actuellement en attente.

## Publication après validation

1. Tester les deux camps, les objectifs, l’IA, le transport et la lisibilité sur téléphone. Les tests automatiques ne garantissent pas l’équilibre.
2. Déplacer le JSON validé vers `src/lib/data/`, en conservant son ID.
3. L’enregistrer dans `map-files.json`, le chargement de `/play/[map]`, le catalogue de la home et les noms/descriptions traduits. Les révisions initiales de progression suivent le registre.
4. Générer les caractéristiques et l’aperçu, puis synchroniser les assets.
5. Mettre à jour les tests du catalogue et vérifier que les éventuels brouillons restants sont exclus de la production.

Workflow GitHub : #27. Briefs initiaux : `docs/map-catalog-audit.md` et issues #19 à #26.
