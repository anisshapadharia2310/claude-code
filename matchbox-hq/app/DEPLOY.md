# Putting the office online — 3 minutes, ₹0

You need to do this bit yourself. I could not do it from here: this machine's
network blocks netlify.com and vercel.com completely, so I cannot reach them
even with a password. Everything else is built and tested.

## The fastest way (Netlify Drop — no account needed to start)

1. On a laptop, open **https://app.netlify.com/drop**
2. Drag the whole **`app`** folder onto the dotted box.
3. Wait about 20 seconds. You get a link like `random-name-123.netlify.app`.
4. **Sign in with Google** when it offers — otherwise the link disappears in a day.
5. Site configuration → Change site name → make it something you'll remember.

Done. That link is your office. It works on your iPad and phone.

## The password

The office asks for a password before it opens:

    pune-drop01

Change it: run `node ../set-password.js "your new password"` and re-deploy.

**Be honest with yourself about this lock.** It stops anyone who stumbles on
the link. It is *not* bank-grade — someone determined who has the link could
read past it. Nothing secret lives on this site (no bank details, no customer
data), so that is an acceptable trade. If you want a real lock later, see below.

## A real lock, still free (worth doing before you add customer data)

Cloudflare Pages + Cloudflare Access (free up to 50 people):
1. Put the `app` folder on Cloudflare Pages instead of Netlify.
2. Zero Trust → Access → Add an application → your site.
3. Policy: "Emails = your email". You get a one-time code by email to enter.
That is real authentication. Nobody without your inbox gets in.

## Keeping it up to date

The office reads `state.json`, which sits next to it. Whenever the team does
something new:

    node sync.js          # rebuilds app/state.json and app/simple.html

Then either drag the folder onto Netlify again, or — better — connect the
folder to a GitHub repo once, and run:

    node sync.js --push   # commits and pushes; your host redeploys itself

After that first setup, agent updates reach the live site on their own.

## What's at which address

| Address   | What it is                                        |
|-----------|---------------------------------------------------|
| `/`       | The 3D office (falls back to 2D automatically)    |
| `/?mode=2d` | Forces the 2D office — useful on an old device  |
| `/simple` | The plain dashboard. No graphics. Always works.   |

## If the office ever looks wrong

Add `?mode=2d` to the end of the address. That is the plain-canvas office —
no 3D, no graphics card needed. It has the same room, the same people and the
same panels.
