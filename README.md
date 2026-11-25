# gsubrama2010-infra.github.io

Personal website and resume for **Ganesh Subramaniam**, Senior DevOps Lead (Infrastructure-as-Code, Cloud Data Platforms).

Live site: https://gsubrama2010-infra.github.io

## Structure

```
index.html            Main page: the AI-forward design (assets/css/ai.css, assets/js/ai.js)
classic.html          Classic terminal-style design (assets/css/style.css, assets/js/main.js; noindex)
ai.html               Redirect to the main page, so old /ai.html links still work
404.html              Terminal-style "page not found" page (GitHub Pages serves it automatically)
chat-worker/          Cloudflare Worker behind the main page's "Ask about Ganesh" chat (setup in its README)
assets/css/ai.css     Main page styles; every colour is a token in :root ("Bank-grade" navy and gold)
assets/js/ai.js       Main page behaviour: menu, reveals, counters, the Ask about Ganesh chat
assets/css/style.css  Classic page styles
assets/js/main.js     Classic page enhancements: scroll reveal, active nav link, footer year
assets/img/           Portrait (ganesh-cutout.webp is a background-removed copy, faded behind the main hero),
                      Snowflake event photo (badge blurred), cartoon family illustration
                      (generated with Runway; no real family photo is published), Mustang stand-in photo, og-image.jpg
assets/Ganesh-Subramaniam-Resume.pdf   Public resume (no phone number or street address)
assets/favicon.svg    Browser tab icon (a "›_" prompt); favicon.ico and assets/apple-touch-icon.png are PNG copies of it
.nojekyll             Tells GitHub Pages to serve files as-is
```

No build step or dependencies. It's plain HTML, CSS and JavaScript.

## Editing

- **Content:** edit `index.html`. Each job is an `<article class="job">` block in the Experience section. The classic page (`classic.html`) has its own copy of the content.
- **Colours:** the tokens at the top of `assets/css/ai.css` (main page) or `assets/css/style.css` (classic page).
- **What the AI chat knows:** `chat-worker/src/profile.js`, then redeploy the Worker (see `chat-worker/README.md`).

## Preview locally

Open `index.html` in a browser, or serve the folder:

```sh
python -m http.server 8000
# then visit http://localhost:8000
```

## Credits

Mustang photo: "1988 Ford Mustang GT" by GPS 56 from New Zealand, [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/), via [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:1988_Ford_Mustang_GT_(11148494493).jpg). Cropped and number plate blurred.

## Publishing

GitHub Pages serves the `main` branch. Push to `main` and the site updates within a minute or two.
