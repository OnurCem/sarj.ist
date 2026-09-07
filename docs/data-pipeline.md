# Station data ingestion

The application reads its active normalized dataset from `data/stations.json`. The checked-in file contains design fixtures until a real, authorized EPDK export is supplied.

## Import a saved response

```sh
npm run import:epdk -- --input path/to/epdk-response.json --min-count 10000
npm test
npm run build
```

The official fetcher calls `https://apigateway.epdk.gov.tr/sarjIstasyonlari/` with the service's required JSON-body `GET` request. The Swagger declares no security scheme. The service permits one request per hour, so the fetcher records an attempt before making the request, refuses another attempt inside that window, and never retries automatically.

Run the complete fetch and guarded import with:

```sh
npm run sync:epdk
```

`EPDK_FILTER_JSON` may contain a JSON filter object when a scoped request is needed. `EPDK_STATIONS_URL` exists only for contract testing; production uses the official HTTPS URL. Raw responses and the local fetch-attempt state stay under the ignored `data/raw/` directory.

## Accepted envelope and field aliases

The adapter recognizes a root array or a nested array below `stations`, `chargingStations`, `sarjIstasyonlari`, `istasyonlar`, `items`, `results`, `result`, or `data`. A declared `totalCount`, `total`, `recordCount`, or `kayitSayisi` must match the array length; this prevents publishing one page from a paginated response as a full snapshot.

Provider fields are isolated in `scripts/lib/epdk-adapter.mjs`. It currently covers common English and Turkish aliases for stable ID, station name, operator, province/city, district, address, coordinates, access, charger type, power, and socket count. Update and test this adapter against the real response before the first production import.

## Publication gates

- Default minimum accepted count: 10,000 stations.
- Maximum rejected-record rate: 1%.
- Maximum snapshot count drop: 15%.
- Duplicate stable station IDs reject the entire snapshot.
- Coordinates must fall within Turkey's approximate bounding box.
- Missing stations are retained until absent from two consecutive valid snapshots.
- Lower socket counts are retained until repeated in two consecutive valid snapshots.

Thresholds can be changed explicitly with `--min-count`, `--max-invalid-rate`, `--max-drop-rate`, and `--confirmation-runs`. A failed gate exits non-zero without changing the active dataset or reconciliation state.

On success, writes use a temporary sibling followed by an atomic rename. The prior active dataset is saved to `data/history/stations.previous.json`, pending-removal evidence is saved to `data/import-state.json`, and `data/stations.json` becomes the new publishable snapshot.

## Still required before production

- Confirm the address and socket sub-fields against a non-empty full response; the official Swagger documents the envelope and top-level column names but not nested response definitions.
- Confirm attribution and data-reuse permission before publishing the fetched records.
- Run the full 16,768-record performance validation described in the implementation plan.

The scheduled GitHub workflow runs daily at 05:17 Europe/Istanbul time. It allows only one concurrent refresh, applies every quality gate, runs tests and the production build, then opens a reviewable pull request rather than writing directly to `main`.
