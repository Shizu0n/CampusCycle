# Design System — CampusCycle ("Xilo-Feira")

> **Day-1 checklist (done):** this file lives at the repo root and the repo's CLAUDE.md carries the rule below:
> ```markdown
> ## Design System
> Always read DESIGN.md before making any visual or UI decisions.
> All font choices, colors, spacing, and aesthetic direction are defined there.
> Do not deviate without explicit user approval.
> In QA mode, flag any code that doesn't match DESIGN.md.
> ```

## Product Context
- **What this is:** Circular-economy marketplace for university students — announce/donate used items (books, jalecos, calculators, electronics, furniture). Desktop landing + installable mobile PWA with offline announce queue.
- **Who it's for:** Double audience — the Vortex/UNIFOR evaluation board first (reviewing dozens of AI-assisted submissions), UNIFOR students second.
- **Space/industry:** Second-hand marketplaces (Enjoei, OLX, Vinted as category references).
- **Project type:** Marketing-rich landing (desktop) + app-like PWA (mobile), React + Vite, CSS-only design language (no asset packs, no WebGL/Lottie).
- **North star (the memorable thing):** *Circular economy made visible* — the impact counter as emotional hero; reuse as pride. Every design decision serves this.

## Aesthetic Direction
- **Direction:** **Xilo-Feira** — cordel woodcut from Ceará meets street-market signage. Printed-paper material language: paper ground, dense ink borders, hard offset shadows, rubber stamps, price splashes. "Banca de sebo às 7h" energy, not startup.
- **Decoration level:** Intentional — the material metaphor (paper + ink + stamps) does the decorating. **Hard bans:** gradients anywhere, soft blurred shadows, decorative icons, color emoji anywhere in the UI (typographic glyphs like ⟳ and · are typography and allowed; 📚/♻/🥼-style color emoji are not — category placeholders are the category INITIAL in Alfa Slab over the category color, and the wordmark is pure type), purple in any role.
- **Mood:** Feels like a *place in Ceará*, not a template. Cultural recognition + proof of life in 3 seconds.
- **Reference sites (researched 2026-07-16):** enjoei.com.br (personality, but purple = template-adjacent), vinted.com (the polished-generic look most submissions will echo — the anti-reference).
- **Layer-3 insight:** real marketplaces are photo-led because they have millions of photos; this demo seeds `imageUrl: null` — so the system is **typography-and-color-led**, and category placeholders are a designed feature (see Components), never a fallback.

## Typography
- **Display/Hero/Odometer:** **Alfa Slab One** (400 only) — wood-type cartaz voice; used BIG and RARELY: hero digits, section titles, wordmark. Never below ~22px.
- **Body/UI:** **Archivo** (variable) — 400/500 body, 600 labels, 700 buttons (uppercase, letter-spacing 0.02em), 800 prices.
- **Stamps/Metadata/Sync badges:** **Chivo Mono** — 400/500, ALWAYS uppercase with letter-spacing 0.08em. The voice of nota fiscal and rubber stamp.
- **Data/Prices:** Archivo with `font-variant-numeric: tabular-nums`.
- **Loading:** **Self-hosted woff2, SW-precached** (`@fontsource/*` packages or downloaded files in the bundle) — the installed PWA must render correct type OFFLINE; a Google Fonts CDN link would fall back to Verdana in the airplane-mode scene, on camera. `font-display: swap`. Fallback stack: `Archivo, Verdana, sans-serif` (deliberate — never Inter/system-ui as fallback). Preview page may use the CDN; the app never does.
- **Scale (px):** 12 (mono meta) · 14 (UI) · 16 (body) · 18 (lead) · 22 (h3) · 28 (h2) · 40 (h1) · `clamp(56px, 9vw, 104px)` (odometer/hero display). **Hard floor: nothing below 12px, ever** (stamps, hints, footer, phone nav = exactly 12). Display face floor: 20px (mini-placar mobile = 20px).
- **Foundry note:** Archivo + Chivo share Omnibus-Type (Latin American foundry) — material coherence, good video talking point.

## Color
- **Approach:** Expressive-restrained — color is rare and loud where it appears.
- **Background (paper):** `#FBF8F0` — warm near-white; readable under Fortaleza sun.
- **Surface (cards):** `#FFFFFF` — always with `2px solid #141613` border + hard shadow `4px 4px 0 #141613`. Nothing floats; everything is stuck onto the paper.
- **Primary text (ink):** `#141613` (never `#333`). **Muted:** `#5E6157`.
- **Action (verde-bandeira):** `#0B7A3E` — buttons, links, "publicado" states, donation stamps.
- **Signature (splash):** `#FFD100` — **RESERVED: monetary values and keyboard focus ring ONLY.** Every price on every screen lives inside a yellow 12-point starburst (`clip-path` polygon), black text. Donations get a green splash with white "DOAR".
- **Focus ring (all interactives):** `:focus-visible { outline: 3px solid #FFD100; outline-offset: 2px; box-shadow: 0 0 0 2px #141613 }` — the 2px ink halo is mandatory: yellow alone on white is 1.46:1 and fails WCAG non-text contrast (3:1).
- **Semantic:** success `#0B7A3E` · warning `#B45309` (burnt amber — never the money-yellow) · error `#C2321B` (stamp red) · info `#145C9E`.
- **Contrast:** ink/paper ≈ 15:1, ink/splash ≈ 14:1, white/green ≈ 5.9:1 — all AA+ at their sizes.
- **Dark mode:** **Light-only, by decision.** Paper material doesn't translate to dark cheaply within 15 days; documented scope cut (Decisions Log), revisit post-challenge.

