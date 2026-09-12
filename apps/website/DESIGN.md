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
    rounded: "{rounded.control}"
    padding: "0 20px"
  button-primary-hover:
    backgroundColor: "{colors.foreground-hover}"
    textColor: "{colors.on-light}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
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

Inter carries display and interface copy at weight 400; there is no bold display type.
Geist Mono at 12px uppercase is reserved for eyebrows, source names, citations, platform
metadata, and measured controls.

**The Two-Tone Heading Rule.** Section headings are written as a sentence pair. The first
clause is wrapped in `<b>` and renders white at weight 400; the remainder inherits
`--heading-muted`. This is the site's primary typographic signature — use it for every h2.

**The Stable Headline Rule.** Headlines do not type, flicker, or cycle. The mechanism moves
around a stable value proposition.

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

### Don't:

- **Don't** centre body sections or use a teal-tinted near-black ground.
- **Don't** make the primary button the accent colour, or use the accent as a panel fill.
- **Don't** set display weights above 400, or use gradient text and pervasive glow.
- **Don't** turn the page into a grid of generic feature cards.
- **Don't** imply an illustrative UI, installer, integration, or price already ships.
