# Volt dark mode

The accepted Volt direction is now implemented as the default local dark appearance in `src/styles/volt-dark.css`. The existing layout and angular C identity are retained. No theme switcher is included.

Electric yellow #E3FF48 is reserved for primary actions, DC markers, selected navigation and the logo. Warm near-black #131612 frames panels in #1B2019. Selected rows use #303A22. Primary text is #F1F4E9 and secondary text is #B4BCAA. AC markers retain their own outlined shape, AC text and socket symbol rather than relying on color alone.

Calculated sRGB contrast: action labels 15.18:1; body text 14.88:1; secondary text on selected rows 6.11:1; control borders against the panel 3.97:1. These specific color checks are not a full accessibility certification.

Browser checks covered desktop at 1536×1024 and mobile at 390×844, AC filtering and mobile selection opening the correct station details. No browser console errors were reported. The Astro production build passed.

Compared with Volt's light reference: layout, headings, station-row structure, selected detail and logo geometry are retained. Dark surfaces, outlined AC markers, larger supporting text and dark native form controls are deliberate adaptations. The map currently uses a CSS filter over the existing raster tiles; individually styled dark-map labels remain a production map-provider task.

Screenshots: `palettes/05-volt-dark.png` and `palettes/05-volt-dark-mobile.png`.
