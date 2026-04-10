# TokaiHub — Frontend Optimization & Feature Enhancement Agent System

Build a structured multi-agent system to **fix UI/UX bugs, improve performance, ensure data consistency, and introduce controlled feature enhancements** in the TokaiHub React frontend.

This system also introduces a **developer toggle system** to enable/disable new features safely.

---

## Problem Statement

The current frontend suffers from:

- UI/UX inconsistencies and layout issues
- Poor animation quality (non-smooth transitions)
- Performance inefficiencies (rendering + bundle usage)
- Broken or inconsistent schedule data (daily/weekly/monthly mismatch)
- Weekly schedule showing incorrect data (not user-selected courses)
- Lack of structured feature rollout control
- No systematic bug validation process

---

## Core Objectives

- Fix UI/UX bugs across all key screens
- Improve rendering performance and responsiveness
- Ensure **data consistency across schedule views**
- Add **advanced animations where appropriate**
- Introduce **feature toggle system (developer control)**
- Enable **safe feature experimentation**
- Perform **regressive bug testing across flows**

---

## Team Structure

### 🧭 Team Leader (Architecture Owner)

Owns **system integrity, feature coherence, and final validation**

#### Responsibilities:
- Ensure all changes align with:
  - App design system
  - UX consistency
  - Data architecture
- Coordinate all agents
- Validate feature toggles
- Resolve cross-agent conflicts

#### Capabilities:
- `notion-doc-refactor`
- MCP Notion integration

#### Final Output:
- Full structured documentation of:
  - Fixes
  - Enhancements
  - New features
  - Known issues

---

## Agent Roles

---

### 🎨 UI/UX Agent

Focus: **Bug fixing + visual refinement + animation upgrades**

#### Responsibilities:

**1. UI Bug Fixes**
- Fix layout breaking issues
- Resolve spacing inconsistencies
- Fix misaligned elements

**2. Home Screen Animation Fix**
- Fix bottom sliding bar:
  - Smooth easing
  - Proper timing
  - Remove jank
- Replace with **advanced motion system (framer-motion tuned)**

**3. Animation Enhancements**
- Add subtle animations to:
  - Cards
  - Navigation transitions
  - Page entry/exit
- Avoid over-animation (performance-aware)

**4. Visual Consistency**
- Normalize:
  - Typography
  - Colors
  - Component styling
- Ensure design system alignment

**5. Responsiveness**
- Fix mobile + tablet layouts
- Ensure consistent scaling

---

### 🌐 Networking & Data Consistency Agent

Focus: **Fix schedule data logic + prepare backend integration**

#### Critical Issues to Fix:

**1. Schedule Data Inconsistency**
- Daily / Weekly / Monthly views MUST match
- All views must derive from **same source of truth**

**2. Weekly View Bug (IMPORTANT)**
❌ Currently:
- Shows all class data

✅ Fix:
- Only show **selected courses**
- Must match:
  - Settings page selections
  - User profile data

**3. Single Source of Truth**
- Use:
  - `selectedCourseIds`
- Ensure:
  - Home
  - Schedule
  - Settings
ALL use the same dataset

**4. Data Flow Fix**
- Normalize data transformation
- Remove duplicate filtering logic

**5. Future API Readiness**
- Prepare structure for:
  - API Gateway
  - Lambda
- Centralize API layer (`api.ts`)

---

### ⚡ Performance Agent

Focus: **Speed, efficiency, and smooth UX**

#### Responsibilities:

**1. Rendering Optimization**
- Prevent unnecessary re-renders
- Use:
  - `React.memo`
  - `useMemo`
  - `useCallback`

**2. Animation Performance**
- Ensure animations:
  - Do not block main thread
  - Use GPU-friendly transforms
  - Avoid layout thrashing

**3. Lazy Loading**
- Optimize route-based loading
- Defer heavy components

**4. Bundle Optimization**
- Remove unused code
- Optimize imports
- Reduce bundle size

**5. State Optimization**
- Avoid redundant state
- Clean data flow

---

### 🧪 QA / Regression Testing Agent

Focus: **Stability and validation**

#### Responsibilities:

**1. Regression Testing**
- Test:
  - Home screen
  - Schedule (daily/weekly/monthly)
  - Settings
- Ensure no new bugs introduced

**2. Data Consistency Testing**
- Verify:
  - Selected courses = displayed courses
- Cross-check all views

**3. Animation Testing**
- Ensure:
  - Smooth transitions
  - No flicker or jump

**4. Edge Cases**
- Empty states
- No courses selected
- Large datasets

---


## Feature System — Developer Toggle

### 🎛️ Developer Feature Toggle (NEW)

Add toggle in **Settings → Developer Section**

#### Purpose:
- Enable/disable new enhancements safely

#### Behavior:

```ts
settings: {
  enableEnhancedUI: boolean;
}

---

## 🧠 Team Leader — MCP Execution & Documentation System (CRITICAL)

The Team Leader is not just coordinating — they are an **agent orchestrator + documentation owner**.

They use:

- MCP (Model Context Protocol)
- `notion-doc-refactor` skill

to **transform implementation work into structured documentation automatically**

---

### 🧩 Leader Workflow (Step-by-Step)

#### Step 1 — Planning Phase
- Analyze current issues:
  - UI bugs
  - Schedule inconsistencies
  - Performance problems
- Break work into:
  - UI tasks
  - Data tasks
  - Performance tasks

---

#### Step 2 — Agent Orchestration

Leader spawns and manages:

- UI/UX Agent
- Networking Agent
- Performance Agent
- QA Agent

Each agent:
- Works independently
- Reports changes back to Leader

---

#### Step 3 — Review & Integration

Leader:
- Reviews all changes
- Ensures:
  - No conflicting logic
  - UI consistency
  - Correct data flow
- Approves or rejects agent outputs

---

#### Step 4 — Documentation via MCP + Skill

After implementation is complete:

Leader uses:

👉 `notion-doc-refactor`

+ MCP Notion integration

to generate a **clean, structured documentation page**

---

### 📝 Documentation Generation Rules

The Leader MUST:

- Convert raw implementation into:
  - Clean sections
  - Standardized formatting
  - Clear explanations

- Remove:
  - messy notes
  - duplicate info
  - unclear reasoning

---

### 📄 Final Notion Output Structure

The generated Notion page MUST include:

#### 1. Overview
- What was fixed and improved

#### 2. UI/UX Fixes
- Layout issues resolved
- Animation improvements
- Visual consistency updates

#### 3. Schedule Data Fix (CRITICAL)
- Root cause of inconsistency
- Fix using `selectedCourseIds`
- Alignment across:
  - Daily
  - Weekly
  - Monthly

#### 4. Performance Improvements
- Rendering optimizations
- Lazy loading updates
- Bundle size improvements

#### 5. New Features
- Developer toggle system
- Enhanced UI mode

#### 6. Animation Enhancements
- Bottom bar fix
- New motion improvements

#### 7. Regression Testing Results
- What was tested
- What passed
- Edge cases handled

#### 8. Before vs After
- Clear comparison of improvements

#### 9. Known Issues
- Remaining bugs (if any)

#### 10. Next Steps
- Backend integration (AWS)
- Future enhancements

---

### ⚠️ Leader Constraints

- MUST NOT skip documentation
- MUST ensure all agents’ work is reflected
- MUST maintain consistency with app architecture
- MUST produce clean, readable Notion output

---

### ✅ Success Criteria

The Leader is successful if:

- All agents complete tasks without conflict
- UI is consistent
- Schedule data is correct
- Performance is improved
- Documentation is clean, structured, and usable

---