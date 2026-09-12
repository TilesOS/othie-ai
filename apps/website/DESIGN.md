---
name: Othie AI
description: A quiet, local context signal moving from selected documents into the AI tools people already use.
colors:
  void: "#000000"
  surface: "#0A0A0B"
  surface-raised: "#131415"
  surface-bright: "#18191B"
  foreground: "#FFFFFF"
  muted-foreground: "#94979E"
  quiet-foreground: "#61646B"
  heading-muted: "#797D86"
  brand-accent: "#34D59A"
  on-accent: "#06110D"
  border: "#303236"
  border-soft: "#242628"
typography:
  display:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.5rem, 5vw, 4.25rem)"
    fontWeight: 400
    lineHeight: 1.125
    letterSpacing: "-0.04em"
  lede:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.85rem, 3.4vw, 3rem)"
    fontWeight: 400
    lineHeight: 1.125
    letterSpacing: "-0.04em"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Geist Mono, ui-monospace, SFMono-Regular, monospace"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0.01em"
    textTransform: uppercase
rounded:
  control: "999px"
  panel: "4px"
  showcase: "6px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "20px"
  lg: "32px"
  section: "clamp(5rem, 9vw, 8.5rem)"
components:
  button-primary:
    backgroundColor: "{colors.foreground}"
    textColor: "#1A1A1A"
    rounded: "{rounded.control}"
    padding: "0 20px"
  button-secondary:
    backgroundColor: "transparent"
    borderColor: "{colors.quiet-foreground}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.control}"
    padding: "0 20px"
---

# Design System: Othie AI

## Overview

**Creative North Star: "The Context Signal"**

The site reads as instrumentation on a black field: pure black ground, hairline rules, flat
tonal panels, and a single rare green that marks live state. Structure comes from alignment
and type scale rather than from cards, glow, or tinted glass. The reference is Neon's
developer-infrastructure language — left-set headlines, two-tone paragraph headings, a
full-bleed generative hero field, and monospace micro-labels — carrying Othie's own
document-to-context mechanism.

**Key Characteristics:**

- Pure black canvas with flat, near-neutral panels; no tinted or frosted surfaces
- Left-aligned display type at weight 400, never bold, tracked tight at -0.04em
- Two-tone paragraph headings: the lead clause in white, its continuation in muted grey
- A generative field of vertical light bars anchored to the hero, fading to black
- Small radii (4–6px) everywhere except pills on buttons and status chips

## Colors

Pure black carries the page. Panels step up through a narrow neutral ramp (#0A0A0B →
#131415 → #18191B) and are separated by hairline #242628 / #303236 rules rather than shadow.

**The Rare Signal Rule.** Green (#34D59A) is never a surface and never a button. It marks
live state, selected sources, citation lines, the active rail item, and a small minority of
columns in the hero field — roughly two to five percent of a viewport.

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

**The Measure Rule.** Constrain display headings with `rem`, never `ch`. A `ch` measure set
on a wrapper resolves against the wrapper's 1rem font size and collapses the heading into a
narrow column.

## Layout

A 1408px outer frame carries near-full-bleed sections; reading columns sit at 46rem and
feature copy at 34rem. The hero is left-set, not centred, with the offer and the top of the
primitives strip in the first viewport. Feature sections run beside a sticky scroll-spy rail.

## Elevation & Depth

Depth comes from the tonal ramp and hairline borders alone. Drop shadows and luminous halos
are not structural elevation and are not used on panels.

## Shapes

Panels use 4–6px corners with hairline cool borders. Buttons and status chips are pills.
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
- **Don't** make the primary button green, or use green as a panel fill.
- **Don't** set display weights above 400, or use gradient text and pervasive glow.
- **Don't** turn the page into a grid of generic feature cards.
- **Don't** imply an illustrative UI, installer, integration, or price already ships.
