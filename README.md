# KeMU Student Portal (complete)

Local student portal for Kenya Methodist University. **No MySQL required.**

## Requirements

- Node.js 18+ (22 recommended)
- Windows, macOS, or Linux

## Install & run

```bash
# unzip, then:
cd kemuportal-complete
npm install
npm run dev
```

Open **http://localhost:3000**

If PowerShell blocks `npm` on Windows:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

Or use **Command Prompt** instead of PowerShell.

## Logins

| Role | Username | Password |
|------|----------|----------|
| **Admin** | `admin` | `123456` |
| **Student** | Registration number (see below) | `123456` |

### Seeded students

| Reg. No | Name |
|---------|------|
| CIS-1-3170-3/2024 | Jonkuch Sabit Mer |
| CIS-0-1403-3/2024 | Peris Muthoni |
| SWD-0-2280-2/2024 | Agnes Malayeki |
| HSM-1-3016-3/2024 | Molly Auma |
| CIS-1-7192-3/2024 | Mariangel Achieng |
| CIS-1-9041-2/2024 | Veronicah Achieng |
| BIR-1-8536-3/2025 | Jasmine Awan |
| BHM-1-5631-3/2024 | Teresia Wambui |
| CIS-0-2397-1/2025 | Jesica Jepleting |
| BIR-1-8545-3/2025 | Mayer Daphine |
| BEH-1-3631-3/2024 | Sharley Nyumu |
| SWD-0-1983-1/2025 | Faith Kwamboka |

## Features

**Students**
- Login with registration number
- My Profile (shown after login)
- Course registration
- Fee statement (entry year → Semester 1, 2026/2027)
- Provisional results & CGPA

**Admin** (`admin` / `123456`)
- Change admin password
- Students: add, edit, delete, reset password
- Courses: add, edit, delete
- Registrations: assign / withdraw

## Data storage

All data is saved in `data/kemu-db.json` (created automatically on first run).

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start portal (http://localhost:3000) |
| `npm start` | Same as dev |
| `npm run build` | Copy frontend into `dist/` |
