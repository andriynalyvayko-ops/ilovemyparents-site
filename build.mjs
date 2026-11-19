// Builds the website into _site/.
//
//   npm run build
//
// What makes the site:
//   content/articles/*.md   one file per article (text + fields); edited in /admin
//   content/settings.json   store links, analytics id, author; edited in /admin
//   content/privacy.json    privacy policy, exported from the app's own text
//   content/includes/       ready-made HTML pieces an article can pull in
//   templates/              the design: header, footer, cards, home page
//   static/                 files served as they are (pictures, PDF, /admin)
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Marked } from 'marked';
import YAML from 'yaml';

const root = dirname(fileURLToPath(import.meta.url));
const out = join(root, '_site');
const DOMAIN = 'ilovemyparents.app';
const ORIGIN = `https://${DOMAIN}`;
const SUPPORT = `support@${DOMAIN}`;
const TOPICS = ['Staying in touch', 'Safety at home', 'Medication', 'Using the app'];
const SCREENS = ['parent-home', 'family-today', 'are-you-ok', 'pill-reminder', 'family-pills', 'urgent-help'];

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const read = (...path) => readFileSync(join(root, ...path), 'utf8');
const template = (name) => read('templates', `${name}.html`).trim();
const settings = JSON.parse(read('content', 'settings.json'));
const privacy = JSON.parse(read('content', 'privacy.json'));
const GA_ID = process.env.GA_ID ?? settings.gaId ?? '';

const esc = (text) =>
  String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const plain = (html) =>
  html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/\s+/g, ' ')
    .trim();
