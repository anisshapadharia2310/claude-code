// ── THE ONE PLACE TO CHANGE THINGS ──────────────────────────────────
export const CONFIG = {
  COMPANY:   "KAADEPETIS",        // change this one line, it updates everywhere
  DROP_NAME: "DROP 01",
  DROP_SUB:  "500 BOXES · PUNE",
  DROP_DATE: "2026-10-12",        // provisional target, not locked
  FOUNDER:   "Founder",
  CITY:      "PUNE",
  EVENING_FROM_HOUR: 19,

  // Where the live team data comes from. Leave null to use the
  // state.json sitting next to this file.
  STATE_URL: null,

  // The sales pipeline, updated by the Sales & PR desk.
  PIPELINE: {
    waitlist: 0, waitlistTarget: 200,
    preorders: 0, dropSize: 500,
    cafesPitched: 0, cafesBought: 0,
    creatorsSent: 0,
  },

  // Simple gate. SHA-256 of the password + salt. Keeps strangers out;
  // it is NOT bank-grade security — anyone with the link and some
  // patience could read past it. See DEPLOY.md for the real lock.
  PASS_HASH: "d4960362a46c6ef12833cf6c48a75ed54756a87bbe624f30573ef1f2d1acb966",
  PASS_SALT: "matchbox-hq-2026",
};
