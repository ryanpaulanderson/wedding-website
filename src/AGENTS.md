# HTML and CSS project rules

## Scope and styling standard

- This file supplements the root `AGENTS.md` for HTML, JSX, CSS, responsive design, and UI accessibility under `src/`.
- Use plain `.module.css` CSS Modules and native CSS custom properties. Put shared tokens in `src/styles/tokens.css`, import that file first from `src/app/globals.css`, and import only `globals.css` from the root layout.
- Match component files (`Button.tsx`, `Button.module.css`, `Button.test.tsx`) and use camelCase module classes such as `styles.iconButton`.
- Use `clsx` as the only conditional class-name helper once needed. Do not mix in Tailwind, Sass, CSS-in-JS, or broad component-library styles without an explicit repository-level architecture change.
- Target WCAG 2.2 Level AA. Accessibility, responsive behavior, and progressive enhancement are acceptance criteria.

## Semantic HTML

- Use the native element matching the job: links with `href` for navigation, buttons for actions, and native form controls before generic elements or ARIA.
- Use appropriate landmarks (`header`, `nav`, one active `main`, `aside`, `footer`) and a logical heading hierarchy. Choose heading levels for structure, never visual size.
- Provide a descriptive page heading and unique title through Next.js metadata. Set the document language in the root layout and mark passages in another language.
- Keep DOM, reading, visual, and focus order coherent; do not use flex/grid reordering to repair incorrect source order.
- Use lists for lists and tables only for tabular data. Give tables a useful caption and associated headers; put an intrinsically wide table in its own labeled scroll region on narrow screens.
- Use descriptive link text. When repeated navigation precedes content, provide a keyboard-visible "Skip to main content" link.
- Add ARIA only when native HTML cannot express the semantics. Roles, states, and properties must be accurate, and custom widgets must implement the WAI-ARIA Authoring Practices keyboard model.

## Forms and feedback

- Every control needs an accessible name; prefer visible text and give icon-only controls a concise programmatic name. Use `<button type="button">` for non-submit actions inside forms; never use clickable `div`/`span` controls.
- Give each data-entry field (`input`, `select`, `textarea`, or custom equivalent) a persistent visible label via `htmlFor`/`id` or valid wrapping. A placeholder is a hint, not a label.
- Group related choices with `fieldset`/`legend`. Use suitable input types, `name`, JSX `autoComplete`, and `inputMode` so browsers and assistive tools can help.
- Put required-state, format, and constraint instructions before the field. Do not rely on color, an asterisk alone, or placeholder text.
- Validate on the server even when client validation improves responsiveness, and preserve entered values after failure.
- Make errors specific and actionable, associate field errors with `aria-describedby`, and announce new summaries/status without stealing focus unnecessarily. Move focus when it is the clearest recovery path.
- Preserve useful native form and link behavior before JavaScript loads; progressively enhance it when practical.

## Keyboard and focus

- All functionality must work by keyboard. Do not use positive `tabIndex` or make non-interactive content focusable without a defined interaction model.
- Preserve a clearly visible `:focus-visible` indicator. Never remove `outline` without an equal replacement, and ensure sticky UI or overlays do not cover focus.
- For dialogs, menus, and popovers, set sensible initial focus, contain it only when required, support expected Escape behavior, and restore focus to the invoker.
- Make hover-only content/actions available to keyboard and touch. Avoid precision gestures when a simple control can provide the same action.
- Targets must meet WCAG 2.2's 24 by 24 CSS-pixel minimum or spacing exception; aim for about 44 by 44 pixels for important controls.

## Images and media

- Give informative images purpose-based alt text, decorative images `alt=""`, and functional images text describing their action/destination. Avoid essential text in images.
- Reserve intrinsic space with dimensions or aspect ratio. For `next/image`, provide dimensions or a correctly sized `fill` container plus an accurate responsive `sizes` value.
- Use responsive, compressed assets. Lazy-load offscreen media, but do not defer the true above-the-fold/LCP image without measurement; use APIs supported by the installed Next.js version.
- Provide captions for meaningful prerecorded video, an equivalent for audio, and accessible playback controls.

