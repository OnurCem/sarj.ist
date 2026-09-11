# Application architecture

şarj.ist is a statically generated Astro application deployed with Cloudflare Workers Static Assets. Leaflet provides the client-side map and OpenStreetMap provides the daylight map tiles.

## Published application

- Astro generates the homepage, the province directory, 81 province pages, individual station pages, metadata, sitemap, and robots directives.
- The homepage loads a compact nationwide station bundle and a province manifest.
- Per-province JSON bundles support regional access and future loading optimizations.
- Leaflet marker clustering, viewport counts, search, filters, geolocation, and station details run in the browser.
- Cloudflare serves the generated `dist/` directory at `https://sarj.ist` and the fallback `workers.dev` hostname.
- The generated `/health.json` endpoint exposes only aggregate deployment and data-freshness metadata.
- The application has no runtime database or application server.

## Station data

EPDK's charging-station web service is the production source. A guarded client makes at most one request per hour, validates the response envelope, and normalizes provider fields into the application's station model.

The importer rejects incomplete or suspicious snapshots and requires repeated evidence before publishing station removals or socket-count reductions. Production station data and reconciliation state are excluded from Git and retained privately in Cloudflare R2 between refreshes.

See [Station data ingestion](data-pipeline.md) for the data contract and validation rules.

## Delivery pipeline

GitHub Actions runs tests and a production build on pushes and pull requests. The scheduled production workflow:

1. Restores the last validated dataset and reconciliation state from R2.
2. Makes one guarded EPDK request.
3. Validates and reconciles the snapshot.
4. Runs tests and generates the complete static site.
5. Checks Cloudflare static-asset limits.
6. Deploys the site and smoke-tests the public station bundles.
7. Publishes the new private state only after the deployment passes.

The workflow runs once each day at 05:17 Europe/Istanbul and allows only one concurrent refresh. A failed refresh leaves the previous successful deployment and private state active.

An independent hourly workflow checks the homepage, data manifest, and health endpoint at the custom domain. It does not call EPDK or read R2. The check fails if the public dataset is inconsistent or more than 48 hours old.

See [Production deployment](deployment.md) for operational configuration and recovery commands.
