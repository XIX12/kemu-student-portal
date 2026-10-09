# KeMU standalone portal setup

This version does not use Manus OAuth. It uses the Aiven MySQL database and its own login form.

## Render environment variables

Add these variables to the Render web service or a linked environment group:

```text
DATABASE_URL=<complete Aiven MySQL Service URI>
ADMIN_USERNAME=<administrator username>
ADMIN_PASSWORD=<strong administrator password>
DEFAULT_STUDENT_PASSWORD=123456
```

`DATABASE_URL` must be the complete Aiven URI, including `?ssl-mode=REQUIRED`. Keep all values private; never commit them to GitHub.

## Login

- Students sign in using their **registration number** and password.
- New and imported student records receive the `DEFAULT_STUDENT_PASSWORD` value. The current default is `123456`; change it in Render before production use if desired.
- The administrator signs in using `ADMIN_USERNAME` and `ADMIN_PASSWORD`.

## Deployment

Render build command:

```text
npm ci && npm run build
```

Render start command:

```text
npm start
```

After saving variables, use **Save, rebuild, and deploy**. Check:

```text
https://YOUR-RENDER-DOMAIN/api/health
```

Expected response:

```json
{"ok":true,"database":"ready"}
```

The database migration adds `password_hash` to `kemu_students` and assigns the default student password to existing records that do not yet have one. It does not delete student, course, registration, or result records.
