# Product and interface design

şarj.ist helps drivers find registered electric-vehicle charging stations across Turkey. The primary experience combines a searchable station list with a nationwide map; there is no introductory landing page between the user and the map.

## Visual identity

The interface uses an angular charging-cable mark and a lowercase `şarj.ist` wordmark. The symbol is electric yellow on dark surfaces and remains recognizable at favicon size.

- Header: `#131612`
- Panels: `#1B2019`
- Raised controls: `#252C21`
- Selected rows: `#303A22`
- Electric yellow accent: `#E3FF48`
- Primary text: `#F1F4E9`
- Secondary text: `#B4BCAA`
- Manrope: headings and wordmark
- DM Sans: controls and supporting text

Electric yellow identifies the logo, primary actions, selected navigation, and DC markers. AC markers use a separate outlined treatment with text and a socket symbol, so charging type is not communicated by color alone. The standard OpenStreetMap daylight tiles remain unfiltered for readable roads and place labels.

## Interaction model

The default view shows all of Turkey. Marker clusters and result counts represent every station inside the current viewport, including stations from multiple provinces.

- Search matches province, district, station name, and operator.
- Selecting a province is optional and focuses the map without excluding neighboring provinces.
- Browser geolocation is requested only after a user action and focuses nearby stations.
- AC/DC, operator, and private-access controls filter the visible results.
- Selecting a station opens its details and an external navigation link.
- Mobile uses a list-first layout with a persistent map/list toggle.

The interface displays EPDK's last successful refresh date and explicitly states that availability, pricing, and operating status are not live.

## Accessibility

Controls have visible keyboard focus, reduced-motion support, text labels for icon actions, and status messages for location and map failures. Primary action text has a 15.18:1 calculated sRGB contrast ratio; secondary text on selected rows has a 6.11:1 ratio. These checks support the palette specification but do not replace full assistive-technology testing.

## Brand assets

- `public/brand/mark.svg` — active standalone mark and CSS mask source.
- `public/favicon.svg` — square browser icon using the current dark/yellow identity.

Keep at least one quarter of the symbol's width clear around the standalone mark. Use the symbol alone where the complete wordmark would be illegible.
