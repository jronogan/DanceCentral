## DanceCentral

DanceCentral is a role-based platform for dancers, choreographers, and employers to connect around gigs.
Users can register, choose one or more roles, manage their profile, and apply to posted gigs.

## Table of Contents

- [Tech stack](#tech-stack)
  - [Frontend](#frontend)
  - [Backend (API)](#backend-api)
- [Component Tree](#component-tree)
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
  - [env keys](#env-keys)
- [Notes](#notes)

## Tech stack

### Frontend

- React (Vite)
- React Router
- TanStack React Query
- CSS

### Backend (API)

- Python
- Flask
- PostgreSQL

> This repository is the **frontend**. It expects a running Flask API and talks to it via REST endpoints (see `src/library/api.js` and `src/library/dashboardApi.js`).

## Component Tree

![Component Tree Final](https://github.com/user-attachments/assets/d3723f59-2c3b-489a-ba91-2083d4714b3a)


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

### .env keys

- Frontend .env keys
  - VITE_FLASK_SERVER_URL
- Backend .env keys
  - DB
  - DB_HOST
  - DB_PORT
  - DB_USER
  - JWT_SECRET_KEY
  - CLOUDINARY_CLOUD_NAME
  - CLOUDINARY_API_KEY
  - CLOUDINARY_API_SECRET

## Notes

- API calls are centralized in `src/library/dashboardApi.js`.
