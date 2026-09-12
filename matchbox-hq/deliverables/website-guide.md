# Your website: how to use it

Written for you, not for a developer. No code knowledge needed.
Every section is numbered. Do one number at a time.

**Your website is one file:** `website/index.html`
Double-click it right now. It opens in your browser and works straight away.

There is one small companion file next to it, `website/state.json`. It holds a
copy of the drop numbers so the office dashboard can read them. You keep the
two in step by hand — Part 3E explains it in one minute.

---

## READ THIS FIRST (60 seconds)

There is **one block** in the file you are allowed to touch. It is near the top
and it is labelled:

```
SETTINGS YOU CAN CHANGE  —  this is the only block you need to touch
```

Inside it you change words between "quote marks". Never delete a quote mark.
That block controls: your brand name, the drop, the payment mode, the price,
your Instagram, and where signups go.

### Your site now has TWO sign-up forms. They are not the same thing.

| | **The waitlist** | **The pre-order** |
|---|---|---|
| When is it on the page? | Always. It never closes. | Only while a drop is open. |
| What does it ask for? | Name + WhatsApp number (email optional) + city | Name + WhatsApp + Pune area + how many boxes |
| Does it take money? | Never | Yes, if you switch the payment mode on |
| What is it for? | Your standing audience for every future drop | Selling the 500 boxes of one drop |

When a drop has not opened yet, is closed, or is sold out, the pre-order form
disappears on its own and the page tells people the truth — "Drop 01 is closed
— join the waitlist and you get first access to Drop 02" — with a button
straight to the waitlist. You do not have to rewrite anything for that.

**One warning before you share the link with anyone:**
Until you finish **Part 5** below, signups are only saved on the phone of the
person who typed them. That is a safety net for *you* while testing — it does
NOT collect strangers' details. Do Part 5 before you post the link on Instagram.

---

## PART 1 — Put it on the internet, free, in about 4 minutes

This is the easiest way that exists. No account signup needed to start.

1. Open your web browser.
2. Go to: **app.netlify.com/drop**
3. You will see a big drop area in the middle of the page. That is the target.
4. Open the folder on your computer that contains the website.
5. Drag the whole **`website`** folder onto that dashed box and let go.
6. Wait about 20 seconds. A green tick appears.
7. At the top of the page you now have a web address like
   `https://shiny-panda-4a2b1c.netlify.app`
8. Click that address. Your site is live on the internet. Anyone can open it.
9. Copy that address and message it to yourself so you don't lose it.
10. **Important:** if you dropped it without logging in, that link is temporary.
    Netlify will prompt you to make a free account to keep it. Click **Sign up**
    and use **Continue with Google** — it takes 15 seconds, and your site moves
    across automatically.
11. Done. It is live and it is yours. Cost so far: **₹0**.

### To give it a nicer free name
12. In Netlify, click **Site configuration**.
13. Click **Change site name**.
14. Type something like `yourbrand-drop01`.
15. Click **Save**. Your address becomes `https://yourbrand-drop01.netlify.app`.
16. That is a perfectly good link to put in your Instagram bio. Free forever.

### When you change something later
17. Edit `index.html` and save it.
18. Go back to Netlify and click **Deploys** in the left menu.
19. Drag the `website` folder onto the drop area at the bottom of that page.
20. Wait 20 seconds. The live site updates. Same address.

### If you would rather not use Netlify
The same drag-and-drop works at **cloudflare.com** (Workers & Pages → Create →
Pages → Upload assets) and **vercel.com**. All three are free for a site like
this. Pick one. Do not do all three.

---

## PART 2 — Put your brand name in (10 seconds)

1. Right-click `index.html` → **Open with** → **Notepad** (Windows) or
   **TextEdit** (Mac). Any plain text editor is fine.
2. Press **Ctrl+F** (Windows) or **Cmd+F** (Mac) to search.
3. Search for: `YOUR BRAND NAME`
4. You will find this line:
   ```
   BRAND:        "[YOUR BRAND NAME]",
   ```
5. Replace the words inside the quote marks with your brand name.
   Example: `BRAND:        "MATCHDAY",`