## Spacing
- **Base unit:** 4px. **Density:** comfortable.
- **Scale:** 2xs(2) xs(4) sm(8) md(16) lg(24) xl(32) 2xl(48) 3xl(64).

## Layout
- **Approach:** Hybrid — creative-editorial landing (compact odometer hero; vitrine MUST peek into the first desktop viewport — edital lists the vitrine explicitly), grid-disciplined PWA screens.
- **Grid:** 12-col desktop (1080px max content), 4-col ≤768px. Listing grid: auto-fill minmax(200px, 1fr).
- **Border radius:** 2px everywhere (woodcut is sharp). Exceptions: hole-punch circles and avatar = 9999px.
- **Hang-tag cards:** punched hole (border-circle on paper), alternating rotation `-1deg` / `+0.8deg` via `nth-child`, straighten on hover. Small photo INSIDE the tag; placeholder categories get flat color blocks: Livros `#E8DCC0` · Engenharia `#D8E3D0` · Computação `#DAD9E6` · Eletrônicos `#E6D9D2`, with the category INITIAL in Alfa Slab (44px, ink) as the glyph — never emoji (2-3 letterform/composition variants per category, chosen by id hash).
- **Stamps (state language):** `2ª VIDA` (green outline) · `DOAÇÃO` (green fill) · `NA FILA ⟳` (gray dashed) · `FALHOU — REVISAR` (stamp red) · `VENDIDO` (ink fill). Chivo Mono at exactly 12px. Queue states are stamps, never framework badges. All stamps rotate ~-4°.
- **Interactive floor:** every interactive element (buttons, chips, nav items, inputs) has `min-height: 44px`. Filter chips are real `<button>`s with `aria-pressed` — never divs with cursor:pointer. Form labels always wired via `for`/`id`.

## Motion
- **Approach:** Intentional — all personality budget spent on two moves: (1) odometer roll on load (1.2s `cubic-bezier(.2,.9,.25,1)`, staggered per digit; last digit ticks on each queue sync), (2) stamp "thunk" on queue state change (scale 1.15→1, 120ms). Everything else minimal-functional.
- **Easing:** enter(ease-out) exit(ease-in) move(ease-in-out). **Duration:** micro(80ms buttons) short(150-250ms) medium(placar tick 300ms) long(odometer 1.2s, load only).
- **Reduced motion:** `prefers-reduced-motion` → static final values everywhere (odometer renders resolved digits).
- **Shadows snap:** never transition `box-shadow` (paint cost + breaks the transform/opacity-only rule) — hover/active shadow changes are instant; only `transform` carries the micro-motion.

## Signature Element — O PLACAR
Impact counter as mechanical odometer: each digit a vertical 0-9 strip (Alfa Slab One) inside an overflow-hidden bordered window, rolling to position on load. Desktop hero: `clamp(56px,9vw,104px)` + mono caption `KG RESGATADOS DO LIXO — UNIFOR` (the caption is the page's `<h1>`, with the numeric total in visually-hidden text) + the page's biggest yellow splash for R$. Mobile PWA: same component at 20px in the header, ticking when the offline queue syncs. **Accessibility:** the digit strips are `aria-hidden="true"` (otherwise screen readers announce "0 1 2 3 4 5 6 7 8 9" per digit); the real value lives in the sr-only text. ~60 lines CSS + ~30-line React `<Odometer value={n}/>` mapping digits to `translateY`. The signature IS the north star: circular economy literally turning on screen.

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-07-16 | Xilo-Feira direction adopted | /design-consultation: outside-voice proposal (fresh-context subagent) + main-review synthesis converged; user approved (D29). Cultural specificity as the anti-generic move (amendment CEO 22). |
| 2026-07-16 | North star: "circular economy made visible" | User-chosen (D27); only candidate a visual system can express; matches the challenge's own theme. |
| 2026-07-16 | Splash yellow reserved for money only | Signature needs scarcity; warning states use #B45309 to protect the association. |
| 2026-07-16 | Light-only | Paper material doesn't translate to dark within 15-day scope; deliberate cut, revisit post-challenge. |
| 2026-07-16 | Placeholders as feature, not fallback | Seed uses imageUrl null (eng amendment 15); flat category blocks inside hang-tags look intentional; photo-led layouts would look empty at demo scale. |
| 2026-07-16 | Placar-first hero, compact | Executes north star in 3s; mitigation: vitrine must remain visible in first desktop viewport (edital requires it on the landing). |
| 2026-07-16 | Purple banned | Enjoei owns purple in this category AND it's the default-Tailwind signature; both reasons to avoid. |
| 2026-07-16 | Fonts self-hosted + SW-precached (was: Google Fonts CDN) | /design-review: CDN fonts fail offline in the installed PWA — the airplane scene would render fallback Verdana on camera; observed 7.5s font-blocking load. |
| 2026-07-16 | 12px hard type floor; display floor 20px | /design-review: preview had 10 declarations at 9-11.5px — below the accessibility floor; spec now forbids it. |
| 2026-07-16 | Focus ring = splash + 2px ink halo; 44px interactive floor; chips are buttons; labels wired for/id; odometer aria-hidden + sr-only value | /design-review: yellow-only ring fails non-text contrast (1.46:1); div-chips had no keyboard access; screen readers announced every digit strip. |
| 2026-07-16 | Emoji rule sharpened: color emoji banned outright; typographic glyphs (⟳) allowed; placeholders = Alfa Slab category initials; donation splash copy "DOAR" | /design-review: the original spec self-contradicted ("no emoji in UI" vs "DOE ♻") and the preview leaked emoji into placeholders and the wordmark. |

---
*Preview artifact: `campuscycle-design-preview.html` (session scratchpad; regenerate anytime — it's plain HTML+CSS from this spec). Generated by /design-consultation, 2026-07-16.*
