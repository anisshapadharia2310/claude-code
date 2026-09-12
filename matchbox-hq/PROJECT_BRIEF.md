# Matchbox HQ — project brief

**Read this first if you are a fresh session.** It is the handover note.
Last updated: 12 Sep 2026.

---

## 1. The business

A Gen Z collectible **matchbox brand launching in Pune, India**, on a total
capital of **₹20,000**. Not a rupee more — this is a hard ceiling, not a target.

- **Product:** safety matches, pink or black heads on black/carbonised sticks,
  in a collectible meme/art-style printed box. The box is the product; people
  buy it to keep and photograph.
- **Price:** **₹99** a box (Finance ruled out ₹79 — see §5).
- **Sourcing:** Sivakasi / Kovilpatti, Tamil Nadu. **No China imports.**
- **Production model:** two parts.
  1. **Plain match trays**, bought in bulk once (~₹4–5 each), reused every drop.
  2. **Printed outer boxes**, short run per drop (~₹8–15 each), new art each time.
- **Launch:** Pune only. IT-park crowds (Hinjewadi, Magarpatta, Kharadi), cafés,
  Gen Z, design/art people.
- **Channels, in order:** own pre-order site → Instagram (founder shoots it
  themselves) → Pune cafés/retail → *maybe* Amazon later. See §4 before
  promising any of the later ones.

## 2. Who the founder is, and how to talk to them

- The founder **has ADHD and does not read code or walls of text.**
- Short sentences. Bullets. Bold the number that matters. No jargon.
- **Always ask before:** spending money, choosing the brand name, choosing a
  supplier. Put it in Decisions Needed with 2–3 options and a recommendation,
  and **pause that task** until they answer.
- End a working session with a 5-line status: done / in progress / blocked /
  decisions needed / next.
- **Never invent** a phone number, company, price, journalist, or creator
  handle. A blank cell the founder fills on a call beats a fake one. Mark every
  unverified fact as unverified.

## 3. The team (7 desks + master)

The master agent plans, assigns, reviews and reports. Sub-agents execute and
write their progress to `/state` via `hq.js`.

| id | Desk | Owns |
|---|---|---|
| `prodops` | **Production & Ops** | Sivakasi suppliers, Pune box printers, samples, stock, the trays+boxes model |
| `supplier` | Supplier Scout | *Handed sourcing to Production & Ops.* Its research files stay on the board. |
| `legal` | Legal & Setup | GST, Udyam, trademark, packaging law, licences |
| `brand` | Brand & Content | Names, box concepts, Instagram calendar, seeding |
| `website` | Website Builder | The pre-order site: waitlist + per-drop pre-order |
| `launch` | **Sales & PR** | Pre-order/waitlist strategy, shipping promises, café + IT-park seeding, press and creators, the sales pipeline |
| `finance` | Finance | Unit economics, break-even, budget, Drop 02 trigger |

How an agent reports (run from the project root):

    node hq.js status <id> "<what I'm doing>"
    node hq.js log <id> "<one plain-English sentence>"
    node hq.js task <taskId> <todo|inprogress|review|done> "<note>"
    node hq.js deliverable <id> "<Name>" "<path>" "<one line>"
    node hq.js decision <id> "<title>" "<why>" "A. x::detail|B. y::detail" "<rec>"
    node hq.js budget "<exact line name>" <planned> <committed> "<note>"

`hq.js` is the **only** safe way to write to `/state` — it takes a lock, so
parallel agents don't clobber each other. It refuses any budget change that
would push total spend past ₹20,000.

## 4. Hard facts already established — do not re-litigate these

- **Matches are UN 1944, Class 4.1 flammable solids.** Shiprocket, Blue Dart,
  India Post and Ekart all refuse them. **Courier shipping is closed.** Drop 01
  is Pune-only, hand-delivered. This also gates Amazon/Flipkart/Blinkit/Zepto.
- **Sivakasi factories will not make 500 custom boxes.** Private labelling
  starts around 5,000–1,00,000 units. Hence the trays + printed-outer model.
- **GST on matches is 5%** (changed Sept 2025 — older figures online are stale).
  No registration needed under ₹40 lakh turnover, but Amazon/Flipkart force it.
- **No explosives/PESO licence needed for a reseller.** That burden sits with
  the factory. Coloured/star matches would change this — verify if it comes up.
- **Legal Metrology "packer" registration (~₹500)** IS needed — the founder's
  name on the box makes them the deemed packer.
- **Udyam (MSME) registration is free** and halves the trademark fee
  (₹9,000 → ₹4,500). Do it at udyamregistration.gov.in — beware lookalike
  paid sites.
- **Trademark class for matches is 34**, not 4.
- **Tobacco advertising rules are strict.** Never market this as a smoking
  product. Position around fire, art, collecting, chai, diyas, cake, candles,
  incense, campfires.
