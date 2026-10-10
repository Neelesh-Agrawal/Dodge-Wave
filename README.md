# Dodge Me

An eight-pilot browser flight race through a twisting glass-roofed space tunnel beneath a black hole. Steer through openings, dodge rocks and beams, collect blue rings and use nitro to overtake. The 12 km race has no countdown.

## Play locally

Serve this folder with any static HTTP server, then open index.html. For example:

```sh
python -m http.server 8771
```

Use WASD or arrow keys to steer, Space to activate charged nitro, and Escape/P to pause. On a phone, drag on the game and tap the nitro flame. Settings includes sound, detailed graphics and instructions.

## Checks and dependencies

```sh
npm ci
npm test
npm run build:vendor
```

Three.js 0.180.0 and its postprocessing modules ship in vendor/ with their MIT license. No API key or paid model is required. build:vendor reproduces the local runtime files from the pinned dependency. The page uses native browser ES modules and needs WebGL.

## Hosting

Deploy this folder as a static site with index.html at its root. There is no application build step. The repository URL is retained for compatibility; the game title is Dodge Me.