const slugify = (text) =>
  text
    .toLowerCase()
    .replace(/['’"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
const fill = (html, values) =>
  html.replace(/\{\{(\w+)\}\}/g, (whole, key) => (key in values ? values[key] : whole));
const longDate = (iso) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

// Pictures the home page design refers to by their canvas ids.
const canvasPictures = {
  '902f999055c296b7339e1500e27942e2': { file: 'hero.webp', w: 780, h: 1120, eager: true },
  c3df3df66169ee39c4e9beb4e2a254b7: { file: 'parent-home.webp', w: 540, h: 1080 },
  '5c1a22aebdbf0a22c4184cbcee85be1b': { file: 'family-today.webp', w: 540, h: 1080 },
  '13af1d97662ad75f348119014be40f69': { file: 'are-you-ok.webp', w: 540, h: 1080 },
  '850e5daab46645951efe7cccab4b878f': { file: 'pill-reminder.webp', w: 540, h: 1080 },
  '8b81400d4697cb05068135989acdd46d': { file: 'family-pills.webp', w: 540, h: 1080 },
  a2eb8a607e6c9f2fec3a36a331a3c89d: { file: 'urgent-help.webp', w: 540, h: 1080 },
};

// ---------------------------------------------------------------- analytics
// Visitors in Europe (the UK and the EU ask for consent before analytics
// cookies) see a small banner and nothing is loaded until they agree;
// elsewhere analytics starts at once. Europe is told by the device's time
// zone. "Cookie choice" in the footer asks again, wherever the visitor is.
const analytics = GA_ID
  ? `<style>
#consent { position: fixed; left: 12px; right: 12px; bottom: 12px; z-index: 10; max-width: 560px; margin: 0 auto; background: #FFFFFF; color: #1B2421; border: 1px solid #DCE1DE; border-radius: 16px; padding: 16px 18px; box-shadow: 0 8px 28px rgba(0, 0, 0, 0.18); font: 15px/1.5 'Plus Jakarta Sans', system-ui, sans-serif; }
#consent p { margin: 0 0 12px; }
#consent div { display: flex; gap: 10px; flex-wrap: wrap; }
#consent button { font: inherit; font-weight: 800; border-radius: 999px; padding: 10px 20px; min-height: 44px; cursor: pointer; border: 1px solid #0F6E5C; background: transparent; color: #0F6E5C; }
#consent button[data-yes] { background: #0F6E5C; color: #FFFFFF; }
</style>
<script>
(function () {
  var ID = '${GA_ID}', KEY = 'analytics-consent';
  var zone = '';
  try { zone = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) {}
  var asks = /^(Europe\\/|Atlantic\\/(Canary|Madeira|Azores|Reykjavik|Faroe)|Arctic\\/)/.test(zone) || zone === '';
  var choice = null;
  try { choice = localStorage.getItem(KEY); } catch (e) {}
  function start() {
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { dataLayer.push(arguments); };
    gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'granted' });
    gtag('js', new Date());
    gtag('config', ID);
  }
  document.addEventListener('DOMContentLoaded', function () {
    var again = document.getElementById('cookie-choice');
    if (again) again.addEventListener('click', function (e) {
      e.preventDefault();
      try { localStorage.setItem(KEY, 'ask'); } catch (err) {}
      location.reload();
    });
  });
  if (choice === 'yes' || (!asks && choice !== 'no' && choice !== 'ask')) return start();
  if (choice === 'no') return;
  document.addEventListener('DOMContentLoaded', function () {
    var box = document.createElement('div');
    box.id = 'consent';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', 'Cookies');
    box.innerHTML = '<p>We would like to count visits to this site with Google Analytics, which uses cookies. No advertising. <a href="/privacy/">Privacy policy</a></p><div><button data-yes>OK</button><button data-no>No, thanks</button></div>';
    box.addEventListener('click', function (e) {
      var yes = e.target.hasAttribute('data-yes'), no = e.target.hasAttribute('data-no');
      if (!yes && !no) return;
      try { localStorage.setItem(KEY, yes ? 'yes' : 'no'); } catch (err) {}
      box.remove();
      if (yes) start();
    });
    document.body.appendChild(box);
  });
})();
</script>`
  : '';

const fonts = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
body{margin:0;background:#0B3B32}
a{color:#0F6E5C}a:hover{color:#0B5446}
summary{list-style:none;cursor:pointer}
summary::-webkit-details-marker{display:none}
details[open] summary svg{transform:rotate(45deg)}
html { -webkit-text-size-adjust: 100%; scroll-behavior: smooth; }
img { max-width: 100%; height: auto; }
:target { scroll-margin-top: 16px; }
@media (max-width: 640px) {
  h1 { font-size: 36px !important; line-height: 1.12 !important; }
  h2 { font-size: 26px !important; }
}
</style>`;

// -------------------------------------------------------- design → site
const sections = { 'How it works': 'how', Plans: 'plans', Support: 'support', 'Get the app': 'get' };
const storeLink = (which) => {
  const url = which === 'apple' ? settings.appStoreUrl : settings.googlePlayUrl;
  return url ? `href="${esc(url)}" rel="noopener"` : 'href="/get/"';
};

// The templates keep the links of the design canvas; here they become the
// site's own addresses.
function localise(html, name) {
  let result = html;
  result = result.replace(
    /<a href="Main\.dc\.html"([^>]*)>(How it works|Plans|Support|Get the app)<\/a>/g,
    (_, attrs, label) => `<a href="/#${sections[label]}"${attrs}>${label}</a>`,
  );
  result = result.replaceAll('href="Main.dc.html"', 'href="/"').replaceAll('href="Blog.dc.html"', 'href="/blog/"');
  result = result.replace(/<a href="#"([^>]*)>Privacy policy<\/a>/g, '<a href="/privacy/"$1>Privacy policy</a>');
  result = result.replace(/<a href="#"([^>]*)>([\s\S]*?)<\/a>/g, (whole, attrs, inner) => {
    if (inner.includes('App Store')) return `<a ${storeLink('apple')}${attrs}>${inner}</a>`;
    if (inner.includes('Google Play')) return `<a ${storeLink('google')}${attrs}>${inner}</a>`;
    return whole;
  });
  result = result.replace(/<img src="\/_blob\/([0-9a-f]+)"/g, (_, id) => {
    const picture = canvasPictures[id];
    if (!picture) throw new Error(`${name}: no site picture for canvas picture ${id}`);
    const loading = picture.eager ? 'fetchpriority="high"' : 'loading="lazy" decoding="async"';
    return `<img src="/images/${picture.file}" width="${picture.w}" height="${picture.h}" ${loading}`;
  });
  if (GA_ID) {
    result = result.replace(
      /(<footer[\s\S]*?)(<a href="mailto:)/,
      '$1<a href="#" id="cookie-choice" style="color: #FFFFFF; font-weight: 600; padding: 8px 0">Cookie choice</a>\n$2',
    );
  }
  const left = result.match(/href="(#|[^"]*\.dc\.html)"(?! id="cookie-choice")/);
  if (left) throw new Error(`${name}: a design link is left: ${left[0]}`);
  if (result.includes('/_blob/')) throw new Error(`${name}: a canvas picture is left`);
  return result;
}

const headerOnBlog = localise(template('shell-top'), 'shell-top');
// On other pages "Blog" in the menu is not the current page.
const header = headerOnBlog
  .replace(' aria-current="page"', '')
  .replace('text-decoration: underline; text-underline-offset: 6px; font-weight: 800', 'text-decoration: none; font-weight: 600');
const footer = localise(template('shell-bottom'), 'shell-bottom');
const callToAction = localise(template('cta'), 'cta');

function page({ title, head, body }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
${fonts}
${head}
<link rel="icon" href="/favicon.png">
<link rel="apple-touch-icon" href="/logo-512.png">
<meta name="theme-color" content="#0B3B32">
${analytics}
</head>
<body>
${body}
</body>
</html>
`;
}

function write(address, html) {
  const file = address.endsWith('/') ? join(out, address, 'index.html') : join(out, address);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
}

// ------------------------------------------------------------- articles
const H2 = 'margin: 40px 0 12px; font-size: 30px; line-height: 1.2; font-weight: 800; letter-spacing: -0.01em';
const H3 = 'margin: 28px 0 10px; font-size: 23px; line-height: 1.25; font-weight: 800';
const LIST = 'margin: 0 0 22px; padding-left: 26px; display: flex; flex-direction: column; gap: 8px';
const TICK =
  '<span aria-hidden="true" style="flex: 0 0 auto; width: 20px; height: 20px; margin-top: 5px; border: 2px solid #0F6E5C; border-radius: 6px; box-sizing: border-box; background: #FFFFFF"></span>';

const markdown = new Marked({
  gfm: true,
  renderer: {
    heading({ tokens, depth }) {
      const html = this.parser.parseInline(tokens);
      if (depth <= 2) return `<h2 id="${slugify(plain(html))}" style="${H2}">${html}</h2>\n`;
      return `<h3 style="${H3}">${html}</h3>\n`;
    },
    paragraph({ tokens }) {
      return `<p style="margin: 0 0 22px">${this.parser.parseInline(tokens)}</p>\n`;
    },
    checkbox() {
      return '';
    },
    list(token) {
      const items = token.items.map((item) => this.parser.parse(item.tokens, false).trim());
      if (token.items.length && token.items.every((item) => item.task)) {
        return `<ul style="margin: 0 0 22px; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 10px">${items
          .map((html) => `<li style="display: flex; gap: 14px; align-items: flex-start">${TICK}<span>${html}</span></li>`)
          .join('')}</ul>\n`;
      }
      const tag = token.ordered ? 'ol' : 'ul';
      return `<${tag} style="${LIST}">${items.map((html) => `<li>${html}</li>`).join('')}</${tag}>\n`;
    },
    blockquote({ tokens }) {
      const text = tokens
        .filter((token) => token.type === 'paragraph')
        .map((token) => this.parser.parseInline(token.tokens))
        .join('<br><br>');
      return `<div style="margin: 30px 0; background: #E7F1EE; color: #0B3B32; border-radius: 20px; padding: 22px 28px; font-size: 17px; line-height: 1.6">${text}</div>\n`;
    },
    link({ href, tokens }) {
      const outside = /^https?:\/\//.test(href) && !href.startsWith(ORIGIN);
      return `<a href="${esc(href)}"${outside ? ' target="_blank" rel="noopener"' : ''}>${this.parser.parseInline(tokens)}</a>`;
    },
    image({ href, text }) {
      return `<img src="${esc(href)}" alt="${esc(text)}" loading="lazy" decoding="async" style="display: block; border-radius: 18px; margin: 0 0 22px">`;
    },
    hr() {
      return '';
    },
    table(token) {
      const cell = (tokens) => this.parser.parseInline(tokens);
      const head = token.header
        .map((h) => `<th scope="col" style="padding: 10px 8px; font-size: 14px; font-weight: 800; color: #0B3B32; text-align: left; border-bottom: 2px solid #0B3B32">${cell(h.tokens)}</th>`)
        .join('');
      const rows = token.rows
        .map((row) => `<tr>${row.map((c) => `<td style="padding: 12px 8px; border-bottom: 1px solid #DCE1DE; vertical-align: top">${cell(c.tokens)}</td>`).join('')}</tr>`)
        .join('');
      return `<div style="margin: 0 0 30px; background: #FFFFFF; border: 1px solid #DCE1DE; border-radius: 22px; padding: 22px 24px; overflow-x: auto"><table style="width: 100%; border-collapse: collapse; font-size: 16px"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>\n`;
    },
  },
});

const appBlock = localise(template('app-block'), 'app-block');
const downloadBlock = template('download-block');

// Special blocks are written in an article on a line of their own:
//   {{app screen="parent-home" alt="…" label="In the app" title="…" text="…"}}
//   {{download file="/downloads/x.pdf" label="…" title="…" text="…" button="…"}}
//   {{include file="name"}}            (content/includes/name.html)
function specialBlock(name, values, article) {
  if (name === 'app') {
    if (!SCREENS.includes(values.screen)) {
      throw new Error(`${article}: the app block names the screen "${values.screen}"; choose one of: ${SCREENS.join(', ')}`);
    }
    return fill(appBlock, { label: 'In the app', alt: '', text: '', ...values });
  }
  if (name === 'download') return fill(downloadBlock, { label: 'Free download', button: 'Download', text: '', ...values });
  if (name === 'include') {
    const file = join(root, 'content', 'includes', `${values.file}.html`);
    if (!existsSync(file)) throw new Error(`${article}: there is no content/includes/${values.file}.html`);
    return readFileSync(file, 'utf8').trim();
  }
  throw new Error(`${article}: unknown block {{${name}}}`);
}

function renderBody(text, article) {
  const blocks = [];
  const source = text.replace(/^\{\{(\w+)((?:\s+\w+="[^"]*")*)\s*\}\}[ \t]*$/gm, (_, name, rest) => {
    const values = {};
    for (const found of rest.matchAll(/(\w+)="([^"]*)"/g)) values[found[1]] = found[2];
    blocks.push(specialBlock(name, values, article));
    return `\n<!--block:${blocks.length - 1}-->\n`;
  });
  const html = markdown.parse(source);
  const broken = html.match(/\{\{[^}]{0,80}/);
  if (broken) throw new Error(`${article}: a special block is not written correctly: ${broken[0]}…`);
  return html.replace(/<!--block:(\d+)-->/g, (_, index) => blocks[Number(index)]);
}

const articles = readdirSync(join(root, 'content', 'articles'))
  .filter((file) => file.endsWith('.md'))
  .map((file) => {
    const raw = read('content', 'articles', file).replace(/\r\n/g, '\n');
    const parts = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    if (!parts) throw new Error(`${file}: the fields block between --- lines is missing`);
    const fields = YAML.parse(parts[1]) ?? {};
    const slug = file.replace(/\.md$/, '');
    for (const needed of ['title', 'description', 'topic', 'date']) {
      if (!fields[needed]) throw new Error(`${file}: the field "${needed}" is empty`);
    }
    if (!/^[a-z0-9-]+$/.test(slug)) throw new Error(`${file}: the address may hold only small letters, digits and hyphens`);
    const date = String(fields.date).slice(0, 10);
    const faq = (fields.faq ?? []).filter((item) => item && item.question && item.answer);
    const body = renderBody(parts[2], file);
    const words = plain(`${fields.title} ${fields.lead ?? ''} ${body} ${faq.map((item) => `${item.question} ${item.answer}`).join(' ')}`).split(' ').length;
    return {
      ...fields,
      slug,
      url: `/blog/${slug}/`,
      date,
      updated: String(fields.updated || date).slice(0, 10),
      faq,
      body,
      words,
      minutes: fields.read_minutes || Math.max(1, Math.round(words / 230)),
      cardTitle: fields.card_title || fields.title,
      cardSummary: fields.card_summary || fields.description,
      image: fields.og_image || '/og/blog.png',
      order: fields.order ?? 999,
    };
  })
  .filter((article) => !article.draft)
  .sort((a, b) => a.order - b.order || b.date.localeCompare(a.date) || a.title.localeCompare(b.title));

const cardValues = (article) => ({
  url: article.url,
  title: esc(article.cardTitle),
  topic: esc(article.topic),
  summary: esc(article.cardSummary),
  date: article.date,
  date_text: longDate(article.date),
  minutes: article.minutes,
});
const smallCards = (list) => list.map((article) => fill(template('card-small'), cardValues(article))).join('\n');

const organization = {
  '@type': 'Organization',
  '@id': `${ORIGIN}/#organization`,
  name: 'I Love My Parents',
  url: `${ORIGIN}/`,
  logo: { '@type': 'ImageObject', url: `${ORIGIN}/logo-512.png`, width: 512, height: 512 },
};
const jsonLd = (graph) =>
  `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }, null, 1)}</script>`;

for (const article of articles) {
  const address = `${ORIGIN}${article.url}`;
  const published = `${article.date}T09:00:00+00:00`;
  const modified = `${article.updated}T09:00:00+00:00`;
  const image = `${ORIGIN}${article.image}`;
  const answers = article.faq.map((item) => ({ question: item.question, answer: markdown.parseInline(item.answer) }));
  const graph = [
    {
      '@type': 'BlogPosting',
      '@id': `${address}#article`,
      headline: article.title,
      description: article.description,
      image: { '@type': 'ImageObject', url: image, width: 1200, height: 630 },
      datePublished: published,
      dateModified: modified,
      author: {
        '@type': 'Person',
        '@id': `${ORIGIN}/#andrii-nalyvaiko`,
        name: settings.authorName,
        jobTitle: 'Founder',
        description: settings.authorBio,
        worksFor: { '@id': `${ORIGIN}/#organization` },
      },
      publisher: organization,
      mainEntityOfPage: { '@type': 'WebPage', '@id': address },
      isPartOf: { '@type': 'Blog', '@id': `${ORIGIN}/blog/#blog`, name: 'I Love My Parents blog' },
      articleSection: article.topic,
      ...(article.keywords ? { keywords: article.keywords } : {}),
      wordCount: article.words,
      inLanguage: 'en-US',
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${ORIGIN}/` },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: `${ORIGIN}/blog/` },
        { '@type': 'ListItem', position: 3, name: article.title, item: address },
      ],
    },
  ];
  if (answers.length) {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${address}#faq`,
      mainEntity: answers.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: { '@type': 'Answer', text: plain(item.answer) },
      })),
    });
  }
  const questions = answers.length
    ? `<section aria-labelledby="faq" style="margin: 48px 0 8px"><h2 id="faq" style="${H2}; margin-top: 0">Questions people ask</h2><div style="display: flex; flex-direction: column; gap: 14px; margin-top: 18px">${answers
        .map(
          (item) =>
            `<div style="background: #FFFFFF; border: 1px solid #DCE1DE; border-radius: 22px; padding: 24px 28px"><h3 style="margin: 0 0 8px; font-size: 20px; line-height: 1.3; font-weight: 800">${esc(item.question)}</h3><p style="margin: 0; font-size: 17px; line-height: 1.65">${item.answer}</p></div>`,
        )
        .join('')}</div></section>`
    : '';
  const others = articles.filter((other) => other.slug !== article.slug).slice(0, 3);
  write(
    article.url,
    page({
      title: esc(article.seo_title || article.title),
      head: `<meta name="description" content="${esc(article.description)}">
<link rel="canonical" href="${address}">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<meta name="author" content="${esc(settings.authorName)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="I Love My Parents">
<meta property="og:locale" content="en_US">
<meta property="og:title" content="${esc(article.title)}">
<meta property="og:description" content="${esc(article.description)}">
<meta property="og:url" content="${address}">
<meta property="og:image" content="${image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(article.title)}">
<meta property="article:published_time" content="${published}">
<meta property="article:modified_time" content="${modified}">
<meta property="article:author" content="${esc(settings.authorName)}">
<meta property="article:section" content="${esc(article.topic)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(article.title)}">
<meta name="twitter:description" content="${esc(article.description)}">
<meta name="twitter:image" content="${image}">
<meta name="twitter:image:alt" content="${esc(article.title)}">
${jsonLd(graph)}`,
      body: `${header}

<article>
<div style="max-width: 1120px; margin: 0 auto; padding: 32px 24px 0">
<div style="background: linear-gradient(135deg, #E7F1EE 0%, #A9D8CC 100%); color: #0B3B32; border-radius: 28px; padding: 44px 48px 48px">
<nav aria-label="Breadcrumb" style="display: flex; flex-wrap: wrap; gap: 8px; font-size: 15px; font-weight: 700; margin-bottom: 72px">
<a href="/blog/" style="color: #0B3B32; padding: 6px 0">Blog</a>
<span aria-hidden="true" style="padding: 6px 0">/</span>
<a href="/blog/" style="color: #0B3B32; padding: 6px 0">${esc(article.topic)}</a>
</nav>
<h1 style="margin: 0 0 18px; font-size: 54px; line-height: 1.08; font-weight: 800; letter-spacing: -0.02em; max-width: 900px">${esc(article.title)}</h1>
${article.lead ? `<p style="margin: 0 0 22px; font-size: 21px; line-height: 1.5; color: #14463B; max-width: 820px">${esc(article.lead)}</p>\n` : ''}<p style="margin: 0; font-size: 15px; font-weight: 600; color: #14463B">By ${esc(settings.authorName)} · <time datetime="${article.date}">${longDate(article.date)}</time> · ${article.minutes} min read</p>
</div>
</div>

<div style="max-width: 1120px; margin: 0 auto; padding: 40px 24px 0; font-size: 19px; line-height: 1.7">
${article.body}${questions}
</div>

<div style="max-width: 1120px; margin: 0 auto; padding: 24px 24px 0">
<div style="border-top: 1px solid #DCE1DE; padding-top: 26px; display: flex; flex-wrap: wrap; gap: 16px; align-items: center">
<span aria-hidden="true" style="width: 56px; height: 56px; border-radius: 28px; background: #E7F1EE; color: #0F6E5C; font-weight: 800; font-size: 20px; display: flex; align-items: center; justify-content: center">${esc(settings.authorInitials)}</span>
<div style="flex: 1 1 280px; min-width: 0">
<p style="margin: 0; font-weight: 800">${esc(settings.authorName)}</p>
<p style="margin: 0; font-size: 16px; color: #4A5752">${esc(settings.authorBio)}</p>
</div>
</div>
</div>
</article>
${
  others.length
    ? `
<section style="max-width: 1120px; margin: 0 auto; padding: 64px 24px 40px">
<h2 style="margin: 0 0 24px; font-size: 30px; line-height: 1.2; font-weight: 800; letter-spacing: -0.01em">Keep reading</h2>
<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px">
${smallCards(others)}
</div>
</section>
`
    : ''
}
${callToAction}

${footer}`,
    }),
  );
}

// ------------------------------------------------------------------- blog
const blogDescription =
  'Practical guides for families looking after older parents: staying in touch, safety at home, medication and using the I Love My Parents app.';
const featured = articles.find((article) => article.featured) ?? articles[0];
const rest = articles.filter((article) => article !== featured);
const blogIntro = localise(template('blog-intro'), 'blog-intro').replace(/<nav aria-label="Topics"[\s\S]*?<\/nav>/, (nav) =>
  nav.replace(/<a href="\/blog\/"([^>]*)>([^<]+)<\/a>/g, '<a href="/blog/" data-filter="$2"$1>$2</a>'),
);
write(
  '/blog/',
  page({
    title: 'Blog: Caring for Elderly Parents | I Love My Parents',
    head: `<meta name="description" content="${esc(blogDescription)}">
<link rel="canonical" href="${ORIGIN}/blog/">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta property="og:type" content="website">
<meta property="og:site_name" content="I Love My Parents">
<meta property="og:title" content="I Love My Parents blog">
<meta property="og:description" content="${esc(blogDescription)}">
<meta property="og:url" content="${ORIGIN}/blog/">
<meta property="og:image" content="${ORIGIN}/og/blog.png">
<meta name="twitter:card" content="summary_large_image">
${jsonLd([
  {
    '@type': 'Blog',
    '@id': `${ORIGIN}/blog/#blog`,
    name: 'I Love My Parents blog',
    url: `${ORIGIN}/blog/`,
    description: blogDescription,
    inLanguage: 'en-US',
    publisher: { '@id': `${ORIGIN}/#organization` },
    blogPost: articles.map((article) => ({
      '@type': 'BlogPosting',
      headline: article.title,
      url: `${ORIGIN}${article.url}`,
      datePublished: article.date,
    })),
  },
  {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${ORIGIN}/` },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${ORIGIN}/blog/` },
    ],
  },
])}`,
    body: `${headerOnBlog}

