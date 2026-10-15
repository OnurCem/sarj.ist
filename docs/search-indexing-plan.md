# Search indexing improvement plan

Prepared October 12, 2026. Status: planned; no implementation or deployment performed.

## Objective and boundaries

Improve discovery of important guides and usefulness of station pages, and diagnose concrete failures. Google controls indexing; shipping these changes is not a guarantee of indexing or rankings.

Keep the current static architecture, station URLs, canonical conventions, and historical redirect state. Worker rendering and Cloudflare capacity migration are a separate deferred task. Do not mass-delete or noindex station pages, generate filler, or redirect missing stations to unrelated guides.

## Baseline

The supplied reports show 139 indexed URLs, 16,854 discovered/unindexed URLs in the earlier snapshot, and 22 failed plus two pending crawled/unindexed validation examples in the October 12 export. These are different report snapshots, not synchronized totals. The performance chart covers September 13–October 8 and reports 12 property-level impressions and two clicks. The homepage is indexed; the supplied inspections show the city directory and Istanbul guide as discovered/unindexed.

Record current per-URL inspection status before release. Save report date ranges and grouping, and compare like-for-like measurements. A Search Console inspection is required to confirm indexing; ordinary HTTP fetches cannot do that.

## 1. Make priority guides prominent

- Update `src/pages/index.astro` with a compact, visible city-guide section using ordinary server-rendered anchor links.
- Start with Istanbul, Ankara, Izmir, Bursa, and Antalya when present in the active dataset; retain the all-cities link. Do not label this selection as popularity data.
- Use descriptive Turkish link text such as “İstanbul şarj istasyonları.” Keep links visible on mobile and outside dialogs or JavaScript-only map controls.
- Adjust `src/styles/discovery.css` or existing layout styles without obstructing the map, results, or location controls.
- Acceptance: each selected city is reachable directly from the homepage in initial HTML, every target exists, keyboard navigation works, and desktop/mobile layouts remain usable.

## 2. Improve practical page information

- Add a short visible homepage explanation of coverage, filters, data source, and the lack of live availability.
- Update `src/pages/istasyon/[slug].astro` and guide templates to reuse `datasetPresentation()` for source and dataset refresh information.
- Present the existing `area` location text clearly. It can fall back to district text in the adapter, so do not universally label it a complete street address.
- Explain access restrictions using known data. Do not invent opening hours, entrance instructions, connector standards, prices, or live operational status.
- Label dates as dataset refresh dates, not individual station verification dates. Preserve sample-data warnings and existing directions/nearby alternatives.
- Improve guide introductions with useful existing counts and an explanation of how to choose a district or station. Avoid repeated keyword paragraphs.
- Acceptance: information is readable in initial HTML, accurate against the source model, and useful on both station and guide pages without requiring map interaction.

## 3. Audit five failed URLs and resolve the reported 404

Initial failed sample: T7 Petrol Düzce Merkez (5489), Dedeman Ski Lodge (778), Zorlu Center (10682), Ankara Halkbank Ticari Şube (20400), and Koç Holding Personel Otoparkı (17952). Compare with indexed examples from the performance export, including Başakşehir Kalamış Sitesi (21407) and Mengerler Samsun (526). Verify current indexed status rather than assuming the older report still applies.

- For each, record status/redirect chain, robots directives, canonical, sitemap membership, incoming HTML links, rendered main content, and essential resource failures. Compare Google’s crawled HTML/rendering where available with current HTML.
- Check duplicate IDs, near-identical records, sparse location information, and differences in public/private access. Similarity alone is not proof of Google's exclusion reason.
- Trace Trendlife Hotel Uludağ (1104) by exact station ID through available dataset history, aliases, reconciliation state, and deployment history. Do not confuse it with IDs containing 1104.
- If the same station moved to a new slug, repair its historical alias and direct 301. If accidentally omitted, fix the pipeline and restore it. If legitimately removed without an equivalent replacement, retain a real 404 and exclude obsolete internal links/sitemap entries. If history is unavailable, record that uncertainty instead of guessing.
- Audit existing redirect behavior before adding code; alias tracking already exists. Preserve private R2 history and the EPDK one-request-per-hour guard.
- Acceptance: the audit records observed evidence separately from hypotheses; confirmed defects have targeted fixes and checks; an intentional 404 is an acceptable outcome.

## 4. Check Cloudflare crawler access

- Use Cloudflare security events/logs, if available, around the reported crawls and new live tests. Filter relevant host/paths and inspect block/challenge actions and responsible rules.
- Identify genuine Google requests using verified-bot information or Google's documented IP verification; a Googlebot user-agent string alone is insufficient.
- Compare Google Search Console live fetches with ordinary clients. Python 403 versus curl 200 is only a diagnostic clue.
- If a specific rule blocks verified Google crawling, prepare the narrowest appropriate rule correction. Do not disable site-wide protection or allow every request claiming to be Googlebot.
- Acceptance: documented rule evidence and successful follow-up fetches if a correction is needed. If no retained logs or access exist, mark the historical cause unknown and use current live tests; do not block independent content work.
- Dependency: connected Cloudflare access or a user-supplied event export. Google crawled-page details may also require Search Console access or exports.

## 5. Release, request indexing, and measure

- Run relevant existing tests, `npm test`, `npm run build`, and `npm run check:deployment`. Use a production-sized dataset for the final capacity check; sample data does not prove deployment headroom.
- Inspect generated HTML and browser layouts for the homepage, city directory, Istanbul guide, district guide, and representative public/private station pages. Confirm links, canonicals, real 404s, and essential CSS/JS responses.
- Add behavioral regression tests only for substantive fixes, especially alias handling or normalization; avoid tests that merely assert marketing copy.
- Release via the existing code-only deployment workflow using preserved production data/state. Run existing production smoke checks and verify the selected URLs after deployment. Roll back to the preceding successful deployment if availability or navigation regresses.
- In Search Console, live-test and request indexing once for `/sehir/`, `/sehir/istanbul/`, and up to three materially improved priority pages. If a request was already made for unchanged content, do not repeat it. Do not restart bulk validation without a concrete resolved issue.
- Review after 7, 14, and 28 days from deployment: first/last crawl dates, guide indexing, sampled station status, impressions, and relevant queries. Separate indexing from ranking and allow reporting lag. Do not schedule an automation unless requested.
- Engineering completion means deployed, verified improvements and a recorded baseline. SEO success is measured separately by new crawls/indexed priority pages and relevant impressions; lack of movement triggers reassessment, not automatic deletion or further bulk submissions.

## Execution order and deliverables

Start with the URL audit and Cloudflare evidence collection (items 3–4). Use findings to implement homepage links and content improvements (items 1–2), plus any confirmed technical fixes. Finish with validation, release, and Search Console follow-up (item 5).

Deliver a short evidence table, one cohesive code change, test/build and production-size results, a deployment verification record, and a dated tracking list of priority URLs. Cloudflare configuration changes, if needed, should be documented separately from code changes.

## References

- Google developer SEO guidance: https://developers.google.com/search/docs/fundamentals/get-started-developers
- URL Inspection: https://support.google.com/webmasters/answer/9012289
- Indexing status definitions: https://support.google.com/webmasters/answer/7440203
- Recrawl requests and limitations: https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl
