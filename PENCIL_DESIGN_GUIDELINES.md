# Pencil Design Guidelines for German Study App

> **Purpose**: This document captures design rules, philosophies, and best practices for the `app.pen` design file. Feed this to any AI agent when resuming work.

---

## 🎯 Project Overview

**App**: German language learning/study application  
**Design Style**: Minimalist, consistent, elegant — nothing too fancy or distracting  
**Target Platforms**: Desktop (MacBook Air), Mobile (Samsung portrait)  
**Design Tool**: Pencil (VS Code Extension with MCP integration)

---

## 📐 Frame Naming Convention

All design frames follow this format:
```
<Page Name> (<Platform> <Resolution>)
```

**Examples:**
- `Note Editor (Desktop 1280×800)`
- `Note Editor (Mobile 360×800)`
- `Word Net (Desktop 1280×800)`
- `Word Net (Mobile 360×800)`

**Special Frames:**
- `Component Library` — No resolution suffix (it's a reference, not a screen)

---

## 🔄 Source of Truth Pattern

### Philosophy
**Desktop is always canonical. Mobile is always derivative.**

### Context Schema
Every screen frame MUST have a `context` property following this schema:

**For Desktop (Source of Truth):**
```
SOURCE OF TRUTH: Canonical design for <Page Name> page. Mobile is derivative.
```

**For Mobile (Derivative):**
```
DERIVATIVE: Regenerate from Desktop source of truth after changes.
```

### Workflow
1. Make all design changes on **Desktop** frames first
2. After Desktop changes are finalized, **delete and regenerate** Mobile from Desktop
3. Never edit Mobile directly for content/structure changes unless you need:
    - vertical stacking

---

## 📱 Device Specifications

| Platform | Resolution | Aspect Ratio | Notes |
|----------|------------|--------------|-------|
| Desktop (MacBook Air) | 1280×800 | 16:10 | Primary design target |
| Mobile (Samsung) | 360×800 | 9:20 (~1:2.2) | Portrait orientation |

**Important**: Both platforms share the same height (800px) for visual consistency when displayed side-by-side.

---

## 🎨 Theme System

### Available Themes
1. **Minimal Light** — Warm, soft, nature-inspired light theme
2. **Minimal Dark** — Dark version of Minimal Light with same typography and border radius

### Theme Variables (prefix: `$--`)
```
Colors:
  $--background, $--foreground, $--muted-foreground
  $--primary, $--primary-foreground
  $--secondary, $--secondary-foreground
  $--accent, $--border, $--ring

Typography:
  $--font-primary, $--font-secondary

Border Radius:
  $--radius-sm, $--radius-md, $--radius-lg
```

### Theme Application
- Set `theme: {Style: "<Theme Name>"}` on parent frames (e.g., "Minimal Light" or "Minimal Dark")
- All descendants using `$--` variables will inherit the theme
- Theme switcher buttons in Component Library are for **designer preview**, not runtime interaction

### VS Code Extension Limitation
Theme buttons are NOT interactive in the VS Code Pencil extension. To preview themes:
1. Select a frame
2. Change its `theme` property in the Properties panel
3. Or use MCP: `U("frameId", {"theme": {"Style": "Minimal Dark"}})`

---

## 🧩 Component Library Structure

Location: Top of canvas (y: 0)  
Frame ID: `P87W5`

### Sections (in order):
1. **Header** — Title and subtitle
2. **Theme Switcher** — Theme preview buttons
3. **Buttons** — Primary, Secondary, Outline, Ghost
4. **Toolbar Components** — Toolbar buttons (normal/active states)
5. **Margin Note Components** — Note badges, blocks, anchors
6. **Editor Components** — Formatting toolbar
7. **Shape Icons** — Square, Circle, Flower (for text embedding)
8. **Input Components** — Input groups with labels

### Component Naming
```
<Category>/<Variant>
```
Examples: `Button/Primary`, `Button/Ghost`, `Shape/Circle`, `Toolbar Button/Active`

---

## 📄 Page-Specific Guidelines

### Note Editor Page
- **Desktop**: Side-by-side layout (Editor Pane + Margin Notes Panel)
- **Mobile**: Vertical stacking (Editor on top, Margin Notes below)
- Margin Notes Panel: 280px on desktop, 200px height on mobile
- Editor has rich text formatting toolbar

### Word Net Page
- **Two Panes**: Word Info (left) + Word Net Graph (right)
- Each pane is 640px on desktop (1:1 ratio)
- Mobile: Stacked vertically (400px each)

#### Word Info Pane Structure:
1. Lemma Title (large)
2. Form Section (speaker button + syllable stress)
3. Grammar Section (G tag + conjugation forms)
4. Divider
5. Senses Section (paginated with dots)

#### Word Net Graph Pane:
- **Node Shapes**:
  - Circles = Verbs (gray for related, green for center)
  - Squares = Nouns (yellow fill)
- **Graph Toolbar**: zoom in, slider, zoom out, fit (⛶), delete, expand
- Canvas has `clip: true` for overflow clipping
- Connection lines rendered programmatically (not in design)

---

## 🔧 Pencil MCP Technical Notes

### Critical Properties
- **Clipping**: Use `clip: true` (NOT `overflow: "hidden"`)
- **Text width constraints**: Use `textGrowth: "fixed-width"` with `width` property
- **Fill container**: Use `"fill_container"` for responsive sizing

### Common Operations
```javascript
// Update properties
U("nodeId", {property: value})

// Insert node
foo=I("parentId", {type: "frame", ...})

// Copy node (creates derivative)
bar=C("sourceId", "parentId", {name: "New Name", ...})

// Delete node
D("nodeId")

// Move node
M("nodeId", "newParentId", index)

// Update descendant in component instance
U("instanceId/descendantId", {content: "New text"})
```

### Gotchas
1. When deleting a parent, all children are deleted — move children out first if needed
2. `x` and `y` are ignored inside flexbox layouts
3. Bindings only work within the same `batch_design` call
4. Maximum ~25 operations per batch for stability
5. Always use absolute file paths

---

## 📋 Context Comments Schema

Use `context` property for implementation notes. Follow this pattern:

```
Implementation: <What the element does and how to code it>
```

**Examples:**
```
context: "Implementation: Play audio pronunciation of the word when clicked."
context: "Implementation: Force-directed graph using d3-force. Nodes are draggable."
context: "Responsive: On mobile (<768px), switch to layout:vertical"
```

---

## ✅ Pre-Handoff Checklist

Before passing to another agent or session:

- [ ] All frames named with `<Page> (<Platform> <Resolution>)` format
- [ ] All Desktop frames have `SOURCE OF TRUTH` context
- [ ] All Mobile frames have `DERIVATIVE` context
- [ ] Component Library is at canvas top (y: 0)
- [ ] Desktop frames start below Component Library
- [ ] Mobile frames positioned 50px to the right of their Desktop counterparts
- [ ] No orphaned nodes floating outside parent frames
- [ ] Theme variables are defined in document variables

---

## 🚀 Quick Start for New Agent

```
1. Read this file first
2. Use `get_editor_state` to check current canvas state
3. Use `batch_get` to read specific frames
4. Use `snapshot_layout` to check positioning
5. Use `get_screenshot` to visually verify changes
6. Follow Source of Truth pattern for all changes
7. Keep operations under 25 per batch_design call
```

---

## 📁 File Structure Reference

```
app.pen
├── Component Library (P87W5)
│   ├── Theme Switcher
│   ├── Buttons (reusable)
│   ├── Toolbar Components (reusable)
│   ├── Margin Note Components (reusable)
│   ├── Editor Components (reusable)
│   ├── Shape Icons (reusable)
│   └── Input Components (reusable)
│
├── Note Editor (Desktop 1280×800) — SOURCE OF TRUTH
├── Note Editor (Mobile 360×800) — DERIVATIVE
│
├── Word Net (Desktop 1280×800) — SOURCE OF TRUTH
└── Word Net (Mobile 360×800) — DERIVATIVE
```

---

*Last updated: February 3, 2026*