6. Save the file.
7. Refresh the page in your browser. The name is now everywhere — header, hero,
   footer, browser tab, and the WhatsApp share message.

While you are in there, do the same for:
- `INSTAGRAM:` — your handle, without the @
- `TAGLINE:` — the one line under the big headline
- The `LEGAL:` block at the bottom — paste these in when your legal agent
  gives them to you. They show in the footer.

The price, the box count and the dates are **not** here. They live in the
`DROP` block, which is Part 3 — the next section.

---

## PART 3 — The drop: open it, close it, and keep the counter honest

This is the part you will use most often. Everything about a drop is in **one
block** near the top of `index.html`. It looks exactly like this:

```
  DROP: {
    DROP_NAME:     "DROP 01",
    TOTAL_UNITS:   500,
    UNITS_CLAIMED: 0,
    OPEN_DATE:     "2026-09-22",
    CLOSE_DATE:    "2026-10-26",
    PRICE:         99,
    PRICE_SET3:    249,
    FORCE_STATE:   "auto"
  },
```

What each line means:

| Line | What it does |
|---|---|
| `DROP_NAME` | The name shown everywhere. "DROP 01", "DROP 02"… |
| `TOTAL_UNITS` | How many boxes exist in this drop. The "of 500" number. |
| `UNITS_CLAIMED` | How many are sold. **You type this in by hand.** |
| `OPEN_DATE` | The morning pre-orders open. Format: year-month-day. |
| `CLOSE_DATE` | The last day pre-orders are taken. That whole day counts. |
| `PRICE` | One box, in rupees. Today: 99. |
| `PRICE_SET3` | The three-box set, in rupees. Today: 249. |
| `FORCE_STATE` | Your manual override switch. Normally `"auto"`. |

**Dates are typed backwards on purpose:** `"2026-10-26"` is 26 October 2026.
Year first, then month, then day, with a dash between. Always four digits,
then two, then two.

---

### 3A — How to OPEN a drop (5 steps)

1. Open `index.html` in Notepad or TextEdit.
2. Find the `DROP:` block shown above.
3. Set `OPEN_DATE` to the day you want orders to start, e.g. `"2026-09-22"`.
4. Set `CLOSE_DATE` to the last day you will take orders, e.g. `"2026-10-26"`.
5. Save the file and re-upload it (Part 1, steps 17–20).

That is it. At midnight on the open date the page switches itself on: the
counter appears, the pre-order form appears, the big button changes.

**If you want it open RIGHT NOW, before the open date:**
1. Find the line `FORCE_STATE:   "auto"`.
2. Change it to `FORCE_STATE:   "open"`.
3. Save and re-upload. The drop is open this second, whatever the dates say.
4. When the real open date arrives, put it back to `"auto"` so the close date
   still works on its own.

---

### 3B — How to CLOSE a drop (pick one of three)

**Way 1 — let it close itself (recommended).**
1. Do nothing.
2. At the end of `CLOSE_DATE` the pre-order form disappears by itself.
3. The page then says "DROP 01 is closed — join the waitlist and you get first
   access to DROP 02", with a button to the waitlist.

**Way 2 — close it early, by hand.**
1. Find the line `FORCE_STATE:   "auto"`.
2. Change it to `FORCE_STATE:   "closed"`.
3. Save and re-upload. Orders stop immediately.

**Way 3 — say it is sold out.**
1. Find the line `FORCE_STATE:   "auto"`.
2. Change it to `FORCE_STATE:   "soldout"`.
3. Save and re-upload. The page shows "sold out" and the bar goes full.

You do not need Way 3 if the counter is honest — see 3C. When
`UNITS_CLAIMED` reaches `TOTAL_UNITS` the page flips to sold out on its own.

**In all three cases the waitlist stays open and keeps collecting names.**
That is the whole point: a closed drop should still grow your list.

---

### 3C — How to update the claimed count after taking orders (7 steps)

Do this at the end of every day you take orders. It takes two minutes.

1. Open your order list (the Google Sheet from Part 5, or your Formspree inbox).
2. Count the boxes — **boxes, not people.** Someone who bought the three-box
   set counts as 3.
