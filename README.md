# gsubrama2010-infra.github.io

Personal website and resume for **Ganesh Subramaniam**, Senior DevOps Lead (Infrastructure-as-Code, Cloud Data Platforms).

Live site: https://gsubrama2010-infra.github.io

## Structure

```
index.html            All page content (about, experience, skills, contact)
assets/css/style.css  Styles; colors and fonts are tokens at the top of the file
assets/js/main.js     Small enhancements: scroll reveal, active nav link, footer year
assets/img/           Portrait and og-image.jpg (link-preview card)
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

## Publishing

GitHub Pages serves the `main` branch. Push to `main` and the site updates within a minute or two.
