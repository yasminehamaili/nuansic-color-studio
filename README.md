# Nuansic Color Studio

Build a marketing/product website called "nuansic" - an AI-powered color-palette generator for creatives. FRONTEND-ONLY: the real AI model comes later, so mock all "AI" behavior with isolated, clearly-named functions that are easy to swap for real API calls. No real auth/backend - Sign In/Sign Up are non-functional UI placeholders for now.

BRAND / STYLE
- Background #F5F5F5, primary text #0B0B0B, accent orange #E87323 (used for the word "world" and highlights)
- Palette accent colors used throughout: #B8D8EA, #E1165F, #D8B3DF, #F4D88E, #7783F1, #A2E07D, #7C37FA, #1E997D, #FE564B, #FA9359, #1D5EDE, #FCD402, #FC71CE
- The original design uses two paid custom fonts ("Sinteca" for all body/heading text, "Miracle History" as a script/display font for one accent word). Use close free Google Fonts substitutes: "Sora" wherever Sinteca would be used, and "Caveat" (bold) specifically for the single accent word "world" wherever it appears, in orange. Set up font-family via CSS variables so real font files can be dropped in and swapped later with a one-line change.
- Buttons: large pill/rounded-rect shapes, mostly solid black with white/cream text, some light gray with black text. Playful, colorful, confident vibe - big rounded shapes, generous whitespace, slightly tilted/rotated chips for energy.
- Build pixel-precise against a 1440px desktop canvas using the numbers below, then scale responsively down to tablet/mobile (stack the workspace's two columns, wrap the scattered chips).

1) HEADER (sticky, transparent over hero): "nuansic" wordmark left, bold black 45px at (35,44). "Sign In" pill (bg #bdbab5, text #0b0b0b, 20px, 113x57, radius 30) at (1106,46). "Sign Up" pill (bg #0b0b0b, text #f5f5f5, same size) at (1227,46).

2) HERO
- Headline "pick a color, we'll build" at (334,185), 75px, #0b0b0b; "your" at (561,286), 75px; "world" at (714,259), 100px, in the Caveat accent font, orange #e87323.
- Five ROUNDED-SQUARE color blocks (NOT circles - border-radius ~20px, ~236x236px each), overlapping in a row, drop shadow (0px 0px 7px rgba(30,30,30,0.19)), each rotated: #7783F1 at left~169,top~445 rotate -12.13deg; #F4D88E at left~390,top~429 rotate -1.17deg; #D8B3DF at left~594,top~431 rotate -6.36deg; #E1165F at left~805,top~446 rotate 4.6deg; #B8D8EA at left~995,top~434 rotate 10.64deg. Use exactly these 5 colors, no duplicates or substitutions.
- Two small curved arrow doodles near the blocks (simple black stroke SVGs), one rotated about -126deg, one about 58.65deg.
- Two floating hex-code pill tags: dark-indigo bg (#5162aa) pill reading "#B8D8EA" near (1248,720); orange bg (#e87323) pill reading "#F4D88E" near (277,329).
- Subheadline "AI-powered color palette for designers who knows what they want", centered, 30px, below the headline.
- Black pill CTA "upload an image" (306x72, radius 20, 30px white text) at (567,874) - scrolls to the workspace section and opens the file picker.
- HOVER: each of the 5 blocks swaps to a different color from the full brand palette every time it's hovered (never repeating its current color), smooth 300-400ms color transition, keep rotation and shadow fixed, only the fill morphs.

3) PALETTE WORKSPACE (the core interactive tool - the interaction model matters, read carefully)
- Left: dashed-border drop-zone, 741x597 at (91,110), 2px dashed #6b6863 border, bg #d9d9d9, radius 20, centered text "Upload an image / or / drag and drop" (#6b6863, 25px). Click-to-browse or drag/drop; shows the image preview once uploaded.
- Directly below the drop-zone: a row of 6 rounded swatches (109-110x105, radius 10) at y=736, x=91/218/346/473/600/728. HIDDEN by default (no image yet). Once an image is uploaded, run a client-side dominant-color extraction (canvas pixel sampling) and fill these 6 boxes with the actual top colors extracted from that image. Each of these 6 boxes is CLICKABLE - clicking one sets it as the current "picked color" (see next bullet).
- Right column, top bar (872,125), 529x69, radius 20: this is the "picked color" indicator - its background IS the currently picked color, and it displays that color's hex code as bold centered text (auto-switch text to white or black for contrast). Default picked color before any interaction: the brand orange #E87323.
- "Palette:" label at (872,216), 25px, followed by a second bar (872,272), 470x69, radius 20, bg #d9d9d9: this auto-fills with a row of N color segments forming a tint ramp of the CURRENTLY PICKED color, ordered lightest to darkest (interpolate lightness in HSL from about 90 percent down to about 15 percent, keep hue and saturation constant). Updates live whenever the picked color changes - no category selection needed for this bar. N defaults to 6.
- A plus/minus stepper stacked at x=1357 (34x31 each, bg #d9d9d9, "+" on top, "-" below) next to that bar, adjusting N between 3 and 10.
- Four category pills, bg #0b0b0b, text #f5f5f5, 25px, radius 10: "Graphic Design" 303x54 at (872,382), "UI/UX" 118x54 at (1190,382), "fashion" 144x54 at (872,458), "Interior home design" 335x54 at (1032,458) - visually inverted or highlighted (e.g. orange bg) when selected.
- Output panel 519x289 at (872,552), bg #d9d9d9, radius 10: stays empty until BOTH a color is picked AND a category is selected. Once both are set, run an isolated mock function generateFieldPalette(pickedColor, category, count) that derives a role-labeled palette (Primary, Secondary, Accent, Neutral, Background) seeded from the picked color, lightly flavored per category (e.g. UI/UX biases toward higher contrast pairs, fashion mutes saturation, interior warms the tones, graphic design keeps it vivid - simple heuristics are fine). Display as a row of swatches, each with its HEX CODE TEXT WRITTEN VERTICALLY (writing-mode: vertical-rl or rotate -90deg), click-to-copy.
- Keep every mock function (extraction, tint-ramp, field-palette) in one clearly separated module so they're trivial to replace with real API calls later.

4) "BUILT FOR EVERY CREATIVE": tall rounded-top green blob (#a2e07d, 523x833, about 250px top radius) at (70,0); rounded-top purple blob (#7c37fa, 518x198, about 100px top radius) at (720,635). Build this as ONE cohesive composed block, not scattered - teal (#1e997d) paragraph, then pink (#fc71ce) heading "built for every creative", then the 6 rotated tag chips, all grouped tightly together (no more than about 250-300px of whitespace between elements), the chips clustering near the purple blob. Paragraph text: "is a color playground for creatives. Pick any shade you love, tell us your field, and our AI builds palettes that actually make sense, no more guessing, no more endless scrolling. Just colors that feel right." Six chips, bold about 40px, drop-shadow, rotated -15deg to 12deg: "#UIUX" (red #fe564b bg), "#Graphic" (orange #fa9359 bg, teal text), "#Fashion" (blue #1d5ede bg, yellow text), "#Interior" (pink #fc71ce bg, white text), "#Colors" (light blue #b8d8ea bg, blue text), "#Design" (yellow #fcd402 bg, red text).

5) FOOTER: heading "pick a color. we'll build your world" (world accented) at (82,167). Email input 389x75 at (82,234), bg #f5f5f5, 2px border #1d5ede, radius 20, placeholder "your@email.com" in #fcd402; "subscribe" button bg #1d5ede text #fcd402 at (344,248) radius 15; helper text below in #0b0b0b 17px. Capture email client-side only. Three link columns at x=526/712/898 (heading 25px bold black, links 23px colored, line-height 40): "Product" (color picker #1e997d, ai palettes #7b37fe, image extract #fe564b, saved palettes #fc71ce), "Fields" (ui/ux design #1d5ede, graphic design #fa925b, fashion #fcd402, interior #a2e07d), "Company" (about us #fe564b, contact #7b37fd). "Follow the colors" heading at (1097,96) plus Instagram/Facebook/LinkedIn/TikTok icons (35x35, lucide-react or simple-icons) at y=151. Bottom bar centered, small muted gray text: "(c) 2026 nuansic - made with love and lots of color." and "privacy / terms / cookies".

Smooth hover and tap states on all buttons and swatches throughout.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/25b855ae-8b66-49c4-a231-cb0be87d2201).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
