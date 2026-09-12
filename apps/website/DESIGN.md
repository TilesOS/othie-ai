---
name: Othie AI
description: A quiet, local context signal moving from selected documents into the AI tools people already use.
colors:
  void: "#000000"
  surface: "#0A0A0B"
  surface-raised: "#131415"
  surface-bright: "#18191B"
  foreground: "#FFFFFF"
  foreground-dim: "#E4E5E7"
  label-foreground: "#C9CBCF"
  foreground-hover: "#D9DADD"
  muted-foreground: "#94979E"
  heading-muted: "#797D86"
  quiet-foreground: "#61646B"
  faint-foreground: "#4B4E54"
  brand-accent: "#47E1BD"
  brand-accent-hover: "#6BEACE"
  brand-accent-dim: "#2E6A5C"
  on-accent: "#06110D"
  on-light: "#1A1A1A"
  border: "#303236"
  border-soft: "#242628"
  warning: "#E2B66C"
  warning-border: "#55482E"
typography:
  display:
    fontFamily: "Inter Variable, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.5rem, 5vw, 4.25rem)"
    fontWeight: 400
    lineHeight: 1.125
    letterSpacing: "-0.04em"
  lede:
    fontFamily: "Inter Variable, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.85rem, 3.4vw, 3rem)"
    fontWeight: 400
    lineHeight: 1.125
    letterSpacing: "-0.04em"
  title:
    fontFamily: "Inter Variable, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.5rem, 2.6vw, 2.25rem)"
    fontWeight: 400
    lineHeight: 1.15
    letterSpacing: "-0.035em"
  body:
    fontFamily: "Inter Variable, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "-0.011em"
  eyebrow:
    fontFamily: "Instrument Serif, ui-serif, Georgia, Times New Roman, serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    fontStyle: italic
    lineHeight: 1.2
    letterSpacing: "0"
  action:
    fontFamily: "Instrument Serif, ui-serif, Georgia, Times New Roman, serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0"
  figure:
    fontFamily: "Instrument Serif, ui-serif, Georgia, Times New Roman, serif"
    fontSize: "clamp(2.1rem, 3.4vw, 3rem)"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "-0.02em"
  label:
    fontFamily: "Geist Mono Variable, Geist Mono, ui-monospace, SFMono-Regular, monospace"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0.01em"
    textTransform: uppercase
rounded:
  micro: "1px"
  xs: "3px"
  panel: "4px"
  showcase: "6px"
  control: "999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "20px"
  lg: "32px"
  section: "clamp(5rem, 9vw, 8.5rem)"
components:
  button-primary:
    backgroundColor: "{colors.foreground}"
    textColor: "{colors.on-light}"
    typography: "{typography.action}"
    rounded: "{rounded.control}"
    padding: "0 20px"
  button-primary-hover:
    backgroundColor: "{colors.foreground-hover}"
    textColor: "{colors.on-light}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    typography: "{typography.action}"
    rounded: "{rounded.control}"
    padding: "0 20px"
---

# Design System: Othie AI

## Overview

**Creative North Star: "The Context Signal"**

The site reads as instrumentation on a black field: pure black ground, hairline rules, flat
tonal panels, and a single rare teal-green that marks live state. Structure comes from alignment
and type scale rather than from cards, glow, or tinted glass. The reference is Neon's
developer-infrastructure language — left-set headlines, two-tone paragraph headings, a
full-bleed generative hero field, and monospace micro-labels — carrying Othie's own
document-to-context mechanism.

**Key Characteristics:**

- Pure black canvas with flat, near-neutral panels; no tinted or frosted surfaces
- Left-aligned display type at weight 400, never bold, tracked tight at -0.04em
- Two-tone paragraph headings: the lead clause in white, its continuation in muted grey
- A generative field of vertical light bars filling the first viewport, fading to black
- Small radii (4–6px) everywhere except pills on buttons and status chips
- A serif accent voice — Instrument Serif — on eyebrows, actions, and figures only
- Two generative fields: a dense bar field in the hero, a near-black ambient wash below it

## Colors

