# Search visibility implementation plan

Created: 4 October 2026.

Updated: 4 October 2026, after implementation, deployment, and public verification.

## Progress

- Complete: canonical HTTP/www redirects configured by the user in Cloudflare and verified publicly.
- Complete: redirect regression monitoring, including a post-release workflow check.
- Complete: audit of the five old station URLs against current production and reconciliation logs; all five were removed after two missing snapshots, with no identified replacement.
- Complete: city/district navigation, 50-station pagination, summaries, metadata, breadcrumbs, and sitemap entries.
- Complete: station details, nearby alternatives, accurate AC/DC labels, homepage search intent, and static city links.
- Complete: historical station slug redirects and persistence for future name changes.
- Complete: application release and post-deployment verification.
- Pending: Search Console inspections, representative indexing requests, sitemap resubmission, and the 2–4 week measurement review.

Next step: sign in to Search Console, inspect representative updated URLs, request indexing, and resubmit the sitemap once. Review comparable coverage/performance windows after 2–4 weeks.

### Implementation verification — 4 October 2026

Validation uses the published production bundle refreshed at 08:30 UTC on 4 October, containing 16,909 stations across 81 cities. EPDK was not contacted.

- All 16,909 active station pages are reachable through the generated HTML guide links. All 1,015 city/district guide pages are in the sitemap and have self-canonicals; no station list exceeds 50 rows.
- İstanbul's city guide contains 38 district groups and a 12-row preview, with a 15,608-byte HTML file.
- The full static build has 18,022 files, leaving 1,978 files under the deployment preflight limit. Wrangler dry-run succeeds.
- All 44 tests pass. Unit/integration checks cover district normalization, slug collisions, missing districts, pagination, indexed nearest neighbors versus brute-force distances, historical aliases, canonical redirects, and geolocation precedence.
- Chrome/Playwright checks at 1440×1000 and 390×844 cover İstanbul, İzmir, Bayburt, Kadıköy pagination, station/nearby links, district-focused map navigation, mobile map toggle, and the source-information modal. No browser errors or horizontal overflow were observed. Browser plugin is unavailable; bundled Playwright uses installed Chrome without downloading dependencies.
- All 78 generated historical redirect rules (39 renamed stations, slash and non-slash forms) return direct 301s with GET and HEAD in the local Cloudflare runtime, and all targets return 200. The full-directory dev watcher hit a platform limit, so this check used the actual generated rules with their destination files in a focused temporary asset directory.
- Public production monitoring passes canonical protocol/hostname redirects, retained path/query strings, canonical 200 responses, and a missing-path 404.

### Production release — 4 October 2026, 21:19 Europe/Istanbul

