# şarj.ist

Responsive UI/UX design prototype for the Turkish EV charging station map. Built with Astro and Leaflet; this is the design layer, not the complete MVP in `docs/implementation-plan.md`.

## Run locally

Use Node 22.12+ (or Node 24) and a current npm release.

```sh
npm install
npm run dev
```

Open the local URL printed by Astro. `npm run build` produces the static site in `dist/`.

## Included

- Turkish interface, responsive station list, interactive map and mobile map/list switch.
- Search by district, station and operator; AC/DC, operator and private-access filters.
- Station details, empty state, map tile error state, keyboard focus, reduced-motion support and native dialogs.
- SVG wordmark, app icon and monochrome symbol in `public/brand/`.

Station fixtures are illustrative. No live availability, EPDK import, production station pages, analytics, user tracking or backend is connected. Navigation is intentionally represented by an explanatory dialog because coordinates are illustrative. Map tiles load from OpenStreetMap and fonts from Google Fonts, so those resources require internet access. Tile-service selection for production remains open as stated in the implementation plan.

The interface is static Astro HTML with a small client-side Leaflet controller. The future React map component in the implementation plan can reuse the styling and SVG assets.

## Validation

Production build and JavaScript syntax checked. Browser interaction and visual testing have not been performed. Optional WebMCP support is feature-detected, but no supported WebMCP verification context was available.
