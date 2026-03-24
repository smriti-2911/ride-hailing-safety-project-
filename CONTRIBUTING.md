# Contributing to NavSafe

This project is set up for **two or more collaborators** (e.g. portfolio + teammate). Follow this workflow so `main` stays stable and reviews stay clear.

---

## Ground rules

1. **Never commit secrets** — `.env`, API keys, Twilio tokens, or database files with real user data.  
2. **Small, focused PRs** — one feature or fix per pull request when possible.  
3. **Sync before large work** — `git pull origin main` and resolve conflicts early.

---

## Branching model

| Branch | Purpose |
|--------|---------|
| `main` | Always deployable / demo-ready. Protected in GitHub (recommended). |
| `feature/<short-name>` | New work, e.g. `feature/history-export`, `fix/cors-prod`. |

```bash
git checkout main
git pull origin main
git checkout -b feature/your-change
# ... commit ...
git push -u origin feature/your-change
```

Open a **Pull Request** into `main` on GitHub.

---

## Pull requests

- Use the **PR template** (`.github/pull_request_template.md`) — it reminds you to test and list env changes.  
- Request review from your collaborator before merging.  
- **Squash merge** is fine for a clean history on `main`.

---

## Local setup

See the root **README.md** for backend/frontend install. Both people should use:

- Same **Node** and **Python** versions as much as possible (note them in the PR if you upgrade).  
- Copy **`backend/.env.example`** → `backend/.env` and **`frontend/.env.example`** → `frontend/.env.local` (not committed).

---

## Code style

- **Python:** match existing patterns in `backend/` (Flask blueprints, services).  
- **React:** functional components, existing Tailwind patterns in `frontend/`.  
- **Commits:** clear messages, e.g. `feat: add export`, `fix: Twilio E.164 edge case`.

---

## Deployment awareness

If your change affects **environment variables** or **build** (e.g. new `VITE_*` var), update **DEPLOYMENT.md** and mention it in the PR description.

---

## Questions

Use GitHub **Issues** (or your team chat) for design questions so decisions stay searchable.