Pure black carries the page. Panels step up through a narrow neutral ramp (#0A0A0B →
#131415 → #18191B) and are separated by hairline #242628 / #303236 rules rather than shadow.

**The Rare Signal Rule.** The signal (#47E1BD) is never a surface and never a button. It marks
live state, selected sources, citation lines, the active rail item, and a small minority of
columns in the hero field — roughly two to five percent of a viewport. It sits deliberately
brighter and more teal than the reference's green so the signal reads as Othie's own.

**The White Action Rule.** The primary button is white on black with near-black text, as on
Neon. Secondary actions are a 1px hairline pill. Colour is not used to indicate primacy.

## Typography

Three faces, each with one job. **Inter** carries display and interface copy at weight 400;
there is no bold display type. **Instrument Serif** is the accent voice. **Geist Mono** at
12px uppercase is the data voice.

**The Two-Voice Rule.** Every small piece of text is either editorial or machine-produced,
and the face says which. Instrument Serif italic marks the editorial asides a person wrote —
section eyebrows, feature indices, button labels, and headline figures. Geist Mono uppercase
marks anything the engine produced — source paths, citations, token counts, statuses, release
metadata, and commands. A citation never takes the serif; an eyebrow never takes the mono.

**The Two-Tone Heading Rule.** Section headings are written as a sentence pair. The first
clause is wrapped in `<b>` and renders white at weight 400; the remainder inherits
`--heading-muted`. This is the site's primary typographic signature — use it for every h2.

**The Stable Stem Rule.** The hero headline's stem — "AI familiar with your work" — is fixed
and never animates. Only the clause beneath it types and cycles, through phrases naming what
Othie spares you. Nothing else on the site types, flickers, or cycles; route headlines and
every h2 are static.

The clause is a **block**, so it always owns its own row: the stem above it can never reflow
as characters arrive, and the caret never rides up to the end of the first line. The clause,
not the h1, reserves its own height — one row at desktop where every phrase fits a single
line, two below 780px where the measure forces a wrap. Reserving it there rather than on the
h1 keeps the stem pinned without padding dead space under the headline. Phrases must stay
under the h1's 17em measure; a longer phrase wraps and breaks the reservation.

The caret is a thin **white** bar, not the accent — the accent is reserved for state, and a
blinking brand-coloured caret reads as a status indicator. The typed clause is decorative and
carries `aria-hidden`, with one stable phrase rendered for assistive technology beside it;
under `prefers-reduced-motion` the first phrase is written out with no caret.

**The Ramp Rule.** Every font-size sits on one ramp: 0.625, 0.6875, 0.75, 0.8125, 0.875,
0.9375, 1, 1.0625, 1.125, 1.25, 1.5rem for interface text, then the fluid display clamps.
Off-ramp literals like 0.84rem are drift, not intent.

**The Measure Rule.** Constrain display headings with `rem`, never `ch`. A `ch` measure set
on a wrapper resolves against the wrapper's 1rem font size and collapses the heading into a
narrow column.

## Layout

A 1408px outer frame carries near-full-bleed sections; reading columns sit at 46rem and
feature copy at 34rem. The hero is left-set, not centred, and its min-height is
`100svh` less the announcement rail and header, so the generative field fills exactly the
viewport the visitor lands on at any screen size. Height-based media queries trim the hero's
type and padding on short or landscape windows so both actions stay above the fold. Feature
sections run beside a sticky scroll-spy rail.

Two generative fields carry the ground. The hero's dense bar field fills the first viewport;
everything below it sits over a fixed, full-viewport ambient wash of slow luminance clouds:
a median near 9/255 over black, a peak near 17/255, and a floor near 3/255 so no region of
the page stays pure black. Those numbers are deliberate — the wash must stay below
`surface-bright` (27/255) so panels keep their edge against it. The hero paints an opaque
black ground so only one field is ever visible at a time.

**The Shallow-Ramp Rule.** Both fields paint gradients that span only a handful of the 255
available levels, which makes them fragile in ways a normal gradient is not. Three things are
required, not optional: declare `precision highp float` (`mediump` is genuine fp16 on many
desktop GPUs and visibly quantises a ramp this shallow, while Apple GPUs promote it and hide
the fault); dither the output by half a level to break up 8-bit contouring, since most
external monitors do not dither in hardware the way laptop panels do; and key any periodic
term to CSS pixels rather than to the backing buffer, or its pitch shifts with
devicePixelRatio and differs per display.

## Elevation & Depth

Depth comes from the tonal ramp and hairline borders alone. Drop shadows and luminous halos
are not structural elevation and are not used on panels.

## Shapes

Panels use 4–6px corners with hairline cool borders; inner controls drop to 3px and progress
bars to 1px. Buttons and status chips are pills.
Document and context surfaces keep a squared technical silhouette.

## Components

The page opens with a full-width announcement rail above a sticky black header with a
hairline bottom border — not a floating pill. Below the hero, a five-column primitives strip
pairs a bolded lead-in term with a muted description and a small dark preview panel.
A terminal command band and a dotted-texture closing CTA bracket the feature sections.

## Do's and Don'ts

### Do:

- **Do** write every section heading as a two-tone sentence pair with `<b>` on the lead clause.
- **Do** show Othie's mechanism through clearly labeled illustrative source and citation data.
- **Do** bind every brand treatment, including canvas/WebGL colour, to the central accent token.
- **Do** let hairlines, alignment, and quiet space carry the structure.
- **Do** keep the serif for editorial asides and the mono for engine output; never swap them.

### Don't:

- **Don't** centre body sections or use a teal-tinted near-black ground.
- **Don't** make the primary button the accent colour, or use the accent as a panel fill.
- **Don't** set display weights above 400, or use gradient text and pervasive glow.
- **Don't** animate any headline but the hero's closing clause, or let it reflow the page.
- **Don't** let the ambient wash rise to where it competes with panels or text.
- **Don't** turn the page into a grid of generic feature cards.
- **Don't** imply an illustrative UI, installer, integration, or price already ships.
