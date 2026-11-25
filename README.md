# gsubrama2010-infra.github.io

Personal website and resume for **Ganesh Subramaniam**, Senior DevOps Lead (Infrastructure-as-Code, Cloud Data Platforms).

Live site: https://gsubrama2010-infra.github.io

## Structure

```
index.html            All page content (about, experience, skills, contact)
404.html              Terminal-style "page not found" page (GitHub Pages serves it automatically)
ai.html               Alternative AI-forward design (uses assets/css/ai.css and assets/js/ai.js; noindex while a draft)
chat-worker/          Cloudflare Worker behind ai.html's "Ask about Ganesh" chat (setup in its README)
assets/css/style.css  Styles; colors and fonts are tokens at the top of the file
assets/js/main.js     Small enhancements: scroll reveal, active nav link, footer year
assets/img/           Portrait, Snowflake event photo (badge blurred), cartoon family illustration
                      (generated with Runway; no real family photo is published), Mustang stand-in photo, og-image.jpg
assets/Ganesh-Subramaniam-Resume.pdf   Public resume (no phone number or street address)
assets/favicon.svg    Browser tab icon
.nojekyll             Tells GitHub Pages to serve files as-is
```

No build step or dependencies. It's plain HTML, CSS and JavaScript.

## Editing

- **Content:** edit `index.html`. Each job is an `<article class="job">` block in the Experience section.
- **Colors:** change `--accent` and `--accent-2` in `assets/css/style.css`.

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