- **Names already dead:** Teeli, Kadak, Phuljhadi, Small Fires, Burn Book,
  Phos, Strike Club, Matchwallah.
- **"Gerwin Matches" does not exist** — it is Geewin Exim Pvt Ltd.
- This machine's network blocks IndiaMART, TradeIndia, most company sites,
  cdnjs, netlify.com and vercel.com. Web research is search-snippet only.
  npm and GitHub are reachable.

## 5. The numbers as they stand

- **Landed cost per box, Drop 01:** low ₹13.50 · **mid ₹18.00** · high ₹23.00
- **Price: ₹99.** At ₹79, mid cost, break-even is 303 boxes out of a 300-box
  drop — you sell out and are still short.
- **Break-even: ~204 boxes** (best 171, worst 265).
- **Drop 01 shrank to 300 boxes** — 500 does not fit in ₹20,000 at ₹18/box.
- **Drop 02 is the profit engine:** trays already paid for → ~₹11/box,
  break-even 73 boxes.
- **What the founder keeps per box at ₹99, mid cost:** Instagram hand-delivered
  **₹78** · café wholesale ₹30 · website + rider ₹18.70.
- **Pre-order gate: 60 paid boxes** before the production order is placed, and
  at least 25 must be from people not in the founder's contacts.
- **Danger line: if the balance goes under ₹8,000, stop all spending.**
- **Budget (totals exactly ₹20,000, nothing spent yet):** product ₹7,500 ·
  packaging/delivery ₹2,600 · ads ₹3,000 (locked until pre-orders exist) ·
  legal ₹1,000 · website ₹500 · reserve ₹5,400.

## 6. Where things live

    app/            The office — deployable static site. See app/DEPLOY.md.
    public/         The plain dashboard (served at / locally)
    deliverables/   26 files: every desk's output
    website/        The customer-facing pre-order site (separate deploy)
    vendors/        Matchbox_Vendors_Pune.xlsx — the founder's call tracker
    state/          Live team state. Everything reads from here.
    hq.js           The agent's write API for /state
    sync.js         Rebuilds app/state.json + app/simple.html
    autosave.js     Watches the project and commits changes on its own
    server.js       Local server: / = dashboard, /office/ = office, /simple

**The office** has two renderers over one shared layout (`app/layout.js`), so
the 3D view and the 2D canvas fallback cannot drift apart. It never shows a
failure screen: no WebGL → 2D; context lost mid-session → switches live.
`?mode=2d` forces 2D. `/simple` is the no-graphics dashboard.
Office password lives in `app/config.js`; change it with
`node set-password.js "new one"`.

## 7. Status right now

- **Nothing has been spent. ₹20,000 intact.**
- **Nothing has been sold.** Waitlist 0, pre-orders 0, cafés pitched 0.
- All 7 desks have reported. 23 tasks sit in **Ready for you**; 3 done; 2 queued.
- The office is built and tested (7 device cases, 0 failures) but **not yet
  deployed** — the founder has to drag the `app` folder onto Netlify Drop.

**Four decisions block everything:**

| id | Question | Recommendation |
|---|---|---|
| D-001 | How do we take money on day one? | Waitlist now, real payments later |
| D-002 | Which brand name do we lock? | **KAADEPETI** (Pinkhead as the flagship box) |
| D-009 | 300 boxes at ₹99? | Yes — 300 at ₹99, trays bought once |
| D-011 | How many trays in the first bulk order? | 1,000 (~₹5,500 landed) |

Seven more decisions are parked as "can wait" (trademark timing, address on the
box, shipping outside Pune, 3-box set price, ad pricing).

**Hard deadline: the brand name must be locked by Fri 25 Sep**, or the printer
cannot start and the drop date slips day for day.

**The single most important next action** is not a Claude task: the founder
must DM ~50 people by hand and start the waitlist, and call the Sivakasi
vendors from `vendors/Matchbox_Vendors_Pune.xlsx`. Nothing else moves until
money starts arriving.

## 8. Picking this up in a fresh session

1. Read this file, then `state/decisions.json` for anything newly answered.
2. `node server.js` → dashboard at localhost:4321, office at `/office/`.
3. `node autosave.js &` to resume automatic commits (see §9).
4. Check `state/requests.json` — anything the founder typed into the dashboard's
   "Send instructions" box lands there. Act on it first.
5. Re-brief sub-agents from §3. Give each one the §4 hard facts so they don't
   contradict work already done.

## 9. Automatic commits

`autosave.js` watches `state/`, `deliverables/`, `app/`, `website/`, `vendors/`
and `public/`. When something changes it waits for 45 seconds of quiet, runs
`sync.js`, then commits and pushes with a message describing what moved. It is
started automatically by the SessionStart hook in `.claude/settings.json`, and
can be run by hand with `node autosave.js`.

It will not commit an empty change, and it never touches anything outside the
project folder.
