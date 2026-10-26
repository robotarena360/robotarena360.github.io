# RobotArena 360 — project page

Live at **https://robotarena360.github.io/**

Adapted from the [Nerfies](https://github.com/nerfies/nerfies.github.io) project page
(CC BY-SA 4.0 — the attribution in the footer must stay).

## Layout

```
index.html                 the whole page; every editable spot is marked TODO(...)
leaderboard/index.html     the full leaderboard page (robotarena360.github.io/leaderboard/)
static/css/site.css        shared styles for both pages (tokens, top bar, sections, figures)
static/css/glass.css       liquid-glass material (with static/js/glass.js)
static/css/leaderboard.css leaderboard preview (index.html) and the full page (leaderboard/)
static/js/site.js          both pages: top bar + phone menu, hero + live 3D, scene ring,
                           real/sim wipe, scroll reveals
static/js/glass.js         liquid glass: SVG refraction on Chromium, frosted elsewhere; tab droplet
static/js/replay.js        scoring replay widget (Method section), from static/data/traces.json
static/js/leaderboard.js   leaderboard: preview on index.html, full table on leaderboard/
static/images/             figures, logos, favicon, social_preview.png
                           (logos/ = organization logos shown on the leaderboard)
                           (gt/<scene>.jpg = real DROID frame shown in the scene gallery)
static/videos/             teaser + result videos (env_<scene>.mp4 = hero orbit renders)
                           (orbits/<scene>.mp4 = environment ring, 720p; posters in images/orbits/;
                            droid35 and droid980 have no orbit render, so the ring shows their
                            sim still)
                           (pipeline/*.mp4 = Method pipeline clips: object turntable, pose
                            refinement, scale search, collider, plane fit, twin settling)
                           (rollouts/<policy>.mp4 = the four droid2 rollouts in the scoring
                            replay; each spans its whole episode, so video time maps
                            linearly onto traces.json steps; posters in images/rollouts/)
static/images/pipeline/    droid2 running example for the Method pipeline diagram
static/viewer/             Spark (three.js) splat viewer, embedded as an iframe: ?scene=<scene>
static/envs/<scene>/       scene.spz (Gaussian background, robot frame, SH0, ~700k splats),
                           objects.glb (object meshes at settled poses), meta.json (DROID camera)
static/pdfs/               paper.pdf, supplementary, poster
static/js/figures.js       draws the Results figures in the page (port of the paper's figure code)
static/data/               JSON behind the leaderboard and every Results figure
                           (policies.json = org name, logo, footnote per policy; edited by hand)
static/figures/            key frames used by those figures (traces, shadow receiver)
tools/export_figure_data.py  exports static/data/ + static/figures/ from the paper repos
```

## Editing

Every placeholder is tagged. To see what's left:

```sh
grep -n "TODO" index.html
```

## Updating the figures

The leaderboard and all Results figures are drawn in the browser from `static/data/*.json`
in the house style of the paper figures; nothing there is a screenshot. After a new paper
figure build (`manip-eureka-droid/v2`, `manip-eureka-robotarena/v2`), re-export:

```sh
python tools/export_figure_data.py
```

## Preview locally

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy

Push to `main`. Settings → Pages → Source: *Deploy from a branch* → `main` / `root`.
`.nojekyll` is present so GitHub serves files starting with `_` unchanged.

## Media budget

Keep the repo well under 1 GB and any single file under 100 MB. Compress videos before
committing:

```sh
ffmpeg -i in.mov -vcodec libx264 -crf 28 -preset slow -an -movflags +faststart out.mp4
```

If the videos total more than ~50 MB, host them externally and embed instead.
