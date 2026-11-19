# ilovemyparents.app

The public website of the I Love My Parents app: home page, blog, privacy policy.

## How it is published

Every change on `main` is built and published by GitHub Actions
(`.github/workflows/deploy.yml`) in a minute or two. A change is either an
article saved in the admin panel or a push from a computer. If a build fails
(for example a required field of an article is empty), the site stays as it
was and GitHub emails the owner.

## Admin panel

https://ilovemyparents.app/admin/ — sign in with "Sign In Using Access Token":
a GitHub fine-grained token that has access to this repository only, with the
permission **Contents: Read and write**.

- **Статті**: add and edit blog articles (text, questions, SEO fields).
- **Налаштування**: App Store and Google Play links, Google Analytics id, author.

## What is where

| Folder | What |
| --- | --- |
| `content/articles/` | one `.md` file per article; the file name is the article's address |
| `content/settings.json` | store links (empty: buttons lead to `/get/`), analytics id, author |
| `content/privacy.json` | privacy policy, exported from the app's own text |
| `content/includes/` | ready-made HTML pieces an article pulls in with `{{include file="name"}}` |
| `templates/` | the design: header, footer, cards, home page, special blocks |
| `static/` | files served as they are: pictures, social images, PDF, `/admin` |
| `build.mjs` | builds everything into `_site/` |

## Writing an article

Ordinary Markdown, plus:

- a checklist: lines starting with `- [ ] `
- a note in a green box: a line starting with `> `
- the app block, on a line of its own:
  `{{app screen="parent-home" alt="…" label="In the app" title="…" text="…"}}`
  (screens: `parent-home`, `family-today`, `are-you-ok`, `pill-reminder`,
  `family-pills`, `urgent-help`)
- a download card:
  `{{download file="/downloads/x.pdf" label="Free download" title="…" text="…" button="…"}}`

Inside these lines write a double quote as `&quot;`.

## Building on a computer

```
npm ci
npm run build
```
