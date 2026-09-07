# şarj.ist

Early Astro MVP for the Turkish EV charging station map. The accepted Volt dark interface now shares a typed station source with generated city and station detail pages.

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
- Static city and station routes, canonical metadata, sitemap and robots directives.
- SVG wordmark, app icon and monochrome symbol in `public/brand/`.

Station fixtures are illustrative. No live availability, EPDK import, analytics, user tracking or backend is connected. Navigation is intentionally represented by an explanatory dialog because coordinates are illustrative. Map tiles load from OpenStreetMap and fonts from Google Fonts, so those resources require internet access. Tile-service selection for production remains open as stated in the implementation plan.

The interface is static Astro HTML with a small client-side Leaflet controller. `src/data/stations.ts` is the normalized data boundary; the future importer can replace its fixtures without coupling EPDK response fields to the UI.

## Validation

Production build and JavaScript syntax checked. Browser interaction and visual testing have not been performed. Optional WebMCP support is feature-detected, but no supported WebMCP verification context was available.
