# şarj.ist design direction

The interface helps a driver compare nearby charging options without promising live socket availability. The map and station list are the main experience, with no landing-page step.

## Identity

The mark combines a compact lightning stroke with a detached cedilla, referencing the Turkish “ş”. A rounded forest-green tile keeps the symbol recognizable at app-icon size. The lowercase wordmark feels approachable; the quieter `.ist` connects it to its web address. The standalone symbol is vector geometry. The wordmark uses a system sans-serif fallback and can be outlined in a vector editor before print production.

- Forest `#193B35`: text, selected filters, primary map markers.
- Electric lime `#D5F36B`: selected map marker and principal actions.
- Leaf `#719454`: AC markers, with an accompanying socket icon and text so color is never the only distinction.
- White `#FFFFFF`: working surfaces.
- Pale green `#F3F7E9`: selected station card.
- Manrope: headings and interface wordmark. DM Sans: controls and supporting text.

Keep at least one quarter of the symbol’s width clear around it. Use the app mark at 24 px or larger. For small favicons use the symbol alone. Prefer the one-color mark where lime cannot reproduce clearly.

## Main flow

1. Search or filter by charging type. Public access is the default; private stations require explicit inclusion.
2. Compare operator, location, power and socket count in the result list. Power is capacity, not availability.
3. Select a result or map marker to inspect details. On mobile this reveals the map with the detail sheet.
4. In the production experience, continue to external navigation after real station coordinates are connected.

Desktop uses a fixed-width result panel beside a fluid map. Mobile starts with the searchable list and provides an anchored map/list toggle. No location permission is requested on entry.

## Production handoff

Connect validated EPDK records and show their last successful refresh timestamp. Replace example labels only when real data is available. Implement the planned static station/city routes, regional data loading and marker clustering. Validate the full supplied station snapshot and production map provider separately. The design prototype includes eight sample records to demonstrate filtering and detail states.

Before release, conduct browser and assistive-technology testing at desktop/mobile sizes and 200% text enlargement. Confirm branding availability before treating the concept as a registered identity.

## Palette alternatives

The comparison sheet in `palette-options.svg` shows five complete directions using the same interface anatomy:

- **01 Bordo / pudra** — current direction; editorial and warm.
- **02 Orman / limon** — natural, energetic, and strongly associated with charging.
- **03 Grafit / kayısı** — urban, active, and high contrast.
- **04 Gece / lavanta** — technical, calm, and premium.
- **05 Patlıcan / gül** — expressive and distinctive.

The prototype remains on 01 until you choose a palette.
