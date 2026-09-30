# itch.io launcher

Upload [`../itch.zip`](../itch.zip) as an HTML project and mark it as the file to play in the browser.
Select **Click to launch in fullscreen** and **Mobile friendly** in the embed options.

The ZIP contains `index.html` at its root and a `fonts` folder with the game's fonts and their licenses.
The title uses Pixelify Sans. Body text and the button use IBM Plex Mono, in regular and bold weights.
It does not contain a copy of the game.
Inside itch.io, a Play button opens the GitHub Pages game in a new tab. When opened as a
standalone page, the launcher redirects automatically. The link also works without JavaScript.

Fullscreen is still an iframe, so this deliberately avoids automatically navigating that iframe
to the game. The game continues to be deployed exclusively through GitHub Pages. Add a direct
link to https://pixelswar.io/ in the itch.io description as an additional entry point.

The launcher has no dependencies, tracking, cookies, or external resources. No new upload is
needed for ordinary game updates, only if the destination URL or launcher itself changes.

To rebuild the ZIP from the repository root in PowerShell:

```powershell
New-Item -ItemType Directory -Path distribution/itch/fonts/ibm-plex-mono -Force | Out-Null
Copy-Item src/lib/fonts/PixelifySans.ttf, src/lib/fonts/OFL.txt distribution/itch/fonts/ -Force
Copy-Item src/lib/fonts/ibm-plex-mono/Regular.ttf, src/lib/fonts/ibm-plex-mono/Bold.ttf, src/lib/fonts/ibm-plex-mono/OFL.txt distribution/itch/fonts/ibm-plex-mono/ -Force
Compress-Archive -LiteralPath distribution/itch/index.html, distribution/itch/fonts -DestinationPath distribution/itch.zip -Force
```

Do not ZIP the enclosing `itch` directory. The entry point must be `index.html`, not `itch/index.html`.
Refresh the archive after changing the HTML or bundled fonts.

The [650 × 500 cover](../../docs/artwork/pixels-war-cover-650x500.png) and
[wide banner](../../docs/artwork/pixels-war-banner.png) are available for the project page.

Reference: https://itch.io/docs/creators/html5