3. Only count orders you have actually been paid for, or have genuinely agreed
   to deliver. Do not count "maybes".
4. Open `index.html`.
5. Find the line `UNITS_CLAIMED: 0,` and put your real number in place of the 0.
   Example: `UNITS_CLAIMED: 137,`
6. Open `state.json` in the same folder and change `"claimed": 0` to the same
   number, and `"left"` to whatever is left (500 − 137 = 363).
7. Save both files and re-upload.

The page now says "137 of 500 claimed" and "363 left", and the bar moves.

**Why there is no automatic counter.** A number that ticks up on its own is a
lie, and people can tell. This one only moves when you move it, and the page
says so out loud under the bar. That honesty is worth more than the fake
urgency. It also means the site needs no server and costs ₹0 to run.

---

### 3D — The four states, and what a visitor sees

| State | When it happens | What the visitor sees |
|---|---|---|
| **Not open yet** | Today is before `OPEN_DATE` | Counter at 0, "DROP 01 opens 22 Sep 2026", waitlist form |
| **Open** | Between the two dates, boxes left | Counter, progress bar, full pre-order form |
| **Sold out** | `UNITS_CLAIMED` reached `TOTAL_UNITS` | Full bar, "sold out", waitlist form |
| **Closed** | Today is after `CLOSE_DATE` | Frozen counter, "closed — join the waitlist", waitlist form |

In three of those four states the pre-order form is not on the page at all, so
nobody can order a box you cannot sell them.

---

### 3E — `state.json`, and which file wins

There are two copies of your drop numbers:

- `website/index.html` — the CONFIG block. **This is the one the website uses.**
- `website/state.json` — a small plain file for the office dashboard.

**The CONFIG block inside `index.html` always wins for the website.**
`state.json` is a copy for other tools to read. If the two disagree, the
website shows what is in `index.html` and the dashboard shows what is in
`state.json` — which is exactly the kind of confusion that makes you promise
a box you do not have.

So: **whenever you change one, change the other.** It is six numbers.

(There is an optional setting called `COUNT_SOURCE`. Leave it on `"config"`.
On that setting the site downloads nothing at all. If you ever set it to
`"published"`, the site reads the claimed number out of `state.json` instead,
and `state.json` becomes the one that wins for the counter only.)

---

### 3F — Reuse the same site for Drop 02 (change 4 lines)

When Drop 01 is finished and you want the same site for the next drop:

1. Open `index.html`.
2. Change line 1: `DROP_NAME:     "DROP 02",`
3. Change line 2: `UNITS_CLAIMED: 0,`
4. Change line 3: `OPEN_DATE:     "2026-12-01",`  (your new open day)
5. Change line 4: `CLOSE_DATE:    "2026-12-20",`  (your new close day)
6. If `FORCE_STATE` is not `"auto"`, put it back to `"auto"`.
7. Open `state.json` and change the same four things: `name`, `claimed`,
   `open`, `close`.
8. Save both. Re-upload.
9. Message your waitlist that Drop 02 opens on that date. They are the whole
   reason you kept the list running while Drop 01 was closed.

Change `TOTAL_UNITS` and `PRICE` too only if the new drop is a different size
or a different price. Everything else — the art, the copy, the FAQ — stays.

---

## PART 4 — Switching the payment mode (the one-line switch)

Find this line near the top of `index.html`:

```
PAYMENT_MODE: "waitlist",
```

Change the word in the quote marks to one of three things, save, refresh. Done.
The button text, the FAQ answer and the form all change to match.

**This switch only touches the PRE-ORDER form.** The waitlist never asks for
money in any mode, and it keeps working whatever you set here.

### Option "waitlist" — no money (this is where you are now)
- The pre-order form reserves a box instead of charging for it.
- Collects: name, WhatsApp number, email (optional), Pune area, which pack,
  pink or black.
- Charges nobody. Nothing to set up. Zero risk.
- **Use this until you have actually held a finished box in your hand.**

