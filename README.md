# RE:PAST Algeria — v0.4

A no-build, GitHub Pages-friendly prototype for an interactive 3D historical atlas focused on Algeria.

## What is included

- Algeria opening map with Timgad as the first live location.
- Cinematic transition from map → site intro → 3D Timgad.
- Three historical states: PRESENT / RECONSTRUCTION / PAST.
- Timeline slider.
- 3D streets, forum, columns, buildings, theatre, arch and archaeological fragments.
- Clickable discoveries and a persistent Journal using localStorage.
- Mobile joystick + desktop keyboard movement.
- Responsive UI.
- No backend and no paid service required.

## Run locally

Because ES modules are used, open it through a small local web server rather than `file://`.

Examples:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

For GitHub Pages, upload the contents of this folder to the repository root and enable Pages from the `main` branch.

## Next production steps

1. Replace hand-built lightweight GLB archaeological-inspired models with optimized archaeological models.
2. Add an evidence/source panel to each site.
3. Add more Algerian locations using `data/sites.js`.
4. Add an actual present-day terrain/reference layer.
5. Improve the reconstruction transition with staged building visibility.
6. Add audio ambience and optional narration.
7. Add a lightweight service worker for better mobile loading.

## Notes

The 3D geometry is intentionally procedural so the prototype stays lightweight and free to host. It is a foundation for more accurate models, not a claim of archaeological-scale accuracy.


## 3D assets included

The project now ships with local GLB models for Timgad PRESENT, RECONSTRUCTION and PAST, plus lightweight discovery marker models. These are original procedural/hand-built approximations created for the project; they are not photogrammetry or a claim of survey-level archaeological accuracy.
