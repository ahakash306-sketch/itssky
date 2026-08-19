# Hosting on GitHub Pages

GitHub Pages serves files — it cannot run code. That is why edits made in the
Studio only appear on your own machine: there is no server to save them to.

The site is built to handle this. Publishing on Pages is a two-step move.

## Publishing an edit

1. Open `/admin.html`, make your changes.
2. Press **Publish — get content.json**. The file downloads.
3. In your repo on GitHub, drag `content.json` into the same folder as
   `index.html`, replacing the existing file, and commit.
4. Pages rebuilds in about a minute. The change is live for everyone.

That is the whole loop. `content.json` holds every piece of copy, every media
path and the case-study list.

## Uploading images and video on Pages

The Upload buttons cannot write into your repo either. On Pages:

1. Add the file to the `uploads/` folder in your repo and commit it.
2. In the Studio, type the path into the field — `uploads/your-file.jpg`.

If you press Upload instead, the file is embedded in your draft for preview
only; it will bloat `content.json` and should not be committed.

## The one-step alternative

If you would rather press Publish and be done, host on your GoDaddy plan
instead. It runs PHP, so the `api/` folder in this bundle does the saving —
edits go live instantly, and Upload writes real files into `uploads/`.

Both are already supported by the same code: the Studio detects which kind of
hosting it is on and changes the Publish button to match. You can move from
Pages to GoDaddy later without changing anything.

## First-time setup on Pages

Commit a starting `content.json` so the site has something to read:

    {}

An empty object is valid — the site falls back to the copy built into the
page. After your first Publish it will contain your edits.

## A warning worth reading

On Pages, `/admin.html` is public. Anyone who finds the URL can open the
Studio. They cannot change your live site (that needs a commit to your repo),
but they can see the panel. If that bothers you, either rename the file to
something unguessable, or move to hosting where it can be password-protected.
