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
static/videos/             teaser + result videos
static/pdfs/               paper.pdf, supplementary, poster
static/data/               CSV/JSON sources for tables, if you'd rather keep them separate
```

## Editing

Every placeholder is tagged. To see what's left:

```sh
grep -n "TODO" index.html
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
