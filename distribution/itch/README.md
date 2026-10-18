# itch.io launcher

The launcher opens [pixelswar.io](https://pixelswar.io/) in a new tab from itch.io,
or redirects when opened standalone. It contains no game copy, tracking or external
resources. Bundled fonts and licenses keep the upload self-contained.

Build the upload from the repository root in PowerShell:

```powershell
Compress-Archive -LiteralPath distribution/itch/index.html, distribution/itch/fonts -DestinationPath distribution/itch.zip -Force
```

Upload the generated ZIP as an HTML project and select **Click to launch in fullscreen**
and **Mobile friendly**. `index.html` must be at the ZIP root, not inside an `itch/` folder.
The archive is generated locally and should not be committed. Re-upload only when
the launcher, destination or fonts change; normal game releases need no new upload.

Add a direct game link to the description. See [itch.io HTML5 documentation](https://itch.io/docs/creators/html5).
