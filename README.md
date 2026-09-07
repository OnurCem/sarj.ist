# şarj.ist

şarj.ist is a Turkish electric-vehicle charging station directory. It presents charging locations on an interactive map and provides searchable city and station pages with operator, connector type, power, socket count, access type, and address information.

The project is an Astro static site with a small client-side Leaflet map controller. It is designed to remain fast and indexable even when publishing thousands of station pages.

## Data source

Station metadata comes from the charging-station web service operated by Türkiye's Energy Market Regulatory Authority (Enerji Piyasası Düzenleme Kurumu, EPDK):

`https://apigateway.epdk.gov.tr/sarjIstasyonlari/`

The network client fetches EPDK's response and the importer converts it into the application's stable internal format. Quality checks cover record counts, required fields, coordinates, duplicate IDs, station removals, and socket-count reductions.

EPDK data describes registered charging stations; it does not provide real-time charger availability, pricing, or operational status. şarj.ist is not an official EPDK service and does not imply affiliation with or endorsement by EPDK.

The project does not require a downloaded EPDK response for local development. A clean clone automatically uses the small illustrative dataset in `data/stations.sample.json`. Production refreshes fetch EPDK data through the guarded web-service client during the data-refresh process.

EPDK snapshots are intentionally not stored in this GitHub repository. Temporary responses, normalized station data, import history, and reconciliation state are ignored by Git.

See [the data pipeline documentation](docs/data-pipeline.md) for the response contract, one-request-per-hour protection, import commands, and publication gates.

## Features

- Responsive Turkish interface with map and station-list views.
- Search by district, station name, and operator.
- AC/DC, operator, and private-access filters.
- Static pages for cities and individual stations.
- Canonical metadata, sitemap, and robots directives.
- Keyboard focus styles, reduced-motion support, and map error states.
- Regional JSON bundles so the browser loads station data one city at a time.

The home map currently opens with İstanbul. Map tiles are provided by OpenStreetMap, and web fonts are loaded from Google Fonts; those resources require an internet connection.

## Run locally

Use Node.js 22.12 or newer. Node.js 24 is used in continuous integration.

```sh
npm install
npm run dev
```

Open the local address printed by Astro. When no local EPDK snapshot exists, the preparation step creates `data/stations.json` from the tracked sample dataset.

## EPDK refresh

The EPDK service permits only one request per hour. The complete guarded network fetch and import is:

```sh
npm run sync:epdk
```

The fetcher records the attempt before contacting EPDK, refuses another request within one hour, and never retries automatically. The subsequent import is atomic: a failed quality gate leaves the current generated dataset unchanged.

Importing a previously saved response is supported for schema development and incident recovery, but it is optional and is not required to run the project:

```sh
npm run import:epdk -- --input path/to/epdk-response.json --min-count 10000
```

## Useful commands

- `npm run dev` — prepare local data and start the development server.
- `npm test` — run the EPDK client, adapter, import, and reconciliation tests.
- `npm run validate:data` — validate the active normalized station dataset.
- `npm run prepare:data` — generate the city manifest and regional browser bundles.
- `npm run build` — validate data, generate bundles, and build the static site into `dist/`.
- `npm run fetch:epdk` — make one guarded request to the EPDK service.
- `npm run import:epdk` — normalize and reconcile a previously saved response.

GitHub Actions runs tests and the production build for pushes and pull requests. The scheduled EPDK verification workflow has read-only repository permissions and does not commit or upload station snapshots.

## Project structure

- `src/pages/` — home, city, station, and sitemap routes.
- `src/data/stations.ts` — typed application-facing station model.
- `scripts/lib/epdk-adapter.mjs` — EPDK response normalization.
- `scripts/lib/epdk-client.mjs` — guarded network client and response validation.
- `scripts/import-epdk.mjs` — atomic import and reconciliation command.
- `data/stations.sample.json` — illustrative development fixture.
- `docs/` — implementation, design, and data-pipeline documentation.
