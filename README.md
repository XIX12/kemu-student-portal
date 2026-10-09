# KeMU Student Portal

## Local run
```bash
npm install
npm start
```
Open http://localhost:3000

## Render deploy — keep students (critical)

Render's default disk is **wiped on restart**. To keep admin-added students:

1. In Render: **Web Service → Disks → Add Disk**
2. Mount path: `/data`
3. Environment variables:
   - `DATA_DIR=/data`
   - `KEMU_ADMIN_PASSWORD=` (optional strong password)
   - `KEMU_ADMIN_USERNAME=admin`

## PDF downloads
Fees and Results pages open a print-ready slip with the KeMU logo and campus addresses. Use the browser **Print → Save as PDF**.

## Mobile
Responsive layout with slide-out navigation under 760px width.
