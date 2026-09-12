# Matchbox HQ

The working folder for a Gen Z matchbox brand launching in Pune on ₹20,000.

## What's here

| Folder | What it is |
|---|---|
| `app/` | **The office** — deploy this folder and you get the live site. See `app/DEPLOY.md`. |
| `deliverables/` | Everything the six desks produced: suppliers, legal, brand, launch, finance. |
| `website/` | The customer-facing pre-order site. Separate deploy. |
| `vendors/` | The vendor spreadsheet, maintained by Production & Ops. |
| `state/` | The live team state. Everything else reads from here. |

## Running it locally

    node server.js        # dashboard at localhost:4321, office at /office/
    node sync.js          # rebuild app/state.json + app/simple.html
    node sync.js --push   # ...and push, so the deployed site updates itself

## The office

- `/` — 3D office, falls back to a 2D canvas office automatically
- `/?mode=2d` — force the 2D office
- `/simple` — the plain dashboard, no graphics at all

Password is set in `app/config.js`. Change it with `node set-password.js "new one"`.
