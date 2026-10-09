# Mobile update deployment guide

The responsive update improves the KeMU portal at phone widths, including the login screen, navigation drawer, dashboard cards, admin forms, registration cards, results tables, and result-slip actions.

## Apply the update to GitHub

1. Download and extract this update package.
2. Open the extracted folder and your cloned GitHub repository folder.
3. Copy these files/folders into the GitHub repository and replace the existing versions:

```text
public/app.js
public/styles.css
server.mjs
public/
dist/
```

The updated `public/app.js` includes the results and result-slip feature. The updated `public/styles.css` keeps the full desktop design and adds mobile rules. Do not copy `.git`, `node_modules`, `.env`, or `.env.*`.

4. In the GitHub repository terminal, run:

```powershell
npm.cmd ci
npm.cmd run build
node --check server.mjs
node --check public\app.js
git diff --check
git add .
git commit -m "Improve mobile portal layout"
git push origin main
```

## Deploy on Render

1. Open the Render dashboard.
2. Open the `kemu-student-portal-1` service.
3. Choose **Manual Deploy → Deploy latest commit**, unless automatic deploys are enabled.
4. Wait for the deployment to finish.
5. Check:

```text
https://kemu-student-portal-1.onrender.com/api/health
```

The response should report `database: ready`.

6. Open the portal on a phone or narrow browser window and refresh it.

## Mobile checks

Verify that:

- The sign-in card fits without horizontal scrolling.
- The sidebar opens from the menu button and closes after navigation.
- The dashboard stacks into one column.
- Admin forms become one column.
- Course cards become one column.
- Tables can be swiped horizontally without breaking the page.
- The Results & Slips page remains usable.
- The result-slip print window can still be saved as PDF.

The update does not change database records, student login credentials, or fee values. Deploying code does not add the five new students; add those records through the live admin dashboard connected to the Render database.
