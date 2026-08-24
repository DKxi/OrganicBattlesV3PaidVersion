# Organic Battles V2

Organic Battles V2 is a browser-based educational RPG where organic chemistry vocabulary powers fantasy combat. FastAPI is authoritative for questions, damage, HP, cooldowns, boss attacks, progression, rewards, and avatar permanence. Phaser renders the responsive battle arena and procedural combat silhouettes/effects.

## Run locally

```bash
python -m venv .venv
.venv\\Scripts\\activate
pip install -r requirements.txt
uvicorn app:app --reload
```

Open `http://127.0.0.1:8000`. Run tests with `pytest`.

## Accounts and email setup

Accounts are stored in SQLite at `organic_battles.sqlite3` (override with `DATABASE_PATH`). Passwords and confirmation codes are stored as one-way hashes. The browser receives only an HttpOnly session cookie; no Google API key or SMTP credential is used in frontend code.

For local testing without mail credentials, leave `SMTP_HOST` unset. The server prints the confirmation code to its terminal; this is development-only behavior and the code is never returned by an API. To use a local file, copy `.env.example` to `.env`; the server loads it automatically at startup. Existing system environment variables take precedence. For real delivery, configure an SMTP provider. Gmail works with a Google account SMTP app password (enable 2-Step Verification and create an app password):

```text
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-account@gmail.com
SMTP_PASSWORD=your-16-character-app-password
SMTP_FROM=your-account@gmail.com
COOKIE_SECURE=1       # use 1 behind HTTPS
```

Copy these values into the server environment, never into JavaScript or a committed file. Restart the server after changing them. New users must enter the emailed six-digit code within 15 minutes; resending invalidates the previous code. A verified login opens avatar onboarding, and the selected avatar is saved to the same account.

Alternatively, local development may use the ignored `secrets.toml` file. Put the Gmail sender and app password under `[gmail]` as shown in that file. Environment variables take precedence over `secrets.toml`. The app password is used for Gmail SMTP authentication; it is not a Google API key.

Example local flow: start Uvicorn, click `ENTER THE LABYRINTH`, choose `CREATE ACCOUNT`, submit an email/username/password, copy the code from the Uvicorn terminal, verify it, choose an avatar, and enter the battle. Use a unique username; attempting a duplicate shows `Username taken, choose a different one` in a modal.

The game preserves three chapters, fourteen bosses, nine named spells, 150 player HP, genuine cooldown validation, one-attempt vocabulary questions, 50/50 boss counterattacks, avatar permanence, defeat/retry, rewards, progression locking, and the final `SPECTRAL CHAMPION` title. Questions are originally written and do not reproduce textbook passages verbatim.

## Deployment

The included Dockerfile runs the single FastAPI application with Uvicorn. A standard Python host can use `uvicorn app:app --host 0.0.0.0 --port $PORT`.
