<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# TokaiHub
**The modern, central student portal for Tokai University.**

[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![AWS Amplify](https://img.shields.io/badge/AWS_Amplify-FF9900?style=for-the-badge&logo=aws-amplify&logoColor=white)](https://aws.amazon.com/amplify/)
[![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)](https://vitejs.dev/)

</div>

---

## 📖 Overview

**TokaiHub** is engineered to consolidate academic workflows, course tracking, and campus networking into a single, beautifully animated application. Built entirely as a modern Progressive Web App (PWA), TokaiHub feels like a native mobile app but runs directly from the browser with zero installations required.

## 🏗️ Architecture & Security

We built TokaiHub to meet modern high-availability standards leveraging **Amazon Web Services (AWS)** securely from the edge.

### Unique Auth Mechanism (Cognito)
We completely bypassed the standard AWS Cognito Hosted UI redirect pages to maintain our sleek, native user experience. 

Through `aws-amplify`, our custom authentication engine interacts intelligently with the backend:
- **Student ID Identity:** Under the hood, the raw `studentId` (e.g. `4CJE1108`) is strictly deployed as the primary Cognito string `username`, virtually eliminating any collision attacks.
- **Email Alias Integration:** We use AWS's `Email Alias` configuration, meaning students organically log in via `email` and `password`. AWS Cognito natively maps the alias immediately back to the student ID on the backend seamlessly.

## ✨ Current Progress (What's Done)

- [x] **PWA Foundation & Theming:** Mobile responsive, deeply integrated Tailwind styling, Dark/Light modes, and bilingual support (EN/JP).
- [x] **Interactive Onboarding UI:** A sleek, multi-step campus, course, and GPA collection wizard heavily polished with layout animations (`motion/react`).
- [x] **Custom Auth Workflows:** Replaced traditional AWS hosted websites with completely custom Login forms natively integrated with `aws-amplify`.
- [x] **Cognito OTP Integrations:** Registration dispatches SES-backed OTP verification codes, prompting an interactive step 3 "Check your email" loop entirely constructed from scratch inside the app.
- [x] **Mascot Pre-wiring:** Custom Fox Mascot character ready and integrated (currently hidden, primed for future UI upgrades).

## 🚀 Roadmap (Pending Integrations)

Our cloud infrastructure expands further over the coming sprints. The following pipeline is pending:
- [ ] **AWS Lambda Connectivity:** Serverless functions to handle student schedule validations, database fetching, and heavy data computations.
- [ ] **Route 53 DNS Configuration:** Migrating from `.github.io` to our heavily protected production TLD namespace.
- [ ] **AWS S3 Cloud Storage:** Allowing users to upload assignments, avatar pictures, and class materials seamlessly.
- [ ] **DynamoDB User Profiles:** Evolving our current local stubbed states to full persistence leveraging AWS databases.

---

## 🛠️ Local Development

Getting the app running locally is straight-forward.

**Prerequisites:** 
- Node.js (`v18.0.0+`)
- AWS CLI (If actively pushing Amplify config changes)

1. **Clone & Install Dependencies**
```bash
npm install
```

2. **Environment Variables**
Ensure you have the required backend bindings (or simply skip dev auth in `App.tsx`)
```bash
# Add to .env.local if needed
GEMINI_API_KEY=YOUR_KEY
```

3. **Boot the Dev Server**
```bash
npm run dev
```

> **Note**: For bypassing AWS Auth requirements locally during rapid UI developments, flip `settings.devSkipAuth = true` inside your App environment flags.
