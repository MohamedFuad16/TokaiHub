# TokaiHub — Frontend Optimization Agent System

Build a structured multi-agent workflow to fix, improve, and optimize the TokaiHub React frontend (starting with the Home page). The system ensures UI consistency, performance efficiency, and future backend readiness.

---

## Problem Statement

The current frontend has:

- UI inconsistencies and layout issues
- No clear ownership of responsibilities
- No structured optimization workflow
- No preparation for backend (AWS API Gateway + Lambda)
- Performance inefficiencies (rendering, bundle size, etc.)

**Solution**: Introduce a coordinated agent system with clear ownership, responsibilities, and execution flow.

---

## Team Structure

### 🧭 Team Leader (Architecture Owner)

The Team Leader is responsible for maintaining **system coherence**.

#### Responsibilities:
- Ensure all changes align with:
  - App design system
  - Component structure
  - Future backend architecture
- Coordinate all agents
- Prevent conflicting implementations
- Review and merge all changes

#### Capabilities:
- Access to `notion-doc-refactor`
- MCP Notion integration

#### Final Responsibility:
- Produce a **clean documentation page** summarizing all changes

---

## Agent Roles

### 🎨 UI/UX Agent

Focus: **Visual quality and user experience**

#### Responsibilities:

**1. Layout & Structure**
- Fix spacing, padding, alignment
- Improve grid usage

**2. Visual Hierarchy**
- Ensure clear content priority
- Improve readability

**3. Responsiveness**
- Mobile-first adjustments
- Tablet + desktop scaling

**4. Visual Consistency**
- Standardize colors, typography, buttons
- Ensure consistent icon usage (Lucide)

**5. Component-Level Improvements**
Work across:
- Sidebar
- Home screen
- Cards
- Buttons
- Headers

---

### 🌐 Networking Agent

Focus: **Preparing frontend for backend integration**

#### Responsibilities:

**1. API Layer Setup**
- Centralize API calls (`api.ts`)
- Remove hardcoded endpoints

**2. AWS Readiness**
Prepare for:
- API Gateway
- Lambda
- Cognito

**3. Data Flow**
- Standardize request/response handling
- Add proper error handling

**4. Contract Awareness**
- Define expected API shapes
- Avoid breaking future backend integration

---

### ⚡ Performance Agent

Focus: **Efficiency and scalability**

#### Responsibilities:

**1. Rendering Optimization**
- Prevent unnecessary re-renders
- Use:
  - `React.memo`
  - `useMemo`
  - `useCallback`

**2. Lazy Loading**
- Route-based splitting
- Component-level lazy loading

**3. Bundle Optimization**
- Remove unused imports
- Reduce dependency size

**4. State Management**
- Avoid unnecessary global state
- Reduce prop drilling

**5. UX Performance**
- Eliminate lag
- Prevent layout shifts

---

## Execution Flow

### Phase 1 — Leader Planning

- Identify issues
- Define priorities
- Assign tasks to agents

---

### Phase 2 — Parallel Execution

Agents work independently within scope:

| Agent | Scope |
|------|------|
| UI/UX | Components, layout, design |
| Networking | API layer, integration readiness |
| Performance | Optimization |

---

### ⚠️ Critical Rule

Agents MUST NOT override each other’s work directly.

All changes must go through:

👉 **Leader Review**

---

### Phase 3 — Leader Integration

- Merge all contributions
- Resolve conflicts
- Ensure design + architecture consistency

---

### Phase 4 — Documentation

Leader uses:

👉 `notion-doc-refactor`

to generate a structured documentation page.

---

## Documentation Structure (Notion)

The final document must include:

### 1. Overview
- What was improved

### 2. Issues Identified
- UI problems
- Performance bottlenecks
- Missing architecture

### 3. UI/UX Improvements
- Layout fixes
- Design consistency updates

### 4. Networking Preparation
- API structure
- Future AWS readiness

### 5. Performance Enhancements
- Rendering improvements
- Bundle optimizations

### 6. Before vs After
- Clear comparison

### 7. Metrics (if available)
- Load time improvements
- Render optimization results

### 8. Next Steps
- Backend integration
- Further improvements

---

## Standards

### UI/UX
- Consistent spacing and typography
- Clean layout
- No visual clutter

### Code Quality
- No duplication
- Reusable components
- No hardcoded values

### Performance
- Efficient rendering
- Lazy loading where applicable

### Architecture
- Must support AWS backend integration

---

## Constraints

- No mixing of agent responsibilities
- No breaking existing app structure
- No ignoring performance considerations
- No inconsistent design patterns

---

## Goal

A clean, scalable frontend where:

- UI is consistent and responsive
- Codebase is structured and maintainable
- Performance is optimized
- System is ready for backend integration

---

## Next Step

Start execution with:

1. Leader defines issues
2. Agents begin parallel work
3. Leader integrates changes
4. Documentation is generated

---

