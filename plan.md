# KeMU Student Portal — Implementation Plan

## Product scope
A responsive Kenya Methodist University student portal with two protected experiences: a student workspace for course registration and academic navigation, and an administrator workspace for creating student records, creating courses, and managing registrations. The product uses realistic seeded demo data, but fee information remains explicitly illustrative and no payment service is connected.

## Design direction
The visual system follows editorial academic modernism: quiet institutional confidence with contemporary rounded surfaces, generous whitespace, and readable data stories. KeMU burgundy is the signature authority color for navigation, headings, and high-intent actions; teal and sky blue echo the crest’s landscape and give progress states an optimistic tone; warm ivory and soft gray keep the portal comfortable for longer sessions.

The layout uses an anchored rail with an offset content canvas. Signature motifs are burgundy “ink” panels, paper-like cards, a restrained teal data accent, and small all-caps editorial labels. Interactions are direct and visibly acknowledged through active navigation, registration states, short feedback toasts, and a compact mobile drawer. `DM Sans` carries interface text while `Fraunces` creates the display hierarchy. The brand voice is personal and purposeful: “Keep your semester moving” and “Build the student record with care.”

## Implementation approach
- Vanilla HTML, CSS, and JavaScript are served by a Node 22 application on port 3000.
- The managed server and managed MySQL database are enabled. Database initialization is deterministic and additive: it creates `kemu_students`, `kemu_courses`, `kemu_registrations`, and `kemu_sessions` only when absent, then seeds the initial demo courses and Amara Njeri sample record.
- Database access uses `mysql2` with TLS. Registration changes use transactions, capacity checks, duplicate protection, and reversible withdrawals that preserve registration history.
- Manus OAuth is the only login provider. The application uses the reserved `webdev_app_session` cookie name, validates Preview JWTs when present, and stores OAuth-created sessions server-side with `SameSite=None; Secure` cookies for embedded Preview compatibility.
- The configured `KEMU_ADMIN_EMAIL` protected value determines administrator access. A matching Manus account can add students, add courses, register a course for a student, and withdraw an active registration. A student’s Manus email must match their student record to access the student workspace.
- The frontend calls `/api/auth/me` and `/api/bootstrap` on startup. Student course cards call `/api/registrations`; admin forms call `/api/admin/students`, `/api/admin/courses`, and `/api/admin/registrations`.
- `Dockerfile` installs from `package-lock.json`, builds the frontend into `dist`, and starts `server.mjs`. `deploy.healthPath` is `/api/health` and the server publishes both the UI and API.
- The supplied full KeMU corporate logo is stored at `/manus-storage/KeMU-Corporate-Logo-Full-1_f6fcbf97.png` and the platform metadata points to the durable public CDN copy.

## Project structure
- `public/index.html` — portal entry shell and metadata.
- `public/styles.css` — responsive design system, login page, student registration cards, admin forms, and management tables.
- `public/app.js` — authenticated client state, student/admin views, forms, registration actions, and feedback.
- `public/manus-routes.json` — single-page route manifest.
- `server.mjs` — OAuth flow, session validation, MySQL schema/seed, API routes, and static serving.
- `Dockerfile` — production container build and entrypoint.
- `build.mjs` — deterministic frontend asset build into `dist/`.
- `app.config.ts` — project logo metadata.
