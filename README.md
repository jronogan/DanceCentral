## DanceCentral

DanceCentral is a role-based platform for dancers, choreographers, and employers to connect around gigs.
Users can register, choose one or more roles, manage their profile, and apply to posted gigs.

## Table of Contents

- [Tech stack](#tech-stack)
  - [Frontend](#frontend)
  - [Backend (API)](#backend-api)
- [How it works (new user guide)](#how-it-works-new-user-guide)
  - [1) Register](#1-register)
  - [2) Log in](#2-log-in)
  - [3) Dashboards](#3-dashboards)
    - [Dancer / Choreographer](#dancer--choreographer)
    - [Employer](#employer)
  - [4) Profile](#4-profile)
- [Running locally](#running-locally)
  - [Prerequisites](#prerequisites)
  - [Install + start](#install--start)
  - [Build](#build)
- [Notes](#notes)
- [React + Vite](#react--vite)
  - [React Compiler](#react-compiler)
  - [Expanding the ESLint configuration](#expanding-the-eslint-configuration)

## Tech stack

### Frontend

- React (Vite)
- React Router
- TanStack React Query
- CSS

### Backend (API)

- Python
- Flask

> This repository is the **frontend**. It expects a running Flask API and talks to it via REST endpoints (see `src/library/api.js` and `src/library/dashboardApi.js`).

## How it works (new user guide)

### 1) Register

1. Go to the Register page.
2. Enter your details.
3. Pick one or more roles:
   - **Dancer**
   - **Choreographer**
   - **Employer**
4. If you pick Employer, you’ll fill in employer/company details.
5. If you pick Dancer/Choreographer, you’ll select skills.
6. Submit to create your account.

### 2) Log in

1. Log in with your email and password.
2. After login, you’ll be routed to a dashboard based on your active role.
3. If you have multiple roles, you can switch dashboards using the role switcher.

### 3) Dashboards

#### Dancer / Choreographer

- View your skills.
- Browse available gigs.
- Search gigs by name, details, or event type.
- Apply to gigs, and withdraw applications when needed.

#### Employer

- Create gigs (name, date, event type, details).
- Specify which roles you need (dancer/choreographer) and pay details.
- View applications for each gig.
- Shortlist / accept / reject applicants.
- Open an applicant profile modal for more detail.

### 4) Profile

All users can access **My Profile** to:

- Update their account details.
- Manage roles and skills.
- Upload profile media (profile photo / resume / showreel). Uploads use a signed Cloudinary flow so secrets stay on the backend.

## Running locally

### Prerequisites

- Node.js + npm
- A running Flask API (backend) configured for this frontend

### Install + start

```bash
npm install
npm run dev
```

### Build

```bash
npm run build
```

## Notes

- API calls are centralized in `src/library/dashboardApi.js`.
- The UI formats display strings (skills/roles/event types) with `formatString()` from `src/library/dashboardApi.js`.

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

> > > > > > > d72a744 (Initial commit)
