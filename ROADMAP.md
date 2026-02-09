# Flow Extension - Development Roadmap

## 🎯 Project Vision

Transform the terminal into a persistent, interactive "DevOps Canvas" - a Jupyter Notebook for CLI operations.

---

## ✅ **COMPLETED**

- [x] VS Code extension scaffold
- [x] Custom editor registration for `*.flow` files
- [x] React webview setup
- [x] Build system (esbuild + TypeScript)
- [x] Test infrastructure (vscode-test + Mocha)
- [x] Dependencies installed (node-pty, xterm.js, React)
- [x] Consolidated to `dist/` directory

---

## 🚧 **PHASE 1: THE VERTICAL SLICE** (Current Phase)

**Goal:** Get one terminal block working end-to-end

### In Progress:

- [ ] Create PTY Manager service (`src/extension/PtyManager.ts`)
- [ ] Implement Terminal component (`src/webview/components/Terminal.tsx`)
- [ ] Set up message passing (Extension ↔ Webview)
- [ ] Display working terminal in webview
- [ ] Test: Run `echo "Hello World"` in terminal

**Estimated Time:** 3-5 days  
**Success Criteria:** Open `.flow` file → See working terminal → Type commands → Get output

**Next Workflow:** `/implement-terminal-block`

---

## 📦 **PHASE 2: THE BUILDER**

**Goal:** Multiple blocks + drag-and-drop layout

### Features:

- [ ] Add "Add Block" button in UI
- [ ] Implement block CRUD (Create, Read, Update, Delete)
- [ ] Masonry layout with drag-and-drop (react-grid-layout or custom)
- [ ] Save/Load block positions to `.flow` JSON
- [ ] Multiple simultaneous terminal sessions

**Estimated Time:** 1-2 weeks  
**Success Criteria:** Create 3 blocks → Rearrange them → Save → Reload file → Layout persists

---

## 🧠 **PHASE 3: THE INTELLIGENCE**

**Goal:** Smart output detection + AI features

### Features:

- [ ] **Output Parsers:**
  - JSON auto-detection → Render with react-json-view
  - Table detection (CSV/TSV) → Render with TanStack Table
  - Image detection (Base64/paths) → Render as `<img>`
  - URL detection → Mini-browser preview

- [ ] **Secret Management:**
  - Use VS Code SecretStorage API
  - Support `${env:API_KEY}` in commands

- [ ] **AI Integration:**
  - "Fix It" button on errors
  - Send error + context to LLM
  - Suggest solutions

**Estimated Time:** 2-3 weeks  
**Success Criteria:** Run `curl api.com` → JSON auto-renders as tree view

---

## 🔮 **FUTURE PHASES**

### Phase 4: Command Chaining & Dependencies

- [ ] Dependency graph (Block B runs after Block A)
- [ ] Variable piping (`${OUTPUT_A}` in Block B)
- [ ] Parallel execution

### Phase 5: Performance & Scale

- [ ] Circular buffer for high-frequency logs (10k lines/sec)
- [ ] Virtual scrolling for huge outputs
- [ ] Throttled IPC messaging (16ms batches)

### Phase 6: Polish & Distribution

- [ ] Comprehensive testing
- [ ] Documentation
- [ ] VS Code Marketplace submission
- [ ] Marketing & community building

---

## 📊 **Success Metrics** (From PRD)

1. **Activation Rate:** % users who create a 2nd block
2. **Retention:** % users opening same .flow file >3 times/week
3. **Performance:** 60fps with 4 active terminal streams

---

## 🛠️ **Development Workflow**

### Daily Development:

1. `pnpm run watch` - Start watch mode
2. Press `F5` - Launch Extension Development Host
3. Make changes - Hot reload enabled (when `FLOW_DEV_RELOAD=true`)
4. `pnpm test` - Run tests before commits

### Before Commits:

- `pnpm run check-types` - Type checking
- `pnpm run lint` - Code linting
- `pnpm test` - Full test suite

---

## 📚 **Key Technical Decisions**

| Aspect           | Choice              | Rationale                            |
| ---------------- | ------------------- | ------------------------------------ |
| **Terminal**     | xterm.js + node-pty | Industry standard, ANSI support      |
| **UI Framework** | React 18            | Component reusability, ecosystem     |
| **State**        | Context + Immer     | Immutable updates, simple            |
| **Styling**      | Tailwind CSS        | Rapid prototyping, utility-first     |
| **Build**        | esbuild             | 100x faster than webpack             |
| **File Format**  | JSON                | Human-readable, version-controllable |

---

## 🆘 **Need Help?**

- **Stuck on implementation?** Use `/implement-terminal-block` workflow
- **Architecture questions?** Reference `prd.md`
- **Testing issues?** Tests should pass consistently now
- **Build problems?** Everything outputs to `dist/` only

---

**Current Focus:** Complete Phase 1 by implementing the terminal block ↑
