# Pradera finishing pass — review status

Implemented on PR #4; not merged or deployed.

## Visual audit and changes

- Mobile tiers previously formed a tall vertical stack; all four Audio tiers now use a compact 2 × 2 selector, and the other categories show three choices across. Details precede the scaled floor plan.
- Replaced shared JavaScript zoom with responsive type and spacing. Sections use a viewport minimum, not a clipped fixed height. Long content remains available by ordinary scrolling.
- Native proximity snapping applies on desktop and mobile, with no forced stop or wheel/touch interception. Reduced-motion preference disables snapping and smooth scrolling.
- Korta V4 Ink/Paper/Forest surfaces continue across the page. Audio Reference stays off-white.
- Separate SVG uses the original Illustrator letterform paths, recolored #28775C for this page. DENVER AV GUY is centered underneath in outlined Instrument Sans; no external font dependency within the logo.
- Hero heading, eyebrow and bottom-right PRADERA use actual HTML and the specified Schibsted Grotesk / Instrument Sans / IBM Plex Mono roles.
- Added Next/Review links, tab/panel relationships, arrow/Home/End keyboard navigation and visible focus styling.

## Pending asset — do not deploy as the final hero

IMG_7851.jpeg is absent from the synced project directory, the referenced conversation's returned attachments, and the local filename search. The hero currently uses a forest background. Attach the original photo to complete its crop and contrast QA. Set `--pr-hero-photo: url('./assets/pradera-sunset.webp')` on `.hero-scene` after adding the approved asset; no generated replacement photograph has been substituted.

## Verification

- Chromium: 320×568, 375×667, 390×844, 430×932, 667×375, 768×1024, 1024×768, 1100×700, 1280×720, 1440×900 and 1920×1080.
- All 13 tier views and selections exercised at every size (143 checks); deselection, summary tiers and totals verified. Maximum package total: $53,500. No horizontal viewport overflow or page JavaScript errors.
- Playwright WebKit and Firefox: all four category selections, total and horizontal overflow checked at 390×844, 768×1024 and 1440×900. These are browser-engine checks, not physical-device testing.
- Existing required-field validation and print invocation exercised; filled allowance PDF rendered and visually inspected as one unclipped page.
- Reduced-motion fallback and keyboard tier navigation checked.
- Source comparison confirms unchanged package scopes, descriptions, specifications, tiers, prices, selection component, PDF validation/print script and support.js.

At 390×844 and 430×932, the hero and each category fit within a viewport. The final form and some sections on shorter/narrower or landscape screens intentionally extend vertically to preserve legibility and access. A fully filled form cannot be made readable in every phone viewport without hiding information or introducing extra steps. No section content is trapped or clipped.
