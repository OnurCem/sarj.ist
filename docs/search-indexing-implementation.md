# Search indexing implementation record

Recorded 12 October 2026 (Europe/Istanbul). Code deployed and verified; dashboard-only evidence and Google indexing baseline remain pending. This record does not claim Google indexing success.

## Changes

- Homepage design restored at the user’s request: no added priority-city links, coverage panel or reduced map height. The original city-directory menu link remains. Priority cities are reachable through that directory. The plan’s prominent homepage city-link section was explicitly superseded by this design decision.
- The existing homepage information dialog retains source/refresh information and the lack-of-live-availability explanation. Detailed source and access improvements remain on guide and station pages.
- Station pages expose recorded location text, public/private access caveats and shared dataset attribution. Refresh dates describe the dataset, not individual station verification.
- Directory, city and district guides explain how to choose a station and display shared source/refresh information. Existing counts, sample warnings, directions and alternatives remain.
- No station removal, noindex rule, inferred connector/price/hours, pipeline change or alias change was warranted by the available evidence.

## URL evidence

Public HTTPS GETs on 12 October, before this release, returned the following. Seven active pages return 200 directly (no redirect), have self-canonicals, occur in the production sitemap, have server-rendered main content, and send neither a robots meta tag nor an X-Robots-Tag restriction. All referenced same-site CSS and JS returned 200. Production robots.txt allows `/` and names the sitemap. These observations do not confirm access for verified Google crawlers or current indexing.

Incoming counts below are distinct source pages in the **local generated build**, using the 4 October production-sized snapshot; they are not Google's referring-page report or a complete production link crawl.

| Station | URL path | HTTP | Access in local source | Incoming HTML pages |
| --- | --- | --- | --- | --- |
| T7 Petrol Düzce Merkez, 5489 | `/istasyon/t7-petrol-duzce-merkez-srj-5489/` | 200 | Public | 8 |
| Dedeman Ski Lodge, 778 | `/istasyon/dedeman-ski-lodge-srj-778/` | 200 | Public | 5 |
| Zorlu Center, 10682 | `/istasyon/zorlu-center-srj-10682/` | 200 | Public | 4 |
| Ankara Halkbank Ticari Şube, 20400 | `/istasyon/ankara-halkbank-ticari-sube-srj-20400/` | 200 | Private | 7 |
| Koç Holding Personel Otoparkı, 17952 | `/istasyon/koc-holding-personel-otoparki-srj-17952/` | 200 | Private | 4 |
| Başakşehir Kalamış Sitesi E15, 21407 | `/istasyon/basaksehir-kalamis-sitesi-e15-srj-21407/` | 200 | Public | 6 |
| Mengerler Samsun, 526 | `/istasyon/mengerler-samsun-srj-526/` | 200 | Public | 7 |
| Trendlife Hotel Uludağ, 1104 | `/istasyon/trendlife-hotel-uludag-srj-1104/` | 404 | Absent | 0 |

All seven sampled active records have unique IDs, unique exact names and location text beyond their district. Zorlu 10682 shares coordinates with 18369 (Zorlu Center Özel Otopark). The records have different access, power and socket counts: public / 400 kW / 5 versus private / 22 kW / 15. Co-location does not establish duplicate records or Google's exclusion reason. Nearby campus/site records also exist for Koç Holding and Başakşehir; there is no evidence supporting consolidation.

### Exact ID 1104

The exact ID `ŞRJ/1104` and Trendlife name are absent from both the 4 October local dataset and the public 12 October nationwide bundle. The local previous snapshot and the last tracked dataset before snapshots were removed from Git are illustrative data, so neither establishes this station's history. The local import-state is dated 7 September and has no missing entry or alias for this ID; tracked alias seeds contain none. Private R2 state and historical production deployments were not accessed.

The live path returns 404 directly, has no canonical, and is absent from the sitemap. No generated HTML links target that path. Existing alias code already produces direct 301s to active IDs, omits removed IDs and protects occupied slugs; existing behavioral tests pass. **Removal cause remains unknown.** Retain the 404 pending private history or source evidence; do not map it to another ID or a guide. No EPDK request was made, and private state was not replaced.