### Option "upi" — you get paid straight into your bank, 0% fees
Do these in order:
1. Change the line to `PAYMENT_MODE: "upi",`
2. Find the line `UPI_ID: "[YOUR_UPI_ID]",`
3. Replace the placeholder with your real UPI ID, e.g. `"yourname@okicici"`.
4. Find `UPI_NAME:` and put the name that shows in your UPI app.
5. You do **not** set the amount. The site works it out from `PRICE` and
   `PRICE_SET3` in the DROP block, and from the pack the customer picks —
   ₹99 for one box, ₹249 for the three-box set.
6. Optional but nice: open GPay or PhonePe, screenshot your own QR code, save
   that picture as **`upi-qr.png`** in the `website` folder next to
   `index.html`, then find `UPI_QR_FILE:  "",` and change it to
   `UPI_QR_FILE:  "upi-qr.png",`.
   If you skip this, the site shows a big "Open my UPI app and pay" button
   instead, which works fine on phones.
7. Save. Re-upload to Netlify (Part 1, steps 17–20).
8. The form now has an extra required box: "UPI reference / UTR number".
   That is how you match a payment to a person. Nobody can submit without it.
9. **You must check your bank app yourself.** The website cannot tell whether
   a payment actually happened. Match the reference number they typed against
   your UPI history before you promise anyone a box.

### Option "razorpay" — real card / UPI / netbanking checkout
Only do this once you have real stock. It costs about 2% + GST per order.
1. Make a free account at **razorpay.com** and finish the KYC (needs PAN, bank
   account and usually GST). This takes a few days to be approved.
2. In the Razorpay dashboard go to **Settings → API Keys → Generate Key**.
3. Copy **only** the "Key ID". It starts with `rzp_`.
   **Never copy the "Key Secret" into this file.** That one stays private.
4. In `index.html`, find `RAZORPAY_KEY_ID:` and paste the Key ID in the quotes.
5. Find the line in the code that says `STEP 5` in a comment, and delete the
   two words `false &&` from it. (That is the safety catch. Deleting those two
   words is what switches the real checkout on.)
6. Just above the last `</script>` line near the bottom of the file, add:
   `<script src="https://checkout.razorpay.com/v1/checkout.js"></script>`
7. Change the line to `PAYMENT_MODE: "razorpay",`
8. Save and re-upload.
9. **Honest warning:** a key-only checkout takes money but does not verify the
   payment on a server. For a 500-box drop that is usually fine — you reconcile
   in the Razorpay dashboard. If you scale up, get someone to add a free
   serverless verification function.

Until you do step 5, the Razorpay button is harmless: it shows a pop-up telling
you it is not switched on yet. It cannot charge anyone by accident.

---

## PART 5 — Make signups actually reach you (DO THIS BEFORE YOU POST THE LINK)

Pick **one** option. Option A is recommended.

### Option A — Google Form (free, unlimited, lands in a spreadsheet) — 10 min

1. Go to **forms.google.com** and click the **+** to make a blank form.
2. Add **10** questions. Make every one "Short answer". Name them exactly:
   `List`, `Name`, `Phone`, `Email`, `City`, `Area`, `Pack`, `Variant`,
   `Amount`, `PaymentRef`
   (`List` is the important one — it says whether a row came from the waitlist
   or from a pre-order, so one sheet holds both.)
3. Click the **three dots (⋮)** at the top right of the form.
4. Click **Get pre-filled link**.
5. A copy of your form opens. In each box, type the same word as the question:
   type `Name` in the Name box, `Phone` in the Phone box, and so on for all 10.
6. Scroll down and click **Get link**, then **COPY LINK**.
7. Paste that link into a notes app. It will look like a long mess containing
   `entry.123456789=Name&entry.987654321=Phone` and so on.
8. Open `index.html`. Find the block that says `GOOGLE_FIELDS`.
9. For each line, copy the matching `entry.` number out of your pasted link:
   ```
   name:    "entry.123456789",
   phone:   "entry.987654321",
   ```
   ...and so on for list, email, city, area, pack, variant, amount, payref.
10. Now the form address. Look at the very start of your pasted link:
    `https://docs.google.com/forms/d/e/1FAIpQLS.....xyz/viewform?usp=pp_url&...`
11. Copy the part from `https://` up to and including the long code after
    `/d/e/`, then add `/formResponse` at the end. So it becomes:
    `https://docs.google.com/forms/d/e/1FAIpQLS.....xyz/formResponse`