[Code-only production release](https://github.com/OnurCem/sarj.ist/actions/runs/37223867191) succeeded for commit `391bed6a80a9b4bd2ce306a0c1d40674309495b0`, with `refresh_data=false` and `bootstrap=false`. The workflow restored R2 state; skipped EPDK fetch, fetch-guard publication, and reconciliation; passed all 44 tests, build, deployment preflight, deployment smoke test, state publication, and canonical-domain monitoring. The published refresh timestamp remains 4 October 08:30 UTC, with 16,909 stations and 81 cities.

Post-release checks confirmed the deployed commit through `/health.json`, all 78 historical direct 301s, all five removed-station 404s, and district page/sitemap canonicals. Desktop/mobile production browser checks passed the same guide → pagination → station and district-map flows with no browser errors. Granted-geolocation and Back-navigation behavior was additionally checked locally using a synthetic position.

Search Console follow-up remains pending because the available browser session is not signed in. Inspect `https://sarj.ist/`, `https://sarj.ist/sehir/istanbul/`, `https://sarj.ist/sehir/istanbul/kadikoy/`, and the renamed station `https://sarj.ist/istasyon/busan-2-srj-7321/`. Verify live access and canonical selection, request indexing for these pages, and resubmit `https://sarj.ist/sitemap.xml` once. Keep the existing validation process intact.

## Objective and evidence

Make sarj.ist consistently reachable at its canonical HTTPS domain and make the static directory more useful to people searching for charging stations by city and district.

The supplied exports show 15 indexed pages out of 16,928 known pages in the coverage chart ending 21 September, and 2 clicks from 10 impressions in the performance chart ending 29 September. The drilldown's last crawls predate the later site changes. These are baselines, not proof of a particular cause or a current indexing count.

Initial live checks found HTTP serving content without a redirect, HTTPS www returning 522, and a roughly 2 MB İstanbul guide containing 4,435 station links. The HTTP/www issues were resolved and publicly verified on 4 October 2026. Representative canonical pages return 200 with no noindex directive. Five old station URLs return 404 and are absent from the current sitemap; the audit below confirms their removals.

## 1. Resolve canonical domain handling first

Owner: Cloudflare account administrator, with public verification from this workspace.

Status: **Cloudflare configuration and redirect regression monitoring complete.** The dashboard procedure below is retained as configuration documentation.

### Verified results — 4 October 2026

- HEAD requests to HTTP root, HTTP www, and HTTPS www returned 301 directly to the HTTPS root domain.
- All three variants preserved `/sehir/istanbul/?test=1` in a direct 301 redirect.
- Canonical HTTPS homepage and İstanbul page returned 200 without another redirect.
- GET checks confirmed HTTP root and HTTPS www redirect the İstanbul path and query string correctly.
- HTTPS www redirected a missing path to the same canonical path; the canonical missing page returned 404 on GET.
- The previously observed www 522 was no longer present in these checks.

Verification covered public behavior. Internal DNS, certificate, and rule ordering were not independently inspected in the account.

The deployment is a static Astro build on Cloudflare Workers Static Assets. Use a zone Redirect Rule for domain and protocol handling. The Workers `_redirects` format does not support domain-level source matching.

### Cloudflare dashboard procedure

1. Select the **sarj.ist** zone. Inspect existing Redirect Rules, Page Rules, DNS records, and the Worker custom domain before changing anything. Record the relevant settings for rollback.
2. Keep the working `sarj.ist` Worker custom domain active. Under **DNS → Records**, confirm `www` is proxied (orange cloud). If it has no appropriate record, use a proxied CNAME named `www`, targeting `sarj.ist`. If a conflicting www record exists, update that record rather than adding a duplicate. Do not alter unrelated DNS records.
3. Confirm the edge certificate covers both `sarj.ist` and `www.sarj.ist`.
4. Under **Rules → Overview → Create rule → Redirect Rule**, name the rule **Canonical HTTPS domain** and select **Custom filter expression**:

   ```text
   (http.host eq "www.sarj.ist") or
   (http.host eq "sarj.ist" and not ssl)
   ```

5. Set the URL redirect to **Dynamic** with this target expression:

   ```text
   concat("https://sarj.ist", http.request.uri.path)
   ```

6. Set status **301** and enable **Preserve query string**. Place the rule before any conflicting redirect that would send these requests elsewhere. Deploy it.
7. Verify the checks below. If existing HTTPS enforcement causes an intermediate hop from HTTP www, inspect rule precedence and consolidate overlapping redirects where possible.

The configured redirect now answers the tested www requests successfully, resolving the observed 522. Future configuration changes should preserve the verified behavior above.

### Acceptance checks

- `http://sarj.ist/`, `http://www.sarj.ist/`, and `https://www.sarj.ist/` permanently redirect to `https://sarj.ist/`.
- Repeat with `/sehir/istanbul/?test=1`: retain the path and query string, with a single canonical redirect where possible.
- `https://sarj.ist/` and an existing canonical city/station page remain 200 without a loop.
- A missing page remains 404 after canonicalization.
- Check both GET and HEAD without automatically following redirects, then follow the chain to confirm its destination.
- Extend `scripts/monitor-production.mjs` to detect protocol/hostname regressions. Keep the deployment's workers.dev smoke-test target functional.

Cloudflare references: [dashboard redirect setup](https://developers.cloudflare.com/rules/url-forwarding/single-redirects/create-dashboard/), [custom domains and www routing](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/), [static asset redirect limitations](https://developers.cloudflare.com/workers/static-assets/redirects/).

## 2. Audit the five old station URLs

Compare these IDs against the current production bundle and private reconciliation history, rather than assuming the older local dataset is current:

- ŞRJ/5029 — Armas Labada Hotel
- ŞRJ/17769 — Hakmar Market Çayırova
- ŞRJ/1222 — Hotel Grand Astra Bartın
- ŞRJ/2629 — Karum AVM Ankara
- ŞRJ/12231 — Nilüferköy Mahallesi

For the same station at a new slug, add a permanent redirect to its exact replacement. For an unintended publication omission, restore the correct route. For confirmed removals without replacements, retain 404 and exclude the URLs from internal links and sitemap. Do not redirect removed stations to the homepage.

### Audit results — 4 October 2026

The [29 September reconciliation run](https://github.com/OnurCem/sarj.ist/actions/runs/36543855351) retained ŞRJ/5029, ŞRJ/17769, ŞRJ/1222, and ŞRJ/2629 after their first absence. The [30 September run](https://github.com/OnurCem/sarj.ist/actions/runs/36690978245) confirmed their removals and retained ŞRJ/12231 after its first absence. The [1 October run](https://github.com/OnurCem/sarj.ist/actions/runs/36839993095) confirmed ŞRJ/12231's removal. Today's production bundle contains none of these IDs, names, or exact-location replacements. Retain their 404s and exclude them from sitemap/navigation; no homepage redirects or restoration are appropriate based on this evidence.

Comparing stable IDs in the September local snapshot with today's production bundle establishes 39 other station name/slug changes. `data/station-slug-aliases.json` seeds those known aliases. Future reconciliations preserve aliases in private refresh state, and builds redirect historical slugs directly to the active route. Aliases for removed IDs or slugs occupied by active routes are not emitted.

If changing station names can change slugs, persist historical slug aliases in private refresh state so daily deployments retain valid redirects. Implement that only if the audit establishes that slug changes are occurring. Test redirect destinations and ensure aliases do not loop.

## 3. Make city and district guides manageable

Files: `src/pages/sehir/[city].astro`, new district/pagination routes, `src/data/stations.ts`, `src/pages/sitemap.xml.ts`, and shared guide components/styles.

1. Generate district groups using city plus normalized district identity. Detect slug collisions and handle missing district values explicitly.
2. Replace the full city station dump with a useful summary, district links showing station counts, and a bounded station preview.
3. Add static district guides at `/sehir/{city}/{district}/`, listing 50 stations per page with ordinary Previous/Next links. Later pages have distinct URLs and self-canonicals. Every station must be reachable through HTML links without JavaScript.
4. Summarize public/private access, AC/DC classification, operators, and recorded power from the published dataset. Describe precisely what each count measures; the current model has one type/power summary per station, so it cannot establish charger-level totals or mixed charger availability.
5. Link guides to their focused map views and station details. Keep map interactions working and source information in the existing “Nasıl çalışır” modal.
6. Add descriptive titles, descriptions, visible breadcrumbs, and matching breadcrumb JSON-LD to new guides. Include canonical public guide URLs in the sitemap.

Acceptance: İstanbul's main guide no longer renders thousands of rows; no guide list exceeds 50 rows; all active station pages are reachable through crawlable pagination; missing districts and Turkish characters produce valid, distinct routes. Verify İstanbul, İzmir, and a small city on desktop/mobile. Check final file count against deployment limits before release.

## 4. Improve station details using verified data

Files: `src/pages/istasyon/[slug].astro`, shared station helpers, and source adapter/model if richer source fields are available.

- Make titles and descriptions identify the station, city/district, and charging purpose naturally.
- Add a district guide link and up to five nearby alternatives, including operator, AC/DC, recorded power, access, and approximate straight-line distance.
- Compute nearby stations at build time using a geographic index rather than scanning every station against every other station. Exclude the current station and clearly identify private access.
- Audit connector data: the current page maps DC to “CCS” and AC to “Tip 2” without a connector field in the normalized model. Preserve verified source connector fields if available; otherwise display AC/DC without asserting a plug standard.
- Use available address/access facts without inventing opening hours, prices, operational status, or live availability.

Acceptance: nearby links refer to published pages; distances are correctly calculated and labelled; no unsupported connector claims; location links retain the current platform behavior; no repeated provenance or location-accuracy notices.

## 5. Clarify homepage search intent

Files: `src/pages/index.astro`, shared layout only where needed.

- Set title to **Türkiye Şarj İstasyonları Haritası | şarj.ist**.
- Write a concise description covering finding stations by city, district, operator, AC/DC, and recorded power.
- Make the visible heading communicate the charging-station purpose while retaining the existing visual design.
- Add compact static links to city guides in a suitable layout, available without JavaScript and without covering the map or search panel.
- Keep one canonical URL per page and existing valid breadcrumb metadata. Do not add meta keyword tags or unsupported structured-data claims.

Acceptance: meaningful title, description, heading, and guide links are present in the delivered HTML; map controls and responsive layout still work.

## 6. Release and measure

1. Domain configuration and public verification are complete. Preserve those settings and add regression monitoring in the application release.
2. Implement station URL corrections and guide structure, then station details and homepage changes.
3. Run focused tests for district grouping/pagination, changed URL behavior, and nearby-distance computation; run the existing test suite, build, and Cloudflare deployment preflight. Inspect representative built HTML and mobile/desktop pages.
4. Deploy code changes using the existing workflow with `refresh_data=false` and `bootstrap=false`; restore production state through the normal workflow rather than refreshing EPDK unnecessarily.
5. Run production monitoring and repeat canonical URL checks after deployment. Roll back the Cloudflare rule separately from the application release if either causes a regression.
6. In Search Console, inspect the live homepage, İstanbul guide, a new district guide, and one affected station. Check crawl access, rendered HTML, Google-selected canonical, and latest crawl date. Request indexing for these representative updated pages and resubmit the updated sitemap once.
7. Review Crawl Stats for host availability/errors and whether crawls reach updated pages. Review coverage and performance after 2–4 weeks using comparable date windows; distinguish branded, general, city, and district queries where reported. Do not restart the currently pending validation simply because it remains pending.

Success means canonical URLs work, directory navigation is complete and manageable, and the pages provide useful verified information. Indexing and search traffic are measured outcomes, not guaranteed deployment results.

Google references: [canonical URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls), [helpful content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content), [indexing report and validation](https://support.google.com/webmasters/answer/7440203?hl=en).
