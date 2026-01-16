# TipTap React Native - Margin Notes Editor

A rich text editor for React Native with Tufte-style margin notes, using TipTap/ProseMirror.

Inspired by:
- LaTeX `\marginpar`
- Typst [marginalia](https://github.com/nleanba/typst-marginalia)

## Overview

```mermaid
graph TB
    subgraph App["React Native App"]
        Toolbar["Toolbar"]
        Context["MarginNotesProvider"]
        Main["Main Editor"]
        Margin["Margin Panel"]
    end
    
    Toolbar -->|"routes commands"| Context
    Context --> Main
    Context --> Margin
    Main <-.->|"anchor sync"| Margin
```

Two synchronized TipTap editors:
- **Main Editor**: Document with inline margin note anchors
- **Margin Panel**: Note blocks for each anchor

---

## Platform Architecture

```mermaid
flowchart TB
    subgraph Web["Web"]
        RNWeb["React Native Web"] --> TipTap["TipTap (Direct DOM)"]
    end

    subgraph Mobile["iOS / Android"]
        RN["React Native"] <-->|"postMessage"| WV["WebView"]
        WV --> TipTapM["TipTap (Bundled HTML)"]
    end
```

| Platform | Rendering | Communication |
|----------|-----------|---------------|
| Web | Direct TipTap | Function calls |
| Mobile | WebView + bundled HTML | postMessage bridge |

---

## Core Architecture

```mermaid
flowchart TD
    subgraph RN["React Native"]
        Provider["MarginNotesProvider"]
        FSM["Focus State Machine"]
        Reconciler["Reconciler"]
        App["App.tsx"]
    end
    
    subgraph WV1["Main Editor (WebView)"]
        TipTap1["TipTap + MarginNote extension"]
    end
    
    subgraph WV2["Margin Editor (WebView)"]
        TipTap2["TipTap + MarginNoteBlock extension"]
    end
    
    TipTap1 -->|"ANCHORS_CHANGED"| App
    App --> Reconciler
    Reconciler -->|"INSERT/DELETE/UPDATE"| TipTap2
    
    TipTap1 -->|"EDITOR_FOCUS"| FSM
    TipTap2 -->|"NOTE_BLOCK_FOCUS"| FSM
    FSM -->|"routes toolbar"| App
```

---

## Focus State Machine

Manages which editor receives toolbar commands.

```mermaid
stateDiagram-v2
    [*] --> IDLE
    
    IDLE --> MAIN_FOCUSED: MAIN_EDITOR_FOCUS
    IDLE --> NOTE_FOCUSED: NOTE_FOCUS(id)
    
    MAIN_FOCUSED --> NOTE_FOCUSED: NOTE_FOCUS(id)
    MAIN_FOCUSED --> IDLE: ALL_BLUR
    
    NOTE_FOCUSED --> MAIN_FOCUSED: MAIN_EDITOR_FOCUS
    NOTE_FOCUSED --> NOTE_FOCUSED: NOTE_FOCUS(id)
    NOTE_FOCUSED --> IDLE: ALL_BLUR
```

| State | `focusedEditor` | Toolbar Target |
|-------|-----------------|----------------|
| IDLE | `null` | None |
| MAIN_FOCUSED | `'main'` | Main Editor |
| NOTE_FOCUSED | `{ noteId }` | Margin Editor |

---

## Reconciler

Converts main editor anchors into margin panel commands.

```mermaid
flowchart LR
    Anchors["Anchors from<br/>Main Editor"] --> Reconciler
    Notes["Current Notes<br/>(React State)"] --> Reconciler
    Reconciler --> Commands["Commands"]
    Reconciler --> NewNotes["Updated Notes"]
    
    Commands --> |"INSERT_NOTE_BLOCK"| WV2["Margin Editor"]
    Commands --> |"DELETE_NOTE_BLOCK"| WV2
    Commands --> |"UPDATE_NOTE_INDICES"| WV2
```

**Single Source of Truth:**

| State | Owner |
|-------|-------|
| Anchor existence & position | Main Editor |
| Note content | Margin Editor |
| Note list (derived) | React Native |
| Focus state | React Native |

---

## Message Protocol

Typed messages with `SCREAMING_SNAKE_CASE`.

### Main Editor → React Native
- `EDITOR_FOCUS` / `EDITOR_BLUR`
- `ANCHORS_CHANGED` - anchor positions updated
- `CONTENT_CHANGED` - document content
- `SELECTION_CHANGED` - formatting state

### React Native → Main Editor
- `INSERT_MARGIN_NOTE` / `DELETE_MARGIN_NOTE`
- `TOGGLE_BOLD`, `TOGGLE_ITALIC`, etc.
- `INSERT_SQUARE`, `INSERT_CIRCLE`, `INSERT_FLOWER`

### Margin Editor → React Native
- `NOTE_BLOCK_FOCUS` - specific note focused
- `DELETE_MARGIN_NOTE` - empty note badge clicked

### React Native → Margin Editor
- `INSERT_NOTE_BLOCK` / `DELETE_NOTE_BLOCK`
- `UPDATE_NOTE_INDICES` - reorder notes
- `FOCUS_NOTE_BLOCK`
- Format commands (same as main)

---

## Build Pipeline

```mermaid
flowchart LR
    subgraph Source
        main["main.ts"]
        margin["marginEditor.ts"]
        ext["@prose/tiptap-extensions"]
    end

    subgraph Build
        vite["Vite + singlefile plugin"]
    end

    subgraph Output
        html["dist/*.html<br/>(single-file)"]
    end

    subgraph Export
        ts["src/editor/*Html.ts"]
    end

    ext --> main & margin
    main & margin --> vite --> html
    html -->|"generateHtmlExport.js"| ts
```

---

## Project Structure

```
├── App.tsx                      # Main app, toolbar, reconciler
├── src/
│   ├── editor/
│   │   ├── TipTapEditor.tsx     # Mobile WebView wrapper
│   │   ├── TipTapEditor.web.tsx # Web direct TipTap
│   │   ├── MarginEditor.tsx     # Mobile margin WebView
│   │   ├── MarginEditor.web.tsx # Web margin TipTap
│   │   ├── editorHtml.ts        # Bundled main editor
│   │   └── marginEditorHtml.ts  # Bundled margin editor
│   ├── margin-notes/
│   │   ├── FocusStateMachine.ts # Focus reducer & types
│   │   ├── MarginNoteReconciler.ts
│   │   └── MarginNotesContext.tsx
│   └── components/
│       └── MarginNotesPanel.tsx
├── editor-web/                  # WebView bundle source
│   ├── src/
│   │   ├── main.ts
│   │   ├── marginEditor.ts
│   │   └── protocol/           # Shared message types
│   └── vite.config.ts
└── packages/
    └── tiptap-extensions/       # TipTap extensions
        └── src/extensions/
            ├── MarginNote.ts    # Inline anchor
            ├── MarginNoteBlock.ts
            └── NoteHighlight.ts
```

---

## Getting Started

```bash
# Install dependencies
npm install

# Build extensions
cd packages/tiptap-extensions && npm run build && cd ../..

# Build WebView bundles
cd editor-web && npm run build && node generateHtmlExport.js && cd ..

# Run
npx expo start     # Dev server
npm run web        # Web browser
npm run ios        # iOS simulator
npm run android    # Android emulator
```

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| WebView for TipTap | TipTap requires real DOM; WebView provides it on mobile |
| Single-file HTML bundle | `vite-plugin-singlefile` embeds JS/CSS for easy WebView loading |
| One margin editor WebView | Multiple WebViews = ~50MB each; single editor is more efficient |
| Focus state machine | Deterministic focus routing vs scattered conditionals |
| Reconciler pattern | Single source of truth prevents state divergence |
| Ref + State pattern | Refs for synchronous access, state for React re-renders |

---

## Testing

```bash
npx jest                    # Run all tests (75 tests)
npx jest --watch           # Watch mode
npx jest FocusStateMachine # Specific file
```

Test coverage:
- Focus state machine transitions
- Reconciler logic (add/remove/reorder)
- Context provider integration

---

## Debug Logging

All logs use prefixed format for filtering:

| Prefix | Source |
|--------|--------|
| `[MainEditor]` | Main editor WebView |
| `[MarginEditor]` | Margin editor WebView |
| `[Focus]` | Focus state machine |
| `[Reconciler]` | Reconciler operations |

---

## License

MIT
