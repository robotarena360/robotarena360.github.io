"""Export the data behind the paper's Results figures for the project page.

The page draws every Results figure itself (static/js/figures.js) in the house style of the
paper figures, so this script only exports numbers and a few key frames -- it never ships a
rendered figure. The figure code in the two source repositories is reused, not copied, so
the web and paper versions come from the same computation:

    manip-eureka-droid/v2        data.json (fig 1-5), trace episodes via evalkit
    manip-eureka-robotarena/v2   human-agreement study (fig_combined_svg.py)

Writes into static/data/ and static/figures/:

    leaderboard.json   fig 8(a)  benchmark: success rate, mean score, tasks solved
    traces.json        fig 8(b-e) four droid2 episodes: score, stage terms, stages, events
    gains.json         fig 5(a,b) three PD-gain profiles
    receiver.json      fig 5(c,d) textured-mesh vs Gaussian-composite shadow receiver
    async.json         fig 4     blocking vs asynchronous execution
    validation.json    agreement with human progress scores on RobotArena-inf
    figures/traces/*.jpg, figures/receiver/*.jpg   key frames

Both repositories ship a package called ``evalkit``, so each part runs in its own process.

    python tools/export_figure_data.py
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "static" / "data"
FIGS = ROOT / "static" / "figures"
DROID = Path(os.environ.get("DROID_REPO", Path.home() / "user_data/manip-eureka-droid")) / "v2"
ARENA = Path(os.environ.get("ARENA_REPO", Path.home() / "user_data/manip-eureka-robotarena")) / "v2"
FINAL = DROID / "out" / "paper_figures_final"
BATCH_NAME = "generic-home-1200-gpt6-yaw45-20260913"

# Policy colours of the paper figures (build_paper_figures_html.PC / TINT).
PC = {"galaxea": "#2a78d6", "gr00t": "#eb6834", "molmoact2": "#1baf7a",
      "pi05": "#eda100", "pi0_fast": "#e87ba4", "cosmos3": "#4a3aa7"}
TINT = {"galaxea": "#c9ddf5", "gr00t": "#f9d3c3", "molmoact2": "#c0ebda",
        "pi05": "#f8e3ad", "pi0_fast": "#f7d3e0", "cosmos3": "#d3cdea"}


def dump(name: str, obj) -> None:
    (DATA / name).write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")))
    print(f"  {name:18s} {(DATA / name).stat().st_size / 1024:6.1f} KB")


def stats(s: dict) -> dict:
    keep = ("n", "scenes", "sr", "sr_ci", "ms", "ms_ci", "succ", "solved")
    return {k: s[k] for k in keep if k in s}


# ------------------------------------------------------------------ bar-chart figures
def part_tables() -> None:
    D = json.loads((FINAL / "data.json").read_text())
    names = D["fig1"]["names"]
    pol = lambda p: {"id": p, "name": names[p], "color": PC[p], "tint": TINT[p]}

    f1 = D["fig1"]
    dump("leaderboard.json", {"rows": [{**pol(p), **stats(f1["stats"][p])} for p in f1["order"]]})

    dump("gains.json", {"rows": [{**pol(r["policy"]),
                                  "stock": stats(r["stock"]), "shared": stats(r["shared"]), "pi": stats(r["pi"]),
                                  "d_shared_sr": r["d_shared_sr"], "d_pi_sr": r["d_pi_sr"],
                                  "d_shared_ms": r["d_shared_ms"], "d_pi_ms": r["d_pi_ms"],
                                  "tasks": len(r["common"])} for r in D["fig2b"]["rows"]]})

    dump("receiver.json", {"rows": [{**pol(r["policy"]),
                                     "legacy": stats(r["legacy"]), "native": stats(r["native"]),
                                     "d_sr": r["d_sr"], "d_ms": r["d_ms"], "tasks": len(r["common"])}
                                    for r in D["fig3"]["rows"]],
                           "tiles": ["droid2", "droid7", "droid37"]})
    out = FIGS / "receiver"
    out.mkdir(parents=True, exist_ok=True)
    for f in (FINAL / "receiver_frames").glob("*.jpg"):
        shutil.copy(f, out / f.name)

    d = D["fig4"]
    ent, order = d["entries"], d["order"]
    rows = []
    for p in dict.fromkeys(ent[e]["policy"] for e in order):
        blk = ent[f"{p}-stock"]
        asy = next(ent[e] for e in order if ent[e]["policy"] == p and ent[e]["kind"] == "measured")
        rows.append({**pol(p), "blocking": stats(blk), "async": stats(asy),
                     "latency_ms": asy["x"], "d_sr": asy["d_sr"], "d_ms": asy["d_ms"]})
    dump("async.json", {"rows": rows, "tasks": len(d["scenes"])})


# ------------------------------------------------------------------ traces (fig 8 b-e)
def part_traces() -> None:
    """Runs inside manip-eureka-droid/v2 with evalkit importable."""
    import numpy as np
    import make_trace_figure as T
    from evalkit.camera import frame_map
    from evalkit.loader import Episode
    from evalkit.registry import load_task
    from evalkit.scene import load_scene
    from evalkit.spec import evaluate

    B = T.B
    cases = json.loads((FINAL / "trace_cases.json").read_text())["droid2"]
    scene = "droid2"
    task = load_task(scene)
    spec = T.spec_of(task)
    frames = FIGS / "traces"
    frames.mkdir(parents=True, exist_ok=True)
    r3 = lambda a: [round(float(min(1.0, max(0.0, v))), 3) for v in a]

    out = []
    for policy, rel in cases:
        ep = Episode.from_npz(T.BATCH / rel)
        res = evaluate(task, ep, load_scene(scene, ep.n_objects))
        video = ep.video("main")
        fm = frame_map(video, ep.T)
        events = T.pick_steps(res, spec, ep.T, ep.t0)
        imgs = []
        for j, (step, _) in enumerate(events):
            f = frames / f"{policy}_{j}.jpg"
            T.grab_frame(video, fm.frame(step), f, width=300)
            imgs.append(f"./static/figures/traces/{f.name}")
        cut = (min(ep.T, res.success_step + spec.success_hold_steps + int(0.04 * ep.T))
               if res.success else ep.T)
        idx = np.arange(0, cut, max(1, cut // 400))
        out.append({
            "policy": policy, "name": B.D["fig1"]["names"][policy], "color": PC[policy],
            "dt": float(ep.dt), "cut": int(cut), "steps": idx.tolist(),
            "success": bool(res.success),
            "success_step": int(res.success_step) if res.success else None,
            "hold_steps": int(spec.success_hold_steps),
            "trajectory_score": float(res.trajectory_score),
            "stuck_in": None if res.success else T.first_missing(res, spec).replace("_", " "),
            "events": [{"step": int(s), "label": lab, "img": im} for (s, lab), im in zip(events, imgs)],
            "score": r3(res.score_curve[idx]),
            "terms": {n: r3(res.soft_gated[n][idx]) for n in spec.stage_names},
            "intervals": [[n, int(a), int(z)] for n, a, z in T.stage_intervals(res, spec, ep.t0, cut, ep.closedness)],
            "milestone_steps": {m: int(s) for m, s in T.milestone_steps(res, spec, cut).items()},
            "milestone_runs": {m: [[int(a), int(z)] for a, z in rs] for m, rs in T.milestone_runs(res, spec, cut).items()},
        })
        print(f"  trace {policy:9s} success={res.success} score={res.trajectory_score:.2f}")
    dump("traces.json", {"task": "put toy bear into black bowl", "stages": spec.stage_names,
                         "milestones": T.milestones(spec), "stage_colors": T.STAGE_COL,
                         "score_color": T.SCORE_COL, "episodes": out})


# ------------------------------------------------------------------ human agreement
def part_validation() -> None:
    """Runs inside manip-eureka-robotarena/v2/tools."""
    import numpy as np
    from scipy import stats as st
    import fig_combined_svg as F

    base = F.base
    human, series = base.load()
    stat = {k: base.metrics(human, v) for k, v in series.items()}
    ci = F.bootstrap_ci(human, series)
    lane = {base.GVL: -0.035, base.OURS: 0.035}
    out = []
    for k, label, colr, op, dot in F.SERIES:
        s = series[k]
        pts = []
        for lv in base.LEVELS:
            v = s[(human == lv) & ~np.isnan(s)]
            dx = base.swarm(v, 0.022, bin_h=0.035, step=0.016)
            pts += [[round(float(x), 4), round(float(y), 4)] for x, y in zip(lv + lane[k] + dx, v)]
        fit = st.linregress(human, s)
        out.append({"key": k, "label": label, "color": colr, "opacity": op, "ours": k == base.OURS,
                    "points": pts, "fit": [float(fit.intercept), float(fit.intercept + fit.slope)],
                    "stats": {f: float(stat[k][f]) for f in F.FIELDS},
                    "ci": {f: [float(a), float(b)] for f, (a, b) in ci[k].items()}})
    dump("validation.json", {"levels": [float(v) for v in base.LEVELS], "videos": int(len(human)),
                             "series": out})


def run(part: str, cwd: Path, pythonpath: str, env_extra: dict | None = None) -> None:
    env = {**os.environ, "PYTHONPATH": pythonpath, **(env_extra or {})}
    subprocess.run([sys.executable, str(Path(__file__).resolve()), "--part", part],
                   cwd=cwd, env=env, check=True)


def main() -> int:
    if len(sys.argv) == 3 and sys.argv[1] == "--part":
        {"tables": part_tables, "traces": part_traces, "validation": part_validation}[sys.argv[2]]()
        return 0
    DATA.mkdir(parents=True, exist_ok=True)
    FIGS.mkdir(parents=True, exist_ok=True)
    part_tables()
    run("traces", DROID, f"{DROID}:{DROID / 'tools'}",
        {"DROID_PAPER_FIG_OUT": str(FINAL), "DROID_TRACE_BATCH": BATCH_NAME})
    run("validation", ARENA / "tools", f"{ARENA}:{ARENA / 'tools'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
