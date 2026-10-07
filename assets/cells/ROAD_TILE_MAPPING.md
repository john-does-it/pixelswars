# Road sprite connections

Roads use the existing horizontal, vertical, corner and end-cap artwork. Additional
SVG variants rotate the original corner/end sprites without rotating units or
overlays. The four T junctions extend the existing crossroads SVG and its palette.
All sprites are self-contained so the board, minimap and generated thumbnails use
the same artwork.

Directions below describe **open road exits**, not the location of the curb.

| Cell classes after `-road` | Open exits |
| --- | --- |
| `-h` | East, west |
| `-v` | North, south |
| `-bridge -h` | East, west (bridge) |
| `-bridge -v` | North, south (bridge) |
| `-cross` | All four |
| `-corner -top` | North, east |
| `-corner -bottom` | South, west |
| `-corner -nw` | North, west |
| `-corner -se` | East, south |
| `-junction -north` | North, east, west |
| `-junction -east` | North, east, south |
| `-junction -south` | East, south, west |
| `-junction -west` | North, south, west |
| `-endtop` | South |
| `-endbottom` | North |
| `-endleft` | East |
| `-endright` | West |

Keep each opening connected to an adjacent road or the map boundary. Buildings
remain separate terrain cells, with access roads beside them. The map tests check
road connectivity, sprite orientation and building access on maps 7, 11 and 12.

Bridges are straight road variants. The horizontal SVG contains the original 16 × 16 pixel artwork with nearest-neighbor
scaling; the vertical SVG rotates it without rotating units or indicators.
The editor preserves their selected axis and keeps water open beside the bridge.

After changing a map, regenerate its thumbnail against the dev server:

```sh
npm run generate:map-previews
```
