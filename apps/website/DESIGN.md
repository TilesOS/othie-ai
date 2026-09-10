---
name: Othie AI
description: A quiet, local context signal moving from selected documents into the AI tools people already use.
colors:
  void: "#090D0F"
  surface: "#11171A"
  surface-raised: "#171E21"
  foreground: "#F4F7F6"
  muted-foreground: "#A2AEAA"
  brand-accent: "#2DD4BF"
  on-accent: "#062923"
  border: "#263033"
typography:
  display:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.7rem, 7vw, 5.25rem)"
    fontWeight: 600
    lineHeight: 0.98
    letterSpacing: "-0.04em"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "Geist Mono, ui-monospace, SFMono-Regular, monospace"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.04em"
rounded:
  control: "999px"
  panel: "14px"
  showcase: "18px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "20px"
  lg: "32px"
  section: "clamp(88px, 12vw, 160px)"
components:
  button-primary:
    backgroundColor: "{colors.brand-accent}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.control}"
    padding: "12px 20px"
  button-secondary:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.control}"
    padding: "12px 20px"
---

# Design System: Othie AI

## Overview

**Creative North Star: "The Context Signal"**

The site feels like a precise desktop instrument seen in a low-lit working session: mostly neutral, calm enough to read, and alive only where information moves. The signature is a restrained diagonal line field that resolves into selected source paths, bounded context, and host destinations. It borrows Terax's confidence and spatial restraint without reusing its identity or product chrome.

**Key Characteristics:**

- Dark, cool, matte surfaces with a single rare teal signal
- Large centered language paired with concrete product demonstrations
- Wide showcases, thin rules, compact mono facts, and crisp state labels
- Motion concentrated in the flowing context field and meaningful control changes

## Colors

Cool near-black layers carry nearly the whole page; teal is a signal, not a wash.

**The Rare Signal Rule.** Brand accent should occupy roughly five to ten percent of a viewport and primarily mark the main action, selected state, and live context path.

## Typography

Inter carries display and interface copy because the user pinned the Terax reference and its exact typographic authority. Geist Mono is reserved for source names, citations, platform metadata, and measured controls.

**The Stable Headline Rule.** Headlines do not type, flicker, or cycle. The mechanism moves around a stable value proposition.

## Layout

The main container sits between 1120 and 1200 pixels with wider controlled product showcases. Sections alternate between centered persuasion and left-to-right demonstrations. The first viewport includes the full offer and the top of the mechanism demonstration. On narrow screens, demonstrations become vertical flows rather than scaled-down desktop canvases.

## Elevation & Depth

Depth comes from tonal layering, inset edges, and one soft directional shadow on elevated or floating surfaces. Luminous halos are not structural elevation.

## Shapes

Panels use restrained 14–18 pixel corners with thin cool borders. Small controls and status chips may be pills. Document and context surfaces preserve a slightly squared technical silhouette.

## Components

Primary buttons are compact teal pills with dark text and a restrained lift on hover. Secondary actions stay neutral. Cards appear only where comparison or selection benefits from containment; the page story is carried by open layout and full-width showcases.

Navigation begins as a quiet full-width header, gains a compact floating surface after scrolling, and uses a focus-managed sheet-like menu on mobile. Accordions and segmented controls show state through both shape and text, not color alone.

## Do's and Don'ts

### Do:

- **Do** show Othie's mechanism through clearly labeled illustrative source and citation data.
- **Do** bind every brand treatment, including canvas/WebGL color, to the central accent token.
- **Do** let quiet space and typography carry most of the visual weight.

### Don't:

- **Don't** turn the page into a grid of generic feature cards.
- **Don't** use green body copy, large green panels, gradient text, or pervasive glow.
- **Don't** imply an illustrative UI, installer, integration, or price already ships.