## CSS architecture and formatting

- Keep `globals.css` to reset/normalization, document defaults, base typography, and intentional site-wide primitives. Keep component/feature presentation in CSS Modules.
- Define semantic tokens in `tokens.css` for color, typography, spacing, radii, elevation, and motion. Name by role (`--color-text-muted`), not raw appearance; keep internal-only values local to a component.
- Prefer simple classes and low specificity. Avoid IDs, deep descendant chains, and `!important`; document any deliberate exception.
- Keep module selectors shallow. Use `:global(...)` only at an intentional integration boundary and explain why.
- Avoid inline styles for static presentation. For genuinely runtime-derived values, prefer a typed CSS custom property.
- Prettier owns whitespace/wrapping. Keep one declaration per line, group related concerns consistently, and comment reasons rather than restating declarations.
- Prefer native CSS capabilities before preprocessors: custom properties, shallow nesting, cascade layers, Grid, container queries, and modern functions.
- Remove obsolete selectors, duplicate responsive branches, and hard-coded values that bypass tokens when changing a component.

## Responsive and resilient layout

- Start with readable normal flow for narrow screens. Add content-driven breakpoints when the composition needs them; do not target named devices or copy arbitrary breakpoint sets.
- Prefer fluid sizing, Grid for two-dimensional layout, Flexbox for one-dimensional distribution, and container queries for components that respond to their container.
- Use relative/fluid units and logical properties where scaling or writing direction matters. Pixels remain valid for borders and exact raster constraints; avoid blanket unit rules.
- Avoid fixed heights for text-bearing controls/containers. Allow wrapping and growth under localization, font preferences, and zoom.
- Ordinary content must reflow at 320 CSS pixels without loss or two-dimensional page scrolling. Do not hide layout defects with global `overflow-x: hidden`.
- Keep prose readable with sensible max inline sizes and use `min()`, `max()`, `clamp()`, and `minmax()` when they reduce brittle breakpoints.
- Never disable browser zoom. Verify text at 200% text zoom and page reflow at 400% page zoom.

## Color, motion, and performance

- Meet 4.5:1 contrast for normal text, 3:1 for large text, and 3:1 for meaningful controls, boundaries, icons, and focus indicators. Test rendered combinations.
- Never use color alone for status, selection, errors, or required fields. Provide another visible and programmatic cue.
- Define relevant hover, focus-visible, active, selected, disabled, loading, success, and error states; keep disabled content legible.
- Respect `prefers-reduced-motion: reduce`, avoid parallax/large motion by default, never flash more than three times per second, and provide controls for long-running auto-starting motion.
- Transition named properties, not `all`. Prefer `transform`/`opacity`; use `will-change` only after measurement.
- Let forced-colors/high-contrast modes work. Never globally disable forced-color adjustment.
- Preserve a usable HTML baseline, add CSS fallbacks before fragile enhancements, and use feature queries where needed.
- Keep shipped CSS/client styling code small and remove unused rules. Load only needed font families, weights, and styles; optimize only after correctness and measurement.

## UI verification

- Test relevant flows by keyboard and inspect focus order/visibility, names, roles, states, labels, errors, headings, landmarks, and alt text.
- Check narrow and wide layouts, including 320 CSS pixels, long content, text enlargement, and zoom; no content may be clipped or unreachable.
- Check reduced-motion and forced-colors/high-contrast modes when relevant, and verify contrast with a suitable tool.
- Run axe when configured, but do not substitute it for keyboard and visual inspection. Exercise loading, empty, error, success, and interaction states, not only the ideal screenshot.

## Primary references

- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [MDN: accessible HTML](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Accessibility/HTML)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/practices/read-me-first/)
- [WAI forms tutorial](https://www.w3.org/WAI/tutorials/forms/)
- [WAI images tutorial](https://www.w3.org/WAI/tutorials/images/)
- [MDN: responsive design](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout/Responsive_Design)
- [MDN: reduced motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/prefers-reduced-motion)
- [Next.js CSS styling](https://nextjs.org/learn/dashboard-app/css-styling)
