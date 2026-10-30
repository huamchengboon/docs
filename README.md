# Documents

Build guides, runbooks and troubleshooting notes, published at
**https://huamchengboon.github.io/docs/**.

The site is built with [MkDocs](https://www.mkdocs.org/) and
[Material for MkDocs](https://squidfunk.github.io/mkdocs-material/). The theme setup
(palette, navigation tweaks and page titles) is adapted from the
[uv documentation](https://github.com/astral-sh/uv) under the Apache-2.0 licence.

## Layout

```
mkdocs.yml                 site settings and the navigation tree
docs/
  index.md                 home page (guide cards)
  stylesheets/extra.css    uv-style theme, plus a few additions at the end
  .overrides/main.html     page title template
  <topic>/index.md         one folder per topic, with a short landing page
  <topic>/<guide>/         one folder per guide; images and downloads live beside its pages
```

Current guides:

| Topic | Guide | Folder |
| --- | --- | --- |
| Windows Server | Offline WSUS runbook | `docs/windows-server/offline-wsus/` |
| Ignition | Windows SSO for Ignition Perspective | `docs/ignition/windows-sso/` |
| Ignition | TimescaleDB with Ignition | `docs/ignition/timescaledb/` |

## Work on it locally

Requires [uv](https://docs.astral.sh/uv/).

```
uv run mkdocs serve        # live preview at http://127.0.0.1:8000/docs/
uv run mkdocs build --strict
```

## Add a guide

1. Create `docs/<topic>/<guide>/index.md`. Split long guides into several pages in the same folder.
2. Put its images in an `img/` folder next to the pages.
3. Add the pages to `nav:` in `mkdocs.yml`, and a card on `docs/index.md`.
4. Check that `uv run mkdocs build --strict` finishes with no warnings.

Pushing to `main` publishes the site through `.github/workflows/docs.yml`.

## Before publishing a guide

This repository is public. Replace real host names, IP addresses, domain names, user
names, certificate thumbprints and any secrets with placeholders, in screenshots too.