${blogIntro}
${
  featured
    ? `
<section style="max-width: 1120px; margin: 0 auto; padding: 12px 24px 24px">
${fill(template('card-featured'), cardValues(featured))}
</section>
`
    : ''
}
<section style="max-width: 1120px; margin: 0 auto; padding: 12px 24px 40px">
<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px">
${rest.map((article) => fill(template('card'), cardValues(article))).join('\n')}
</div>
<p id="no-articles" hidden style="margin: 8px 0 0; font-size: 19px; color: #4A5752">No articles on this topic yet.</p>
</section>

${callToAction}

${footer}
<script>
(function () {
  var chips = [].slice.call(document.querySelectorAll('[data-filter]'));
  var cards = [].slice.call(document.querySelectorAll('[data-topic]'));
  var none = document.getElementById('no-articles');
  if (chips.length < 2) return;
  var on = chips[0].getAttribute('style'), off = chips[1].getAttribute('style');
  function show(topic) {
    var shown = 0;
    cards.forEach(function (card) {
      var match = topic === 'All' || card.getAttribute('data-topic') === topic;
      card.style.display = match ? 'flex' : 'none';
      if (match) shown++;
    });
    chips.forEach(function (chip) {
      var active = chip.getAttribute('data-filter') === topic;
      chip.setAttribute('style', active ? on : off);
      if (active) chip.setAttribute('aria-current', 'true'); else chip.removeAttribute('aria-current');
    });
    none.hidden = shown > 0;
  }
  chips.forEach(function (chip) {
    chip.addEventListener('click', function (e) { e.preventDefault(); show(chip.getAttribute('data-filter')); });
  });
})();
</script>`,
  }),
);

// ------------------------------------------------------------------- home
const homeTitle = 'I Love My Parents: Daily Check-In App for Elderly Parents';
const homeDescription =
  'One tap from your parents each morning and the whole family knows they are OK. Pill reminders, "Are you OK?" messages and urgent alerts.';
const home = localise(fill(template('home'), { blog_cards: smallCards(articles.slice(0, 3)) }), 'home');
const homeQuestions = [...home.matchAll(/<details[^>]*>\s*<summary[^>]*>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/g)].map((found) => ({
  '@type': 'Question',
  name: plain(found[1]),
  acceptedAnswer: { '@type': 'Answer', text: plain(found[2]) },
}));
write(
  '/',
  page({
    title: esc(homeTitle),
    head: `<meta name="description" content="${esc(homeDescription)}">
