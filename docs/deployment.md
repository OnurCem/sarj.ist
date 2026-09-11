# Production deployment

Production is designed for Cloudflare Workers Static Assets. Every release uploads the complete `dist/` directory as one deployment; EPDK source responses and normalized refresh state are never committed to GitHub or uploaded as workflow artifacts.

## Cloudflare resources

The private `sarj-ist-state` R2 bucket provides refresh continuity. It was created with:

```sh
npx wrangler r2 bucket create sarj-ist-state
```

The bucket stores only three private objects:

- `active/stations.json` — the last normalized dataset used for reconciliation.
- `active/import-state.json` — pending removals and socket-count reductions.
- `active/fetch-state.json` — the timestamp guard that prevents a second EPDK request inside one hour.

The raw EPDK response is deliberately excluded. It exists only in the temporary GitHub Actions runner and is discarded when the job ends.

## GitHub production environment

The GitHub environment is named `production` and contains:

- Secret `CLOUDFLARE_ACCOUNT_ID`.
- Secret `CLOUDFLARE_API_TOKEN`, scoped to deploy the Worker and read/write the state bucket.
- Variable `CLOUDFLARE_STATE_BUCKET` with value `sarj-ist-state` (or the chosen bucket name).

Cloudflare credentials are read only from GitHub's encrypted secret store and must not be added to `.env`, Wrangler configuration, source files, or workflow logs.

## Bootstrap and recovery

For a new or empty state bucket, run **Production refresh and deploy** manually with `bootstrap` enabled. Bootstrap skips state restoration once, makes one guarded EPDK request, validates and builds the application, deploys it, smoke-tests the public data, then seeds the private R2 state.

Do not enable bootstrap again after a successful first release. Normal manual and scheduled runs require all three state objects to exist and fail closed if any cannot be restored.

Smoke tests retry briefly after Wrangler reports success because a new `workers.dev` deployment can take a few seconds to propagate. If the upload succeeds but the initial smoke test still exhausts its retries, run the workflow with `bootstrap` disabled and `recovery_url` set to that deployment's HTTPS URL. Recovery validates the already-published nationwide bundle, reconstructs the initial reconciliation state, and writes it to R2 without making another EPDK request or redeploying the site.

## Normal refresh

At 05:17 Europe/Istanbul each day, the workflow:

1. Restores the last validated dataset, reconciliation state, and fetch guard from R2.
2. Makes exactly one guarded EPDK request and immediately persists the updated hourly guard, even when the fetch fails.
3. Reconciles removals and socket reductions against prior successful runs.
4. Runs the tests and production build.
5. Deploys the complete static build through Wrangler.
6. Smoke-tests the deployed home page, manifest, real-data flag, province count, and nationwide station count.
7. Publishes the new validated reconciliation state only after deployment and smoke testing succeed.

A fetch, import, test, or build failure does not deploy partial data. Cloudflare keeps the previously successful static deployment online. GitHub receives only workflow logs; station files and responses are not committed or stored as artifacts.

Every run writes a stage table to its GitHub Actions summary so restore, fetch, validation, deployment, smoke-test, and state-publication failures can be distinguished without opening every log step.

For a code-only release, dispatch **Production refresh and deploy** with `refresh_data` disabled and `bootstrap` disabled. The workflow restores the last validated dataset from R2, builds and deploys it with the new code, and does not contact EPDK. Scheduled runs always refresh data regardless of the manual-input default.

## Health endpoint and monitoring

Each build generates `https://sarj.ist/health.json`. It contains only aggregate operational metadata:

- service and schema identity;
- deployment generation time and public Git commit;
- EPDK refresh time;
- station and province counts; and
- whether the build contains production or sample data.

It never contains station names, addresses, coordinates, IDs, or private reconciliation state. Cloudflare serves it with `Cache-Control: no-store`.

The **Production monitor** workflow runs hourly at minute 43 and can also be dispatched manually. It makes three public requests—to the homepage, manifest, and health endpoint—and never calls EPDK or R2. It fails when the application is unavailable, the aggregate counts disagree, sample data is published, or EPDK data is more than 48 hours old. Failed-run notifications follow the repository owner's GitHub Actions notification settings.

Run the same check locally with:

```sh
npm run monitor:production
```

## Incident recovery

1. Open the failed workflow summary and identify whether the problem is availability, stale data, deployment, or private-state publication.
2. If only **Production monitor** failed, confirm whether the custom domain and the latest **Production refresh and deploy** run are reachable before starting another refresh.
3. For stale data, inspect the most recent refresh failure. Do not bypass the one-request-per-hour guard; wait until the guard permits another manual run.
4. If Cloudflare deployed and validated a release but R2 state publication failed, run **Production refresh and deploy** with `bootstrap` disabled and `recovery_url` set to the validated deployment URL. This rebuilds private state without contacting EPDK.
5. Use `bootstrap` only for an empty state bucket. Never use it as a general retry switch.

## Local deployment checks

Build and validate the Cloudflare upload without contacting EPDK or publishing anything:

```sh
npm run deploy:dry-run
```

The preflight counts deployable files separately from Wrangler's recursive directory-entry message. The workflow fails before deployment if a station-data build crosses the Workers Free file-count or 25 MiB per-file limit. Hashed application assets are cached immutably; station bundles use a five-minute browser cache with stale-while-revalidate coverage for refreshes.

Smoke-test an existing HTTPS deployment, including the nationwide bundle and aggregate health metadata:

```sh
npm run smoke:deployment -- https://example.workers.dev
```

The smoke command rejects production data older than 48 hours. Code that uses `fetchDeploymentSnapshot()` for state recovery deliberately omits this freshness limit so an older validated deployment remains recoverable during an incident.

The Worker name and static routing behavior are declared in `wrangler.jsonc`. Production is available at `https://sarj.ist`; the `workers.dev` hostname remains the deployment fallback and smoke-test target.
