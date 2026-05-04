# CLAUDE.md

GALGAME visual novel maker — Electron + Vue 3 + VueFlow + Pinia + Element Plus desktop app.

## Commands

```bash
npm run dev          # Build main/preload, then start dev server + Electron
npm run build        # Production build (main + preload + renderer)
npm run preview      # Preview production build
npm test             # Run all 489 tests (vitest --run)
npm run test:watch   # Watch mode
npm run typecheck    # vue-tsc --noEmit
```

Tests live in `src/tests/` (except `projectStore.test.ts` which is in `src/renderer/src/stores/`). Vitest uses `jsdom` environment with `@renderer` alias resolving to `src/renderer/src/`.

## Architecture

```
Electron main process (src/main/)
  └── IPC handlers ──→ file system, assets, backup, export
Electron preload (src/preload/)
  └── contextBridge ──→ window.electronAPI
Vue 3 renderer (src/renderer/src/)
  ├── stores/        # 8 Pinia stores (Composition API)
  ├── components/    # FlowEditor, PropertyPanel, NodePanel, CodeEditor, 17 node types, managers
  ├── utils/         # mappingEngine, conditionBuilder, graphAnalysis, pathTracing, storyTree
  ├── preview/       # PixiJS-based VN runtime
  └── types/         # All TypeScript definitions
```

**Key data flow:** `flowStore` (nodes + edges) → `flowToScript()` → script string stored in `projectStore`. Script edited in Monaco → `scriptToFlow()` → updates flowStore. `projectStore` orchestrates all other stores on project open/save.

## Store conventions

- All 8 stores use `defineStore('name', () => { ... })` Composition API style
- `projectStore` is the orchestrator — it imports and distributes to all other stores
- `flowStore` snapshots before every mutation (undo/redo, max 50 steps)
- Never mutate a store's state directly from components — always go through store actions

## mappingEngine.ts conventions

- `flowToScript(nodes, edges)` → string in custom `.gs` script language
- `scriptToFlow(script)` → `{ nodes, edges, errors }` (ParseResult)
- **Use `parseNum(raw, fallback)`** helper instead of `parseInt(x) || default` — the latter treats `0` as falsy and incorrectly falls back
- Body values in parsed directives are always strings — use `Number()` or `parseNum()` before comparing/storing as number
- Adding a new node type touches: `types/index.ts`, `mappingEngine.ts` (format + parse), `FlowEditor.vue` (onConnect + onEdgeClick), `NodePanel.vue`, and a new node component in `components/nodes/`

## Node types (17)

`dialog | choice | condition | setVariable | goto | end | audio | cg | wait | random | label | animation | savePoint | timer | moveCharacter | steamAchievement | achievement`

Each has a `.vue` component in `components/nodes/` with `Handle` components (target top, source bottom) from `@vue-flow/core`.

## CSS

- Design tokens in `styles/variables.css` (`:root` dark, `:root[data-theme="light"]` light)
- Global Element Plus overrides in `styles/global.css`
- All component styles use `var(--token-name)` — never hardcode colors/spacing/font-size
- Theme toggled via `uiStore.setTheme()` which sets `data-theme` on `<html>`

## Gotchas

- **`parseInt(x) || default` is a bug pattern** — 0 is falsy. Always use the `parseNum()` helper.
- **Node `data` is loosely typed** — many places use `as any`. When adding new node properties, prefer defining the shape in `types/index.ts` and narrowing with type guards.
- **`parseDialogDirective` body values are all strings** — `typeof body['typingSpeed'] === 'number'` is always false.
- **Test environment is jsdom**, not a real browser — DOM measurements, canvas, and PixiJS rendering are unavailable.
- **The `.gs` script format is custom** — not Ren'Py or any standard VN format. The parser is a hand-written recursive descent parser with error recovery (skips to next `}` on failure).
- **TypeScript config is split** — `tsconfig.node.json` for main/preload, `tsconfig.web.json` for renderer. The `@renderer` alias only works in renderer context.
