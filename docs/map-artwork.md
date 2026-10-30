# Map artwork

Generated with the built-in imagegen tool. Each active catalogue map has one dedicated illustration, mapped by `src/lib/data/map-artworks.json`. Source assets live in `assets/illustrations/maps/`. Map titles are rendered by the UI, never baked into artwork.

## Shared prompt

Create one custom full-bleed 7:8 portrait artwork for Pixel's War. Use `assets/illustrations/small-town.png` as a style reference only. Warm cheerful detailed pixel art, cream houses with red roofs, lush greens, cyan water, dark plum outlines, crisp square pixel clusters, friendly small toy-like units. Elevated three-quarter landscape view. Distinct recognizable geography. No text, letters, logos, UI, frame, watermark or split panels.

## Scene prompts

| Map ID | Asset | Scene |
| --- | --- | --- |
| 1 | neighbor-trouble | Two neighboring village blocks facing across a narrow road, close gardens, small red vehicle and blue infantry. |
| 3 | after-you | A narrow single crossing over a stream, two tiny friendly red and blue jeeps politely waiting at opposite ends, small hamlets on either bank. |
| 5 | wooded-valley | A deep lush wooded valley with a winding road between dense pine forests, small hamlets and a little red jeep dwarfed by trees. |
| 6 | room-please | A crowded compact village where narrow lanes thread between houses, gardens and tiny blue and red vehicles, playful sense of limited room. |
| 7 | are-we-there-yet | A long winding country road stretching toward a distant hamlet across rolling green hills, a tiny blue jeep on a journey. |
| 8 | right-of-way | A distinctive crossroads with a roundabout and a small red jeep and blue jeep approaching from perpendicular streets, village gardens. |
| 9 | keep-your-feet-dry | Marshy riverbanks and grassy paths around multiple bright blue ponds, little footbridges and a tiny infantry unit staying on dry ground. |
| 13 | not-the-shoes | A playful narrow riverside footpath surrounded by shallow streams and stepping stones, small blue infantry beside water, red-roof village beyond. |
| 14 | which-way-across | A braided river with several alternative bridges and small tree-covered islands, a tiny red vehicle considering the different crossings. |
| 15 | water-town | A charming town built around canals, short stone bridges joining blocks of red-roof houses, tiny blue patrol boat under a bridge. |
| 16 | volcanic-lands | Green landscape with rounded dark volcanic hills, ochre rocky slopes and one distant dormant volcanic peak, winding roads and a small red tank. Friendly daylight, no destruction. |
| 18 | long-island-iced-tea | A long slender green island flanked by turquoise water, village and winding road along its spine, blue boat by shore, breezy summer atmosphere. |
| 19 | mountain-hike | Steep green mountains with ochre rock faces and a zigzag road ascending between them, distant village and a little blue infantry hiking. |
| 20 | geneva | A whimsical pixel-art Geneva by Lake Geneva, distinctive tall lake water fountain Jet d'Eau, lakeside promenade, compact cream red-roof city, bridges crossing the Rhone and a tiny blue boat. No labels. |
| 21 | a-long-day | A broad long countryside road passing several villages and fields, tiny red convoy in warm late-afternoon sunlight, layered distant hills. |
| 22 | crossing-paths | Two winding roads crossing among green hills, separated neighborhoods and scattered forests, blue jeep and red infantry on intersecting journeys. |
| 23 | central-park | A large lush central city park with pond, paths and trees framed on all sides by red-roof town blocks, tiny blue jeep on perimeter road. |
| 24 | lake-view | A broad serene blue lake dominates the scene, shoreline homes and wooded hills, a curving lakeside road with a tiny red jeep. |
| 25 | broken-bridge | Two intact stone bridge ends with a clearly missing middle span over a wide river, tiny vehicles stopped safely back, alternate island routes in the distance, peaceful setting. |
| 26 | the-islands | An archipelago of many irregular green islands in vivid turquoise water, small coastal settlements, connecting bridges and a tiny blue boat. |
| 27 | troubled-bridges | Several closely spaced bridges crisscross a branching river between town blocks and woods, tiny opposing red and blue vehicles, complex but cheerful network. |
| 28 | neighbors-square | A compact square of four friendly village blocks around a central grassy square, tidy perpendicular streets and tiny red and blue infantry. |
| 30 | the-little-detour | A U-shaped country road makes a charming detour around a small pond and grove, a tiny red jeep following the bend, village at the far end. |
| 31 | sandbox | An inviting open green practice field with small patches of sand, scattered trees, roads and a few toy-like red and blue vehicles arranged playfully. |
| 35 | gentle-slope | A cozy village descending a gentle green hillside, terraced gardens and a softly sloping lane, small blue infantry and a red jeep near cream houses. |
| 36 | meanders | A prominently sinuous S-shaped river curves repeatedly through lush grass and groves, a few bridges, little blue boat and distant cottages. |
| 37 | between-two-waters | A narrow green land corridor between two separate blue waterways, little town and road squeezed down the middle, bridges leading outward. |
| 38 | bridge-crossroads | A central road bridge crosses a long vertical blue waterway with a second crossing forming a distinctive crossroads, small buildings on banks and a red jeep approaching. |

## Integration

Illustrations load lazily in the map gallery and are excluded from the gameplay sprite preload. New maps without custom artwork use the existing terrain-based fallback until a dedicated illustration is added.
