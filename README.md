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

The game preserves three chapters, fourteen bosses, nine named spells, 150 player HP, genuine cooldown validation, one-attempt vocabulary questions, 50/50 boss counterattacks, avatar permanence, defeat/retry, rewards, progression locking, and the final `SPECTRAL CHAMPION` title. Questions are originally written and do not reproduce textbook passages verbatim.

## Deployment

The included Dockerfile runs the single FastAPI application with Uvicorn. A standard Python host can use `uvicorn app:app --host 0.0.0.0 --port $PORT`.
