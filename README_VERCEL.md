# Chandan Steel Plant Tour — Vercel deployment

This project is a Flask application designed for Vercel's Python runtime.

## Important changes for Vercel

- Vercel runs the Flask app as a serverless function; no `gunicorn` Start Command is required.
- OpenCV, NumPy and `pyzbar` were removed from the server runtime. QR detection is performed in the browser with the native `BarcodeDetector` API.
- Database credentials are read from environment variables.
- The app uses MySQL Connector/Python.
- Media captured by the browser is stored in the existing MySQL `user_report` LONGTEXT columns as base64 data.
- The local `venv`, `.git`, Visual Studio files and large database dumps are intentionally excluded from this deployment package.

## Vercel

Connect the repository to Vercel and deploy the project root. Vercel currently detects Flask from the root `app.py`; no Start Command or custom routing is required.

Do not use Render-style commands such as `gunicorn app:app` in Vercel.

## Required Vercel Environment Variables

Set these in Project → Settings → Environment Variables:

- `FLASK_SECRET_KEY`
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`

For the current GoDaddy database:

- Host: `a2nlmysql49plsk.secureserver.net`
- Port: `3306`
- Database: `factory_db2`

Do not commit real passwords.

## Database

The application expects these tables:

- `plants`
- `users`
- `admins`
- `checkpoints`
- `user_report`

Use `schema.sql` for the structure. Existing data should be imported into the GoDaddy MySQL database separately.

## Local test

```bash
python -m venv .venv
# Windows:
.venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

For Vercel, the production deployment is handled by Vercel; there is no Vercel Start Command to enter.

## QR scanning

The user dashboard uses the browser's native QR detector. Camera access requires HTTPS and a supported browser (current Chrome/Edge are recommended). If a browser does not expose `BarcodeDetector`, QR scanning will not work in that browser until a JS QR library is added.
