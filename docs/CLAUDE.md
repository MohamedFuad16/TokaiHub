# Project: TokaiHub

Modern React + Vite PWA for student productivity, including schedules, courses, assignments, and campus tools.

---

## Code Style

- Use TypeScript (strict mode preferred, avoid `any`)
- Use functional React components only
- Use named exports (avoid default exports unless already used in codebase)
- Styling: TailwindCSS only (no custom CSS files)
- Keep components small and reusable
- Prefer clarity over cleverness

---

## Commands

- `npm run dev`: Start development server
- `npm run build`: Build production app (outputs to `/build`)
- `npm run preview`: Preview production build

---

## Architecture

- `/pages` or `/screens`: Main app views (Home, Schedule, Courses, etc.)
- `/components`: Reusable UI components
- `/components/ui`: Shared UI primitives (cards, buttons, etc.)
- `/assets`: Images, mascot assets
- `/lib`: Utilities and shared logic

---

## UI / Design System

- Style: Modern SaaS (minimal, clean, Apple/Stripe-inspired)
- Colors:
  - Primary: Navy (#0B1F3A)
  - Accent: Blue (#3B82F6)
  - Background: White
- Use soft shadows, rounded corners (12–16px)
- Maintain consistent spacing (8pt grid)
- Mobile-first design

---

## Mascot Guidelines

- Yellow-black mascot used across the app
- Use for:
  - Empty states
  - Loading states
  - Friendly feedback
- Animations should be subtle and purposeful (not distracting)

---

## Routing

- Use React Router
- Must support SPA routing (all routes fallback to `/index.html`)
- Do not break existing routes

---

## State Management

- Use React hooks (`useState`, `useEffect`)
- Avoid unnecessary global state
- Keep logic simple and localized

---

## Performance

- Use lazy loading for routes where appropriate
- Avoid large dependencies
- Keep bundle size optimized

---

## Environment Variables

- Access via:
  `process.env.GEMINI_API_KEY`

- Never hardcode secrets

---

## Deployment

- Primary: Vercel
- Secondary: GitHub Pages

- Vercel:
  - Base path: `/`
  - Output directory: `/build`

- GitHub Pages:
  - Base path: `/TokaiHub/`

---

## Important Notes

- Do NOT change project structure unless explicitly asked
- Do NOT introduce new frameworks or libraries without reason
- Maintain consistency with existing UI and patterns
- Reuse components whenever possible
- Keep code readable and maintainable

---

## Expected Behavior (Claude)

- Act as a senior frontend engineer
- Follow existing patterns strictly
- Prioritize UI quality and consistency
- Avoid overengineering
- Ensure all code works with Vite

---

## Goal

Build a clean, fast, and production-quality student app with a premium user experience.