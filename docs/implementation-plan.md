# sarj.ist — MVP implementation plan

## Confirmed choices

- Build a web application showing EV charging stations in Turkey on a map.
- Use Astro as the frontend framework.
- Prefer $0/month infrastructure for the MVP, excluding the existing domain.
- Keep the GitHub repository public.
- Use Google Analytics, with appropriate consent handling.
- Show public stations by default; provide an explicit option to include private stations.

## Proposed architecture

- Astro and TypeScript generate station detail and city pages as static HTML.
- A React component contains the Leaflet map, search, filters, cards, and detail drawer so these controls share state.
- Cloudflare Workers Static Assets serves the generated site and compact regional station data directly.
- A daily GitHub Actions job restores private reconciliation state from Cloudflare R2, fetches and validates EPDK data, builds the site, deploys a complete Workers Static Assets build, and smoke-tests the release.
- Defer Supabase and runtime database queries until features need persistent user data or server-side querying.
- Browser-side filtering and clustering operate on compact data loaded by region; do not send the full source response on initial load.

Astro is confirmed. The hosting and data-delivery design above is the current recommendation, not a separately confirmed provider decision.

## MVP scope

- Interactive map with clustering and access, operator, and AC/DC filters.
- Search, mobile station list, station details, and external navigation links.
- Prebuilt station pages and initial pages for 5–10 major cities.
- Canonical URLs incorporating stable station identifiers, metadata, sitemap, and useful HTML content.
- Visible source attribution and last successful data refresh; no implied live charger availability.

## Validation required before full implementation

- Build with the supplied 16,768-station snapshot and measure output file count, build time, transferred bytes, and mobile map responsiveness.
- Keep generated assets within Cloudflare Free limits; bundle regional data instead of generating a second data file for every station.
- Validate the EPDK response envelope and record counts before publishing. Reject malformed or suspiciously incomplete imports and retain the previous deployment.
- Reconcile socket removals and use repeated valid snapshots before treating missing stations as removed. Persist the previous validated snapshot and comparison metadata for this purpose.
- Monitor missing successful scheduled runs as well as explicit failures. Explicit failures are covered by GitHub Actions; a separate missing-run monitor remains required.
- Choose a licensed administrative-boundary dataset and a tile service whose usage policy fits the application.
- Verify EPDK authentication, rate limits, and data-reuse terms. Attribution and enrichment alone do not settle reuse permission.
- Configure Google Analytics consent behavior and privacy disclosures.

## Reference

The original Claude plan and supplied EPDK response were reviewed as reference material. Decisions described as agreed in that document are not automatically treated as confirmed user instructions.
