# Station data ingestion

The application reads its active normalized dataset from `data/stations.json`. The checked-in file contains design fixtures until a real, authorized EPDK export is supplied.

## Import a saved response

```sh
npm run import:epdk -- --input path/to/epdk-response.json --min-count 10000
npm test
npm run build
```

The importer is deliberately offline: it accepts a response already obtained through an authorized channel and does not embed EPDK credentials, endpoints, or unverified reuse assumptions.

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

- Confirm the exact EPDK response envelope and aliases against the supplied full snapshot.
- Confirm authentication, rate limits, attribution, and data-reuse permission.
- Add the authorized fetch step and secret names only after those details are known.
- Run the full 16,768-record performance validation described in the implementation plan.
