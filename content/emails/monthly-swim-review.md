# Monthly swim review

**Audience:** All Sidekick users  
**From:** Sidekick `<admin@sidekickswim.com>`  
**Subject:** Your {{MONTH}} Swim Review  
**Cadence:** Automatic Vercel Cron on the 1st of each month (previous month), or manual send from Admin → Emails → Monthly review

Team check-ins and miles are calculated from Supabase (`workout_log` + `workout`) for the selected month.

---

Hi {{firstName}},

In {{MONTH}} your team logged **{{TEAM_CHECK_INS}} check-ins** and swam **{{TEAM_MILES}} miles**.

Recipients with check-ins also see their personal totals and an **Open Sidekick** button. Members with no check-ins get a nudge to start logging.

Questions or feedback? Reply to this email or write us at [admin@sidekickswim.com](mailto:admin@sidekickswim.com).

See you at the pool,  
Sidekick swim  
[sidekickswim.com](https://sidekickswim.com)