<link rel="canonical" href="${ORIGIN}/">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<meta property="og:type" content="website">
<meta property="og:site_name" content="I Love My Parents">
<meta property="og:locale" content="en_US">
<meta property="og:title" content="Know Mom and Dad are OK, every day">
<meta property="og:description" content="${esc(homeDescription)}">
<meta property="og:url" content="${ORIGIN}/">
<meta property="og:image" content="${ORIGIN}/og/home.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="I Love My Parents: know Mom and Dad are OK, every day">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Know Mom and Dad are OK, every day">
<meta name="twitter:description" content="${esc(homeDescription)}">
<meta name="twitter:image" content="${ORIGIN}/og/home.png">
${jsonLd([
  { ...organization, email: SUPPORT, founder: { '@id': `${ORIGIN}/#andrii-nalyvaiko` } },
  {
    '@type': 'Person',
    '@id': `${ORIGIN}/#andrii-nalyvaiko`,
    name: settings.authorName,
    jobTitle: 'Founder',
    worksFor: { '@id': `${ORIGIN}/#organization` },
  },
  {
    '@type': 'WebSite',
    '@id': `${ORIGIN}/#website`,
    url: `${ORIGIN}/`,
    name: 'I Love My Parents',
    inLanguage: 'en-US',
    publisher: { '@id': `${ORIGIN}/#organization` },
  },
  { '@type': 'FAQPage', '@id': `${ORIGIN}/#faq`, mainEntity: homeQuestions },
])}`,
    body: home,
  }),
);

// ------------------------------------------------------------ plain pages
const plainPage = ({ address, title, description, robots = 'index, follow', content }) =>
  write(
    address,
    page({
      title: esc(title),
      head: `<meta name="description" content="${esc(description)}">