12. Paste that into the `GOOGLE_FORM_URL:` line in `index.html`.
13. Change `FORM_SERVICE: "none",` to `FORM_SERVICE: "google",`
14. Save. Re-upload to Netlify.
15. Open your live site, fill the form in with fake details, and submit.
16. Go back to forms.google.com, open your form, click the **Responses** tab.
    Your fake signup should be there. If it is, you are done.
17. In that Responses tab, click the green spreadsheet icon to send everything
    to a Google Sheet automatically. That sheet is your order list.

Cost: **₹0**. Limit: effectively none.

### Option B — Formspree (faster, but stops at 50 signups a month) — 5 min

1. Go to **formspree.io** and sign up free.
2. Click **+ New Form**. Give it a name. Click **Create Form**.
3. It shows you an address like `https://formspree.io/f/abcdwxyz`. Copy it.
4. In `index.html`, paste it into the `FORMSPREE_URL:` line.
5. Change `FORM_SERVICE: "none",` to `FORM_SERVICE: "formspree",`
6. Save, re-upload, test with a fake signup.
7. Every signup now emails you and appears in your Formspree dashboard.

Cost: **₹0**. Limit: **50 signups per month**, then it stops accepting them.
For a 500-box drop that is a real risk. If you use this, watch the counter in
your Formspree dashboard and switch to Option A before you hit 50.

---

## PART 6 — How to see who signed up

**If you did Option A (Google Form):**
1. Go to **forms.google.com**.
2. Click your form.
3. Click the **Responses** tab at the top.
4. Click the green spreadsheet icon to open the full list as a sheet.
5. That sheet is your order list. Sort it by time — earliest signup gets the
   first box.

**If you did Option B (Formspree):**
1. Go to **formspree.io** and log in.
2. Click your form name.
3. All signups are listed there, and each one also lands in your email.

**Emergency backup (works even if the above is broken):**
Every signup is also saved inside the browser of the person who typed it.
So if *you* filled the form on your own phone to test, you can get it back:
1. Open the site.
2. Add `#signups` to the end of the web address and press enter.
   Example: `https://yourbrand-drop01.netlify.app/#signups`
3. A box pops up with everything saved on **that device**, ready to paste into
   a spreadsheet.

Be clear about what this is: it is a safety net for your own testing. It does
**not** let you see signups from other people's phones. That is what Part 5 is for.

---

## PART 7 — Domain name (and why you should wait)

### Recommendation: do NOT buy a domain yet.

Reasons:
1. Your brand name is not decided. A domain is locked for a full year the
   moment you pay. If the name changes in three weeks, that money is gone.
2. `yourbrand-drop01.netlify.app` is a completely fine link for an Instagram
   bio. Nobody scrolling Instagram is judging your domain.
3. Drop 01 is 500 boxes. You do not need a domain to sell 500 boxes.
4. Buy it the same week you lock the name and check the trademark — not before.

### Realistic prices when you are ready (September 2026, India)

| Ending | Typical first year | What it renews at | Notes |
|---|---|---|---|
| `.in` | ₹499 – ₹799 (GoDaddy/BigRock list ~₹599) | ₹800 – ₹1,000 | Most credible for an India-only brand |
| `.shop` | ₹99 – ₹399 on promo | ₹1,800 – ₹3,500 | Cheap year one, painful renewal |
| `.store` | ₹99 – ₹399 on promo | ₹2,000 – ₹3,500 | Same trap as .shop |
| `.com` | ₹800 – ₹1,500 | ₹1,200 – ₹1,600 | Best long term, worst for a ₹500 budget |

**Where to buy:** GoDaddy India, BigRock, or Hostinger. All three accept UPI.
Check the *renewal* price on the checkout page before you pay — the headline
price is almost always year one only.

**The trap to avoid:** a ₹99 `.shop` that renews at ₹3,000 is not cheap, it is
a ₹3,000 bill with a delay on it. If you only ever want one year to test the
drop, that is fine. If this becomes a real brand, a `.in` is the saner buy.

