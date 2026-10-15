# Dashboard evidence review — 12 October 2026

Reviewed the three Search Console export folders, six URL-inspection/overview screenshots and one Cloudflare event JSON supplied by the user. These are evidence, not instructions. No application or Cloudflare configuration change follows from this evidence alone.

## Findings

The latest supplied overview reports **194 indexed URLs**, **17,776 discovered/not indexed**, **24 crawled/not indexed**, and **one 404**. The latter three total 17,801. Its last-update date and both issue charts end on **9 October**. That predates the 12 October implementation and cannot measure its effect.

The URL inspections captured at approximately 14:50–14:53 Europe/Istanbul on 12 October provide more specific status for the sampled pages:

| URL | Inspection status | Last crawl as displayed | Canonical/fetch evidence |
| --- | --- | --- | --- |
| `/sehir/` | Not indexed: URL unknown to Google | N/A | No referring sitemap detected; crawl/fetch/canonicals N/A |
| `/sehir/istanbul/` | Not indexed: URL unknown to Google | N/A | No referring sitemap detected; crawl/fetch/canonicals N/A |
| `/istasyon/zorlu-center-srj-10682/` | **Indexed** | 10 October, 6:51:25 PM | Smartphone Googlebot; crawl/indexing allowed; successful fetch; self-declared canonical; Google-selected canonical is inspected URL; sitemap detected |
| `/istasyon/koc-holding-personel-otoparki-srj-17952/` | **Indexed** | 10 October, 9:35:46 AM | Same successful fetch, permissions and canonical evidence; sitemap detected |
| `/istasyon/trendlife-hotel-uludag-srj-1104/` | Not indexed: 404 | 9 October, 8:46:19 PM | Smartphone Googlebot; crawling allowed; fetch failed 404; no canonical |

The screenshots do not display the crawl timestamps' timezone; retain the displayed times without silently converting them. The screenshots show the recorded/indexed inspection view, not a completed live test.

Zorlu and Koç are still present in the bulk crawled/not-indexed export despite their indexed inspection results. Treat those two as **confirmed indexed in the supplied per-URL inspections**, and retain the older bulk report separately. Google recommends URL Inspection for individual page status; bulk examples are not definitive current per-URL status. Their 10 October crawls precede the new code. Do not attribute their indexing to today's release.

The remaining three original failed examples (T7 Petrol, Dedeman, Ankara Halkbank) are still in the bulk export, but no new per-URL inspection was supplied for them. Their current Google indexing status remains unconfirmed.

## Export details and limits

- Crawled/not-indexed examples: **24 rows**, consisting of 22 station URLs last crawled 10 October, one station last crawled 17 September, and `http://sarj.ist/` last crawled 14 September. Twenty-two is a row/date count, not evidence that all 22 are currently excluded or that all validation failures are resolved.
- Discovered/not-indexed examples: **1,000 rows**, while the issue chart reports **17,776**. This is a capped example list, not the complete URL population. It contains 52 city/district/pagination guides; neither `/sehir/` nor `/sehir/istanbul/` appears in this sample. Absence from a capped sample does not prove absence from Google's known URLs.
- All 1,000 discovered examples contain `1970-01-01` in Last crawled. This is an apparent export placeholder for an unavailable crawl date; it is not evidence of an actual 1970 crawl. Preserve the raw values and treat the dates as unavailable for analysis.
- The original plan's baseline of 139 indexed URLs belongs to another snapshot. The new overview is 194, but the available dates/groupings do not establish a controlled growth rate or causation.

