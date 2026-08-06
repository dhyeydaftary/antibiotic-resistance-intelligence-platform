---
title: Diagram Styling Guide
category: architecture
last_updated: 2026-08-01
owner: dhyeydaftary
review_frequency: on-diagram-system-change
---

# Diagram Styling Guide

## Philosophy

Every Claude-generated diagram in this directory is a **self-contained, theme-reactive SVG** — one file per diagram, no separate light/dark asset pair, no dependency on GitHub-specific markdown tricks. Theme switching is handled entirely inside the SVG itself via a single embedded `@media (prefers-color-scheme: dark)` block. This was chosen over GitHub's `#gh-dark-mode-only` / `#gh-light-mode-only` `<picture>` convention specifically for **portability**: these files render correctly when opened directly, in an editor preview, or on any Git host — not only inside GitHub-flavored markdown. The trade-off, stated plainly: a viewer who has manually forced their GitHub theme against their OS preference will see the diagram follow the OS setting instead. This was judged an acceptable cost for a single-asset, host-agnostic file.

Mermaid diagrams are out of scope for this guide — they're implementation-level flow/sequence diagrams maintained alongside code (see `docs/diagram-plan.md`), rendered by whatever Mermaid engine the viewer uses, and don't carry this styling system.

**Diagram selection (Claude vs. Mermaid) is documented in `docs/diagram-plan.md`. This guide covers only the styling and maintenance of Claude-generated SVG diagrams.**

## Shared Class Taxonomy

Every diagram defines the same classes, with the same names and values, in an embedded `<style>` block. If a token changes, it must change identically in every file — there is no shared external stylesheet, so consistency is maintained by copying the block, not by a single source of truth on disk.

| Class | Used for | Light | Dark |
|---|---|---|---|
| `.canvas` | Full-bleed background rect | `#ffffff` | `#0d1117` |
| `.ink-strong` | Titles | `#0f172a` | `#f0f6fc` |
| `.ink` | Primary node/box labels | `#1e293b` | `#e6edf3` |
| `.ink-muted` | Secondary/subtitle text | `#64748b` | `#8b949e` |
| `.ink-faint` | Footnotes, least-important annotations | `#94a3b8` | `#6e7681` |
| `.accent-ink` | Indigo-highlighted text/callouts | `#4f46e5` | `#a5b4fc` |
| `.node-neutral` | Gray boxes (external actors, "before" state) | fill `#f1f5f9` / stroke `#94a3b8` | fill `#161b22` / stroke `#6e7681` |
| `.node-accent` | Indigo-tinted boxes (synthetic/internal groups, "after" state) | fill `#eef2ff` / stroke `#6366f1` | fill `#1c2333` / stroke `#818cf8` |
| `.node-core` | The single "hero" box in a diagram (thicker stroke) | fill `#eef2ff` / stroke `#4f46e5` | fill `#1c2333` / stroke `#818cf8` |
| `.node-offline` | Dashed boxes (static/offline dependencies) | fill `#f8fafc` / stroke `#94a3b8` | fill `#0d1117` / stroke `#6e7681` |
| `.edge-neutral` / `.arrow-neutral` | Gray connector lines and their arrowheads | `#94a3b8` | `#6e7681` |
| `.edge-accent` / `.arrow-accent` | Indigo connector lines and their arrowheads | `#4f46e5` | `#818cf8` |
| `.edge-faint` | Structural divider lines (not a relationship) | `#e2e8f0` | `#30363d` |

Two things worth understanding, not just copying: the neutral/muted tiers use GitHub's own published dark-theme text colors (so contrast against GitHub's actual dark canvas is something GitHub already validated, not a guess), and `.accent-ink`/`.edge-accent`/`.arrow-accent` **invert lightness direction** between themes (dark indigo in light mode, light indigo in dark mode) — an accent color that doesn't do this goes invisible against its own theme's background.

## Rules for Any New Diagram

1. **No inline `fill=`/`stroke=`/`style=` color attributes, anywhere.** Every color reference goes through a class from the table above. An inline `style="fill:...` attribute silently overrides the `<style>` block's `@media` rule — this exact bug existed in one of the three current files before this fix and would have defeated dark-mode support entirely if left in place.
2. **Copy the full `<style>` block verbatim** from an existing file in this directory rather than retyping it. If a new visual need doesn't fit an existing class (a new box category, a new line meaning), add a token to the table above and apply it to all existing files in the same change — don't invent a one-off class in a single diagram.
3. **`stroke-width`, `stroke-dasharray`, geometry, and text content are not theme concerns** — they stay as plain attributes, unclassed. Only color is themed.
4. **Non-color primitives (masks, clip-paths, gradients used for effects) are not "ink"** and must not be reclassified into the theme system. `adr-0001-architecture-evolution.svg` has a luminance mask (`fill="white"`/`fill="black"`) that must stay exactly as-is regardless of theme.
5. **Keep the file self-contained.** No external stylesheet references, no web fonts (the top-level `font-family="Helvetica, Arial, sans-serif"` attribute is the only typography declaration needed) — anything that requires a network fetch breaks portability.
6. **Verify with a grep, not just a glance**, before considering a diagram done: `grep -n 'fill="#\|stroke="#\|style="'` across the file should return nothing except legitimate mask/gradient primitives explicitly exempted by rule 4.

## Creating a New Diagram

1. Copy an existing SVG from this directory.
2. Reuse the shared `<style>` block without modification.
3. Update only the geometry, labels, and relationships.
4. Verify compliance using the recommended `grep` command before committing.

## Diagram Inventory

`adr-0001-architecture-evolution.svg`, `synthetic-feature-conditioning-map.svg`, `system-context.svg` — all three follow this system as of 2026-08-01.