${address.endsWith('/') ? `<link rel="canonical" href="${ORIGIN}${address}">\n` : ''}<meta name="robots" content="${robots}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="I Love My Parents">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${ORIGIN}/og/home.png">`,
      body: `${header}
<main style="max-width: 820px; margin: 0 auto; padding: 56px 24px 88px; font-size: 19px; line-height: 1.7">
${content}
</main>
${footer}`,
    }),
  );

const h1 = 'margin: 0 0 14px; font-size: 48px; line-height: 1.1; font-weight: 800; letter-spacing: -0.02em';
const h2 = 'margin: 40px 0 12px; font-size: 28px; line-height: 1.2; font-weight: 800; letter-spacing: -0.01em';
const withMail = (html) => html.replaceAll(SUPPORT, `<a href="mailto:${SUPPORT}">${SUPPORT}</a>`);

plainPage({
  address: '/privacy/',
  title: 'Privacy policy: I Love My Parents',
  description: 'What the I Love My Parents app and website store, who can see it, how long it is kept and your rights.',
  content: `<h1 style="${h1}">Privacy policy</h1>
<p style="margin: 0 0 8px; font-size: 16px; color: #4A5752">Last updated ${esc(privacy.updated)}</p>
${privacy.sections
  .map(
    (section) =>
      `<h2 style="${h2}">${esc(section.heading)}</h2>\n${section.body.map((text) => `<p style="margin: 0 0 16px">${withMail(esc(text))}</p>`).join('\n')}`,
  )
  .join('\n')}`,
});

const storeButton = (label, small, url) =>
  `<a href="${esc(url)}" rel="noopener" style="background: #0B3B32; color: #FFFFFF; text-decoration: none; padding: 13px 26px; border-radius: 16px; display: flex; flex-direction: column; line-height: 1.2"><span style="font-size: 13px; font-weight: 600; color: #DCEDE8">${small}</span><span style="font-size: 20px; font-weight: 800">${label}</span></a>`;
const inStores = [
  settings.appStoreUrl && storeButton('App Store', 'Download on the', settings.appStoreUrl),
  settings.googlePlayUrl && storeButton('Google Play', 'Get it on', settings.googlePlayUrl),
].filter(Boolean);
plainPage({
  address: '/get/',
  title: 'Get the app: I Love My Parents',
  description: 'Where to get the I Love My Parents app for iPhone and Android.',
  robots: inStores.length ? 'index, follow' : 'noindex, follow',
  content: `<h1 style="${h1}">Get the app</h1>