### When you do buy one, connecting it takes 5 minutes
1. In Netlify, click **Domain management**.
2. Click **Add a domain**.
3. Type the domain you bought and click **Verify**.
4. Netlify shows you 2–4 "nameservers" — lines like `dns1.p01.nsone.net`.
5. Log into wherever you bought the domain.
6. Find **Manage DNS** or **Nameservers**.
7. Choose "Custom nameservers" and paste in the ones Netlify gave you.
8. Save. Wait 1–24 hours. Your site now answers on your own domain.
9. HTTPS (the padlock) turns on by itself and is free.

---

## PART 8 — What this all costs

| Item | Cost |
|---|---|
| The website itself | ₹0 — it is one file, already built |
| Hosting on Netlify (or Cloudflare Pages, or Vercel) | ₹0 — free tier, no card needed |
| HTTPS / the padlock | ₹0 — included free |
| Fonts, images, icons | ₹0 — there are none. Everything is drawn with code. |
| Collecting signups, Option A (Google Form + Sheet) | ₹0 — unlimited, forever |
| Collecting signups, Option B (Formspree free) | ₹0 — capped at 50/month |
| Taking money by UPI | ₹0 — UPI person-to-person has no fee |
| Razorpay | ₹0 to set up. ~2% + GST **only on money you actually receive.** |
| Domain name (optional, and not yet) | ₹99 – ₹799 first year |
| **Running total, today** | **₹0** |
| **Total if you also buy a `.in` domain later** | **₹499 – ₹799** |
| **Total if you buy a `.shop`/`.store` promo instead** | **₹99 – ₹399** |

### Proof it stays under ₹500
Everything except the domain is genuinely ₹0 — not a trial, not a
"free for 14 days". Free hosting on Netlify/Cloudflare/Vercel and unlimited
free Google Form responses are permanent free tiers.

So the **only** thing that can ever cost money is the domain.
- Buy nothing now → **₹0**, comfortably under ₹500.
- Buy a `.shop` or `.store` on promo → **₹99–₹399**, under ₹500.
- Buy a `.in` at the common ₹599 list price → **₹599, which breaks the ₹500 cap.**

So: if the ₹500 ceiling is hard, either wait (recommended), or take a
`.shop`/`.store` promo, or wait for a `.in` promo under ₹500 — they appear
regularly. Do not let anyone sell you hosting. You do not need hosting.

---

## PART 9 — Quick troubleshooting

**"I changed something and the page went blank."**
You deleted a quote mark or a comma. Press Ctrl+Z / Cmd+Z until it comes back,
then save. Always change only the words *inside* the quote marks.

**"The site looks fine on my laptop but weird on my phone."**
Force-refresh: on the phone, close the tab completely and open the link again.
Old versions get cached for a few minutes.

**"I submitted the form and nothing arrived."**
You have not finished Part 5 yet, or you did but the `entry.` numbers are
wrong. Do Part 5 step 15 again and watch the Responses tab.

**"I want to test without messing up my real list."**
Set `FORM_SERVICE: "none",` while testing. Signups then only save on your own
device and you can read them with the `#signups` trick in Part 6.

**"The pre-order form has vanished."**
That is the drop being closed, sold out, or not open yet — it is supposed to
do that. Check the `DROP` block: the dates, `UNITS_CLAIMED`, and especially
`FORCE_STATE`. If `FORCE_STATE` says `"closed"` or `"soldout"`, put it back to
`"auto"`.

**"The counter is not moving."**
It never moves on its own. You move it. See Part 3C.

**"The website and the office dashboard show different numbers."**
You changed `index.html` but not `state.json`, or the other way round. The
website always follows `index.html`. See Part 3E.

**"Someone outside Pune says they cannot order."**
Correct, and deliberate. Matches are UN 1944 Class 4.1 flammable solids and no
courier will carry them, so Drop 01 is hand-delivered in Pune only. The site
sends those visitors to the waitlist instead. Do not override this by taking
an order over DM — you will not be able to ship it.

**"Can I delete the sparkles / flame?"**
Yes, but that is code, not settings. Ask your builder agent instead of editing
it yourself — it is the one bit that is easy to break and hard to undo.