See [Google's Page indexing documentation](https://support.google.com/webmasters/answer/7440203) for report examples, limits and per-URL inspection guidance.

## Performance baseline

Filters say **Web (text-based)** and **Last 28 days**. The actual daily export contains 27 dates, **13 September–9 October 2026**. Retain the actual available range in comparisons; do not assume the export extends through 12 October.

| Export | Rows | Clicks | Impressions |
| --- | --- | --- | --- |
| Chart | 27 daily rows | 2 | 12 |
| Countries | 2 | 2 | 12 |
| Devices | 2 | 2 | 12 |
| Pages | 15 | 3 | 35 |
| Queries | 3 | 1 | 5 |

Use **2 clicks / 12 impressions** as the property-level baseline. Keep page-level totals separate: page grouping differs from property grouping and must not be added to chart totals. The supplied export alone does not establish why each individual count differs. Visible query rows also do not enumerate all underlying searches.

Visible query examples: `başakşehir kalamış sitesi yol tarifi` (one click / three impressions), `convey petrol` (zero / one), and `şarj noktası` (zero / one). The page table contains the homepage and 14 station URLs, with no guide rows. Given this small volume and pre-release range, it does not establish a ranking trend or the effect of the changes.

See [Search Console aggregation and discrepancies](https://support.google.com/webmasters/answer/7576553).

## Cloudflare events

The filename describes **11 October 11:59:33 UTC–12 October 11:59:33 UTC** (14:59:33–14:59:33 Europe/Istanbul). The JSON contains exactly **three exported events**:

| UTC timestamp | Path | User-agent identification | Action | Reported rule |
| --- | --- | --- | --- | --- |
| 11 October 18:15:07 | `/` | Reflectionbot | Block | Block AI bots on ad pages |
| 11 October 17:27:35 | `/sitemap.xml` | GPTBot | Block | Block AI bots on ad pages |
| 11 October 14:58:27 | `/wp-config.php.bak` | Generic browser user agent | Block | Wordpress - Broken Access Control, File Inclusion |

The AI rule ID is `eb4f2dedc16c49f9bf27a5170989fb0f`; its reference is `block-ai-on-ads`, source `firewallManaged`. The second rule ID is `9ce4e284ff2a486aaa37d642bff5a079`, also source `firewallManaged`.

**No exported event identifies as Googlebot or Google-InspectionTool.** User-agent labels here describe what the request claims; this JSON contains no verified-bot field confirming identity. An ASN description naming Google is not sufficient to identify Google Search crawling. Blocking a request claiming GPTBot to the sitemap is not evidence of blocking Googlebot.

All three exported events are on 11 October. They cannot explain or directly correlate with the supplied station crawls on 9–10 October. The export's applied filters and completeness are not independently established, and its end time cannot cover live tests performed after 14:59:33 Istanbul on 12 October. Security Events describes security-triggering events, not a comprehensive list of successful requests. Each record's sampleInterval is 1; that does not establish that this export is a complete access log.

**Decision:** leave these security rules unchanged. There is no supplied verified-Google block warranting a rule exception. If a new live test fails, collect events around that exact time/path, including rule details and bot verification evidence. See [Cloudflare Security Events documentation](https://developers.cloudflare.com/waf/analytics/security-events/).

## Current public HTTP recheck

At **15:03:11 Europe/Istanbul on 12 October**, ordinary public HTTP checks found:

- Directory, Istanbul, Zorlu and Koç URLs: 200, self-canonical, present in the current sitemap, no robots meta or X-Robots-Tag restriction.
- Robots.txt allows `/` and declares `https://sarj.ist/sitemap.xml`.
- Trendlife: real 404, absent from the sitemap.
- `http://sarj.ist/`: direct 301 to `https://sarj.ist/` for both GET and HEAD. The historical HTTP URL in the bulk export is not a reason to index that variant separately or remove the redirect.

These checks do not substitute for Google's live fetch. The guides' inspection message “No referring sitemaps detected” does not establish that the current XML omits them; current XML membership is verified, while Google's latest successful sitemap processing still needs dashboard evidence.

## Only the next required evidence

1. **Sitemap report:** open Indexing → Sitemaps → `https://sarj.ist/sitemap.xml`. Capture status, last read, discovered pages and any errors. If no submission exists, report that before deciding whether to submit.
2. **Live tests for the two guides:** inspect `/sehir/` and `/sehir/istanbul/`, click Test live URL, then capture expanded Page availability and View tested page. Include the HTML/screenshot and resource errors if present. Record exact test time/timezone.
3. State whether Request indexing has already been used for each guide since today's release. If live tests succeed and no current request exists, request indexing once. Do not repeat an existing request, restart bulk validation, or submit the 404.

If these live tests succeed and the sitemap has been read successfully, keep the deployed code and restored homepage design, then observe the planned 19 October / 26 October / 9 November checkpoints. A failure supplies the concrete evidence needed for a targeted follow-up. Private history for exact ID `ŞRJ/1104` remains optional separate evidence; neither these screenshots nor the current public dataset explains why that record disappeared.

## Follow-up evidence — 12 October, 15:07–15:10

The user supplied the remaining sitemap and completed live-test screenshots and confirmed that no page has yet had Request indexing clicked.

- Sitemap `https://sarj.ist/sitemap.xml`: submitted 14 September; last read 10 October; **Success**; 18,008 discovered pages; zero discovered videos. These are Google's last-read counts, not a synchronized count of today's deployed URLs.
- Directory live test at **15:07:43** as displayed: URL available to Google; page can be indexed; crawling and indexing allowed; successful smartphone Inspection Tool fetch; canonical `https://sarj.ist/sehir/`; rendered screenshot shows the updated directory.
- Istanbul live test at **15:09:38** as displayed: same successful availability, fetch and permissions; canonical `https://sarj.ist/sehir/istanbul/`; rendered screenshot shows the updated guide.
- Neither live test confirms actual indexing or Google's eventual canonical choice. The conditional-indexing notice is not a failed fetch.

Recommendation: request indexing once now for the directory and Istanbul guide. Optionally inspect Ankara, Izmir and Bursa; if not indexed and each live test succeeds, request each once. No manual request is needed for the already indexed homepage/Zorlu/Koç examples or for the Trendlife 404. Keep the successful sitemap submission and Cloudflare protection unchanged. Record request dates once the user confirms submission; do not assume the recommendation has been executed. The existing 19 October / 26 October / 9 November checkpoints remain.