${
  inStores.length
    ? `<p style="margin: 0 0 24px; color: #4A5752">I Love My Parents is free to start. Install it on your phone first, then add your parent with a 6-digit code.</p>
<div style="display: flex; flex-wrap: wrap; gap: 12px">${inStores.join('\n')}</div>`
    : `<p style="margin: 0 0 16px">I Love My Parents is not in the App Store and Google Play yet. We are finishing the first release for iPhone and Android.</p>
<p style="margin: 0 0 16px">Write to <a href="mailto:${SUPPORT}?subject=Tell%20me%20when%20the%20app%20is%20out">${SUPPORT}</a> and we will email you the day it is out. We will use your address for that one message only.</p>
<p style="margin: 0"><a href="/blog/" style="font-weight: 800">Read the blog while you wait</a></p>`
}`,
});

plainPage({
  address: '/404.html',
  title: 'Page not found: I Love My Parents',
  description: 'This page does not exist.',
  robots: 'noindex',
  content: `<h1 style="${h1}">Page not found</h1>
<p style="margin: 0 0 16px">This address does not lead anywhere. Try the <a href="/">home page</a> or the <a href="/blog/">blog</a>.</p>`,
});

// ------------------------------------------------------- files and lists
cpSync(join(root, 'static'), out, { recursive: true });
writeFileSync(join(out, 'CNAME'), `${DOMAIN}\n`);
writeFileSync(join(out, '.nojekyll'), '');

const today = new Date().toISOString().slice(0, 10);
const newest = articles.map((article) => article.updated).sort().pop() ?? today;
const listed = [
  { address: '/', updated: newest },
  { address: '/blog/', updated: newest },
  ...articles.map((article) => ({ address: article.url, updated: article.updated })),
  { address: '/privacy/', updated: today },
];
writeFileSync(
  join(out, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${listed.map((item) => `  <url><loc>${ORIGIN}${item.address}</loc><lastmod>${item.updated}</lastmod></url>`).join('\n')}
</urlset>
`,
);
writeFileSync(join(out, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /admin/\n\nSitemap: ${ORIGIN}/sitemap.xml\n`);

console.log(
  `_site/ built: home, blog, ${articles.length} articles (${articles.map((article) => article.slug).join(', ')}), privacy (${privacy.updated}), get, 404; analytics ${GA_ID || 'off'}; stores ${inStores.length ? 'linked' : 'not linked yet'}`,
);
