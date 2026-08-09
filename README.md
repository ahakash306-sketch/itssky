# Publishing your portfolio on GoDaddy

Everything is static HTML plus five small PHP files. No database, no build
step. Budget about 40 minutes for the first run.

---

## What's in this folder

    index.html            the portfolio
    admin.html            the control panel
    cms.js                shared content + analytics layer
    support.js            rendering runtime
    image-slot.js         image placeholder component
    .htaccess             Apache rules (clean URLs, caching, security)
    api/                  the five PHP endpoints
    api/hash.php          one-time password tool — DELETE after step 5
    uploads/              every image and video the site uses
    uploads/.htaccess     stops uploaded files ever executing
    assets/               icons
    _ds/                  design tokens and styles

Nothing here is unused — every file is referenced by the site.

---

## Step 1 — Point your domain at the hosting

If you bought the domain and hosting together at GoDaddy, this is already
done; skip to step 2.

Otherwise: GoDaddy dashboard → **My Products** → your hosting → **Manage**.
Find the nameservers or the site's IP address, then go to your domain's DNS
settings and point the A record at that IP. Allow up to a few hours.

Confirm before continuing: `http://yourdomain.com` should show GoDaddy's
placeholder page.

---

## Step 2 — Turn on HTTPS first

Do this **before** you ever type your admin password.

cPanel → **SSL/TLS Status** → tick your domain → **Run AutoSSL**.
Wait for the green padlock, then confirm `https://yourdomain.com` loads.

In cPanel → **Domains**, switch **Force HTTPS Redirect** on.

---

## Step 3 — Create the data folder

This lives *outside* the public web folder so nobody can download it.

cPanel → **File Manager**. You'll start in `/home/yourusername/`.
Click **+ Folder** and create: `portfolio-data`

Note the full path shown at the top — something like
`/home/a1b2c3d4/portfolio-data`. You'll need it in step 5.

---

## Step 4 — Upload the site

1. Zip this whole folder on your computer (select the *contents*, not the
   folder itself).
2. File Manager → open `public_html` → delete any GoDaddy placeholder files
   already in there.
3. Click **Upload**, choose your zip, wait for it to finish.
4. Back in File Manager, right-click the zip → **Extract**.
5. Delete the zip afterwards.

You should now see `index.html`, `admin.html`, `api`, `uploads` and the rest
directly inside `public_html`.

**Load `https://yourdomain.com` right now.** The portfolio should appear.

> If you get a **500 error**: rename `.htaccess` to `.htaccess.off` and
> reload. The site will come straight back. That file only adds clean URLs
> and caching — the site works fine without it.

---

## Step 5 — Set your admin password

1. Visit `https://yourdomain.com/api/hash.php?p=YourPasswordHere`
2. Copy the long `$2y$...` line it prints.
3. File Manager → `api/config.php` → **Edit**.
   * Paste the hash between the quotes on the `ADMIN_HASH` line.
   * Set `DATA_DIR` to the path from step 3:

         define('DATA_DIR', '/home/a1b2c3d4/portfolio-data');

   * Save.
4. **Delete `api/hash.php` from the server.** Non-negotiable — while it is
   there, anyone can generate a hash.

---

## Step 6 — Set folder permissions

In File Manager, right-click each of these → **Change Permissions** → `755`:

* `portfolio-data` (one level above public_html)
* `public_html/uploads`

If publishing later fails with `write_failed`, come back and try `775`.

---

## Step 7 — First publish

1. Go to `https://yourdomain.com/admin`
2. Log in with the password from step 5.
3. Click **Publish changes** once.

That writes `content.json` into your data folder. From this moment the
public site reads its content from that file, and the panel is genuinely
connected to your domain.

Open the site in a private window to confirm it still looks right.

---

## Using it day to day

**Editing text** — Admin → *Home page* or *Work* → edit any field. Changes
preview instantly in your browser. Click **Publish changes** to make them
live for everyone. The button turns blue whenever you have unpublished work.

**Adding images or video** — every media field has an **Upload** button.
Pick a file; it goes into `uploads/` and fills in the path for you. Videos
autoplay muted on loop. Publish when you're happy.

**Adding a case study** — Admin → *Work* → **+ Add case study**, pick a
layout (Long-form, MVP, or Product), then fill in the sections. It appears
under whichever tab you choose.

**Analytics** — the *Analytics* page shows real visitors across all devices:
visits, which case studies get opened, time per page, scroll depth and
contact clicks. No cookies; visitors are counted by a hash that changes
daily, so nothing personal is stored.

---

## Backups

Every publish snapshots the previous version into
`portfolio-data/backups/` — the last 20 are kept.

To roll back: File Manager → open `backups` → rename the version you want to
`content.json` and move it up one level, replacing the current file.

Worth doing occasionally: download the whole `portfolio-data` folder, or hit
**Export JSON** in the panel and keep the file somewhere safe.

---

## If something breaks

**Whole site shows 500** — it's `.htaccess`. Rename it `.htaccess.off`.

**Login says "server unavailable"** — PHP isn't running. cPanel →
**MultiPHP Manager** → set your domain to PHP 8.1 or newer.

**"not_authorised" when publishing** — the session timed out. Reload the
admin page and log in again.

**Publish says "write_failed"** — `DATA_DIR` in `config.php` is wrong, or the
folder isn't writable. Recheck steps 3 and 6.

**Images show as broken** — filenames are case-sensitive on the server but
not on a Mac. `Photo.JPG` and `photo.jpg` are different files there.

**Analytics stay at zero** — visit `https://yourdomain.com/api/track.php`
directly. Anything other than a JSON response means PHP or the data folder
needs attention.

---

## A note on security

The panel is protected by one password. That is reasonable for a personal
portfolio, but if you want a second lock: cPanel → **Directory Privacy** →
`public_html` → and password-protect `admin.html` at the server level too.

Never leave `hash.php` on the live server.
# itssky
