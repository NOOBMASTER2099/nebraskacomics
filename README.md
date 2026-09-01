# Nebraska Comics website

New static site for [nebraskacomics.com](https://www.nebraskacomics.com).

Repo: https://github.com/NOOBMASTER2099/nebraskacomics

## Connect this to Porkbun

You have two good options. Static Hosting + GitHub Connect is the one that stays "on your Porkbun profile."

### Option A — Porkbun Static Hosting (recommended for your account)

1. Log in at porkbun.com → Domain Management → nebraskacomics.com.
2. Click the house / Website icon.
3. If Link in Bio or another plan is already attached, cancel that plan first (Porkbun only allows one hosting product per domain).
4. Select **Static Hosting** and start the plan (they give a 15-day trial).
5. On the Static Hosting page, scroll to **GitHub Connect** → Connect.
6. Authorize GitHub and choose this repository: `NOOBMASTER2099/nebraskacomics`.
7. Pick branch `main`. Porkbun will publish `index.html` to the domain.

Guide: https://kb.porkbun.com/article/145-how-to-connect-static-hosting-to-github

### Option B — Free GitHub Pages + Porkbun DNS

1. In this repo: Settings → Pages → Deploy from branch `main` / root.
2. Custom domain: `www.nebraskacomics.com` (CNAME file is already in the repo).
3. Back in Porkbun Domain Management → Details → DNS Records → **Quick DNS Config** → GitHub.
4. Use username `NOOBMASTER2099` so the CNAME is `NOOBMASTER2099.github.io`.

Guide: https://kb.porkbun.com/article/64-how-to-connect-your-domain-to-github-pages

## Edit the site

Change `index.html` in this repo and push. Porkbun Static Hosting or GitHub Pages will pick it up.

Update phone, hours, and social URLs in that file whenever they change.
