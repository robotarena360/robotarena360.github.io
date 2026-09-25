# RobotArena 360 — project page

Live at **https://robotarena360.github.io/**

Adapted from the [Nerfies](https://github.com/nerfies/nerfies.github.io) project page
(CC BY-SA 4.0 — the attribution in the footer must stay).

## Layout

```
index.html                 the whole page; every editable spot is marked TODO(...)
static/css/index.css       custom styles (Bulma files above it are vendored, don't edit)
static/js/index.js         navbar, carousel, and the sortable-leaderboard logic
static/images/             figures, logos, favicon, social_preview.png
                           (gt/<scene>.jpg = real DROID frame shown in the scene gallery)
static/videos/             teaser + result videos (env_<scene>.mp4 = orbit renders)
static/viewer/             Spark (three.js) splat viewer, embedded as an iframe: ?scene=<scene>
static/envs/<scene>/       scene.spz (Gaussian background, robot frame, SH0, ~700k splats),
                           objects.glb (object meshes at settled poses), meta.json (DROID camera)
static/pdfs/               paper.pdf, supplementary, poster
static/js/figures.js       draws the Results figures in the page (port of the paper's figure code)
static/data/               JSON behind the leaderboard and every Results figure
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