## Validation and release record

- `npm test`: 46 passed, 0 failed. Tests needing mock localhost servers ran with network-capable execution. Existing presentation expectation updated to the explicit dataset-refresh label.
- `npm run build`: passed with 16,909 real station records across 81 cities, refreshed 4 October. This is production-sized data, not a sample build.
- `npm run check:deployment`: 18,022 files, 1,978 remaining under the configured 20,000-file limit; largest asset 5,834,953 bytes, below 25 MiB. Repeat this check in the release workflow against restored current private state.
- Initial HTML: all five selected homepage links have generated targets. Sample-warning branches and dataset selection remain intact.
- Local preview: homepage, directory, Istanbul, Beşiktaş district, Zorlu public and Koç Holding private pages checked at 1440×900 and 390×844. Matching titles/canonicals, nonempty main content, no horizontal overflow, no framework overlay or application console errors. Keyboard activation reaches Istanbul from the homepage. Mobile map expansion and return work; guides hide only in the expanded map view.
- Browser plugin unavailable; used bundled Playwright with installed headless Chrome (bundled browser executable absent). Screenshots and raw audit outputs are temporary files under `/tmp/sarj-indexing-audit/`.
- Existing `smoke:deployment` and `monitor:production` checks passed against **the preceding production release**, not this implementation. Production reports commit `e6dd93bad057dbc60ea0c73ef1bfd7c37007971e`, 16,990 records, 81 cities, dataset refreshed `2026-10-12T09:19:29.612Z`.
- **Deployed successfully:** [code-only workflow run 38237394787](https://github.com/OnurCem/sarj.ist/actions/runs/38237394787), code commit `57d2a13dfd56581e94f8fe6fa2f485396e4bf98a`, Cloudflare version `01805501-73ef-4d36-bfd5-afe9d68699fb`. Upload completed 12 October 2026 at 13:38:08 Europe/Istanbul. All release stages succeeded; EPDK fetch, guard publication and reconciliation were skipped. Private state was restored and validated state published through the existing workflow.
- Final release build used **16,990 real records / 81 cities**, preserving the production dataset refresh `2026-10-12T09:19:29.612Z`. Capacity: **18,107 files**, **1,893 remaining**, largest asset **5,856,200 bytes**. CI passed for the code commit.
- Production browser verification also passed on the six representative routes at both desktop/mobile sizes: no application errors or overflow; keyboard guide links and mobile map expansion/return worked.
- Post-release HTTP/content verification completed at **13:39:48 Europe/Istanbul**: homepage, directory, all five priority cities, Beşiktaş district and public/private station examples returned 200 with correct canonicals, new visible dataset/source text and essential CSS/JS responses. Trendlife remained 404. Production health identifies the deployed code commit; separate post-release smoke and canonical-monitor checks both passed.

Release procedure used (retain for subsequent code-only releases): run GitHub Actions → **Production refresh and deploy**, choose the branch containing these changes, set `refresh_data=false`, `bootstrap=false`, and leave `recovery_url` empty. Preserve all private state objects. Confirm build/capacity, deploy, smoke, private-state publication and canonical-monitor stages. Verify the priority pages show the new content and correct canonicals, CSS/JS return 200, and 1104 still returns a real 404. If availability/navigation regresses, roll back to the preceding successful Cloudflare deployment. Do not bootstrap or fetch EPDK to perform this release.

## Dashboard evidence to collect

### Google Search Console

Before release, select the `sarj.ist` property and inspect the priority URLs below plus the eight station paths in the evidence table. Save the inspection date, indexed/not-indexed reason, last crawl, crawler type, crawl allowed, page fetch, indexing allowed, referring page/sitemap, user canonical and Google-selected canonical. “Test live URL” checks current fetchability; it does not establish current indexing or predict Google's canonical choice.

For failed examples, use **View crawled page** (where available) and save the HTML plus **More info** resource failures/JavaScript output. Run **Test live URL**, then **View tested page** to capture HTML, screenshot and resource details. Note exact test time and timezone for Cloudflare correlation. Disabled historical details mean unavailable evidence, not proof of a cause.

Export **Indexing → Pages** examples and **Performance → Search results** Pages/Queries with date range, search type and filters visible. Retain the original snapshots separately; their counts are from different dates/groupings. Share exports or inspection screenshots/HTML, never account credentials.

After deployment and successful live tests, request indexing once for `/sehir/`, `/sehir/istanbul/`, and up to three materially changed priority pages. Skip unchanged pages already submitted. Do not restart bulk validation without a specific resolved defect. See [Google's URL Inspection guide](https://support.google.com/webmasters/answer/9012289).

### Cloudflare

Select the `sarj.ist` zone → **Security → Events** (dashboard placement may vary). Filter host `sarj.ist`, the audited paths and times around the Search Console crawls/live tests. Capture timestamp/timezone, request path, action, security product/service, rule ID/name, Ray ID, client IP, user agent and verified-bot signal when available. Include block/challenge events and the rule configuration responsible. Export retained events; if no events remain, record historical cause as unknown and correlate new live tests.

A Googlebot user agent alone is not verification. Use Cloudflare verified-bot evidence or [Google's documented crawler verification](https://developers.google.com/crawling/docs/crawlers-fetchers/verify-google-requests). Only a confirmed blocking rule warrants a narrow correction followed by a fresh Search Console live test. Do not disable site-wide protections. See [Cloudflare Security Events documentation](https://developers.cloudflare.com/waf/analytics/security-events/).

For 1104, inspect private R2 history/reconciliation state or retained historical deployments for **exact** ID `ŞRJ/1104`, its previous slug and a removal decision. Request only a redacted relevant excerpt. If the same ID has a new slug, repair its alias; if accidentally omitted, repair import/reconciliation; if removed with no equivalent, keep 404. The current public bundle cannot reconstruct private history.

## Priority tracking list — baseline prepared 12 October 2026

| Priority URL | HTTP verified 12 October | Search Console baseline | Post-release inspection |
| --- | --- | --- | --- |
| `https://sarj.ist/sehir/` | 200 | Pending dashboard export | Live fetch passed; indexing pending |
| `https://sarj.ist/sehir/istanbul/` | 200 | Pending dashboard export | Live fetch passed; indexing pending |
| `https://sarj.ist/sehir/ankara/` | 200 | Pending dashboard export | Live fetch passed; indexing pending |
| `https://sarj.ist/sehir/izmir/` | 200 | Pending dashboard export | Live fetch passed; indexing pending |
| `https://sarj.ist/sehir/bursa/` | 200 | Pending dashboard export | Live fetch passed; indexing pending |
| `https://sarj.ist/sehir/antalya/` | 200 | Pending dashboard export | Live fetch passed; indexing pending |

Deployment timestamp: 12 October 2026, 13:38:08 Europe/Istanbul. Review on **19 October**, **26 October** and **9 November 2026** (deployment +7, +14 and +28 days). At each checkpoint record first/last crawl, guide indexing, sampled station status, impressions and relevant queries with comparable date ranges and filters. Allow reporting lag; reassess unchanged results without automatically deleting pages or resubmitting in bulk. No automation was scheduled.

## Homepage design correction — 12 October 2026

The user explicitly requested that priority-city links not appear on the homepage. Removed the entire new homepage section and its layout overrides, restoring the original map/sidebar dimensions and mobile flow. Kept the original header city-directory link and the station/guide information improvements. The initial release’s homepage screenshots and five-direct-link checks above describe that first release, not the corrected homepage. Follow-up [release 38240919119](https://github.com/OnurCem/sarj.ist/actions/runs/38240919119) succeeded with code commit `be1d3e86ea6aaac6f4579d9839cb5b844bdd92b9`. Live verification at 14:13:25 Europe/Istanbul confirmed no added priority-city links or panel, the original directory menu link, working CSS/JS, retained guide/station information and the preserved Trendlife 404. Production still contains 16,990 records with the same refresh timestamp. Desktop (1440×900) and mobile (390×900) browser checks passed with no application errors or overflow; keyboard directory navigation and mobile map expansion/return work. Original desktop map height is restored to 836 px at a 900 px viewport.
