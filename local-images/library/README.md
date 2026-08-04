# Private photo library

These source photos are organized for selection but are not configured for publication. They stay
ignored by Git and Vercel, and the image pipeline ignores them until a matching `*.image.json`
sidecar is added.

The descriptions below are working visual notes, not final alternative text. Write alt text for the
photo's actual purpose and context when it is placed on a page.

## Events

| Organized source                            | Camera name     | Size        | Visual note                         | Possible role    |
| ------------------------------------------- | --------------- | ----------- | ----------------------------------- | ---------------- |
| `events/2023-06-03-reception-candid.jpeg`   | `IMG_4693.jpeg` | 1536 x 2048 | Couple walking at a reception       | Memory gallery   |
| `events/2023-06-03-reception-portrait.jpeg` | `IMG_4709.jpeg` | 1536 x 2048 | Formal couple portrait at reception | Story or gallery |

## Portraits

| Organized source                                        | Camera name     | Size        | Visual note                                 | Possible role            |
| ------------------------------------------------------- | --------------- | ----------- | ------------------------------------------- | ------------------------ |
| `portraits/2024-08-03-oceanfront-portrait.jpeg`         | `IMG_6009.jpeg` | 2048 x 1536 | Landscape couple portrait overlooking ocean | Wide feature candidate   |
| `portraits/2025-03-15-woodland-formal-portrait.jpeg`    | `IMG_5016.jpeg` | 1536 x 2048 | Formal portrait on a tree-lined path        | Story portrait candidate |
| `portraits/2026-05-02-golden-gate-formal-portrait.jpeg` | `IMG_8758.jpeg` | 1536 x 2048 | Formal portrait with Golden Gate Bridge     | Story or gallery         |

## Travel

| Organized source                                                   | Camera name     | Size        | Visual note                           | Possible role    |
| ------------------------------------------------------------------ | --------------- | ----------- | ------------------------------------- | ---------------- |
| `travel/france/2024-02-29-paris-eiffel-tower-selfie.jpeg`          | `IMG_6329.jpeg` | 1536 x 2048 | Night selfie beneath the Eiffel Tower | Travel memory    |
| `travel/usa/2024-07-18-washington-dc-rooftop-sunset-portrait.jpeg` | `IMG_4876.jpeg` | 1536 x 2048 | Rooftop portrait at sunset            | Story or gallery |
| `travel/usa/2024-07-18-washington-dc-rooftop-sunset-kiss.jpeg`     | `IMG_4881.jpeg` | 1536 x 2048 | Rooftop kiss with sunset skyline      | Story or gallery |

## Engagement trip

| Organized source                                                   | Camera name     | Size        | Visual note                              | Possible role              |
| ------------------------------------------------------------------ | --------------- | ----------- | ---------------------------------------- | -------------------------- |
| `engagement-trip/granada/2025-10-21-alhambra-overlook-selfie.jpeg` | `IMG_6973.jpeg` | 1536 x 2048 | Couple selfie overlooking the Alhambra   | Engagement story           |
| `engagement-trip/granada/2025-10-21-granada-sunset-kiss.jpeg`      | `IMG_6985.jpeg` | 1536 x 2730 | Sunset kiss above Granada                | Engagement story           |
| `engagement-trip/granada/2025-10-22-alhambra-fortress-selfie.jpeg` | `IMG_7073.jpeg` | 1536 x 2048 | Couple selfie inside the Alhambra        | Engagement story           |
| `engagement-trip/granada/2025-10-22-proposal-ring-selfie.jpeg`     | `IMG_7137.jpeg` | 1536 x 2048 | Close selfie showing the engagement ring | Proposal moment            |
| `engagement-trip/granada/2025-10-22-proposal-garden-selfie.jpeg`   | `IMG_7154.jpeg` | 1536 x 2048 | Garden selfie showing the ring           | Proposal moment            |
| `engagement-trip/granada/2025-10-22-alhambra-garden-portrait.jpeg` | `IMG_7178.jpeg` | 2048 x 1536 | Landscape couple portrait in the gardens | Wide feature candidate     |
| `engagement-trip/seville/2025-10-24-giralda-portrait.jpeg`         | `IMG_7454.jpeg` | 1536 x 2048 | Couple portrait near the Giralda         | Engagement trip or gallery |

## Selection workflow

1. Choose a source based on the page's composition and story.
2. Add a same-basename `*.image.json` sidecar with a stable asset ID, contextual alt text, and only
   the crop variants that page needs.
3. Run `pnpm images:prepare` and review every local crop.
4. Run `pnpm images:sync` only when the selected derivatives are ready to become public.
