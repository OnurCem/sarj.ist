# Production deployment

Production is designed for Cloudflare Workers Static Assets. Every release uploads the complete `dist/` directory as one deployment; EPDK source responses and normalized refresh state are never committed to GitHub or uploaded as workflow artifacts.

## Cloudflare resources

Create one private R2 bucket for refresh continuity:

```sh
npx wrangler r2 bucket create sarj-ist-state
```

The bucket stores only three private objects:

- `active/stations.json` — the last normalized dataset used for reconciliation.
- `active/import-state.json` — pending removals and socket-count reductions.
- `active/fetch-state.json` — the timestamp guard that prevents a second EPDK request inside one hour.

The raw EPDK response is deliberately excluded. It exists only in the temporary GitHub Actions runner and is discarded when the job ends.

## GitHub production environment

Create a GitHub environment named `production`, then configure:

- Secret `CLOUDFLARE_ACCOUNT_ID`.
- Secret `CLOUDFLARE_API_TOKEN`, scoped to deploy the Worker and read/write the state bucket.
- Variable `CLOUDFLARE_STATE_BUCKET` with value `sarj-ist-state` (or the chosen bucket name).

Keep production approvals enabled on the environment if releases should require a human review. Cloudflare credentials are read only from GitHub's encrypted secret store and must not be added to `.env`, Wrangler configuration, source files, or workflow logs.

## First deployment

Run **Production refresh and deploy** manually with `bootstrap` enabled. Bootstrap is intentionally explicit: it skips state restoration once, makes one guarded EPDK request, validates and builds the application, deploys it, smoke-tests the public data, then seeds the private R2 state.

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

## Local deployment checks

Build and validate the Cloudflare upload without contacting EPDK or publishing anything:

```sh
npm run deploy:dry-run
```

The preflight counts deployable files separately from Wrangler's recursive directory-entry message. The current real-data build contains 16,932 files, leaving 3,068 files below the 20,000-file Workers Free limit. The workflow fails before deployment if a future station-data build crosses the free-plan file-count or 25 MiB per-file limit. Hashed application assets are cached immutably; station bundles use a five-minute browser cache with stale-while-revalidate coverage for refreshes.

Smoke-test an existing HTTPS deployment:

```sh
npm run smoke:deployment -- https://example.workers.dev
```

The Worker name and static routing behavior are declared in `wrangler.jsonc`. Attach `sarj.ist` as a custom domain in Cloudflare only after the first `workers.dev` deployment passes its smoke test.
