# make-fun-gta6-01
[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/rembokuy/make-fun-gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/rembokuy/make-fun-gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**SOLMARINA — Sun Coast Getaway** is an original open-world crime game in the sunny coastal city of Solmarina: steal cars, outrun the police as your wanted level climbs to 5 stars, fight the rival marina crew with fists and a pistol, and work off Rae Marlowe's debt across 3 chained story missions worth **$1,250** in total. The city never sits still — every ~90 seconds a **Rush Hour** event erupts for 45 seconds: traffic triples to 42 cars, police roadblocks with flashing lights seal off intersections, and every mission payout jumps **+50%**. All of it runs in 3D with 14 AI traffic cars, 26 pedestrians, a live minimap, synthesised WebAudio music and sound effects, and a deterministic seeded world (fixed-step 60 Hz simulation, same seed → same city, same screenshots).

## Features
- **3 chained story missions** — courier run ($250), debt collection from 3 debtors guarded by 2 thugs ($400 + $120 each), and a wanted-3 harbour escape ($600); total payout **$1,250**.
- **Rush Hour dynamic events** — every ~90 s for 45 s: traffic ×3 (14 → 42 cars), 3 police roadblocks at intersections, mission payouts **+50%**, HUD banner + countdown, roadblocks on the minimap.
- **Wanted system, 0–5 stars** — crimes (stealing, punching, shooting, running over pedestrians) raise heat; up to 5 police cars chase and ram you; getting caught costs a $200 bail.
- **Open-world driving & combat** — steal or hijack any car (E), punch (F), shoot (click), sprint, horn; guards fight back.
- **Living coastal city** — road grid, beach and ocean, Glass Tower, Fish Market, marina pier, palms, streetlights, and a waypoint beacon.
- **HUD & minimap** — mission objective, cash, total earned vs $1,250, health bar, speed, wanted stars, live minimap with player / police / waypoint / roadblock blips.
- **Deterministic & saveable** — seeded RNG, fixed-step 60 Hz simulation, progress autosaves to localStorage; `?shot=chase|walk|drive|mission&seed=7` stages reproducible screenshots.

## Run it
```sh
node serve.ts
```
Then open http://localhost:8080.

## Controls
| Key | Action |
| --- | --- |
| W A S D | Walk / drive |
| Shift | Sprint |
| E | Enter, steal & hijack cars / collect debts |
| F | Punch |
| Mouse click | Shoot |
| H | Horn |
| Mouse drag | Orbit camera |
| P / Esc | Pause |

---
<sub>Entered on [make.fun](https://make.fun/?ref=0yy9qwk6&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
