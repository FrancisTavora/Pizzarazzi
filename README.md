# Pizzarazzi MNL

Website for Pizzarazzi MNL, a made-to-order Neapolitan-style pizza kitchen in Marikina City.
Customers browse the menu, fill a cart and send an order for pickup or delivery at least one day ahead.
No payment is taken online.

**Live site:** https://francistavora.github.io/Pizzarazzi/

## Features

- Pages for home, menu, FAQ, contact and checkout, using hash routes (`#/menu`)
- Cart drawer saved in the browser, with add, remove and undo
- Orders and contact messages sent by email through [FormSubmit](https://formsubmit.co), with a `mailto:` fallback if sending fails
- Printable menu (save as PDF from the menu page)
- Dark and light themes, following the system setting until the visitor chooses one
- Responsive layout, with scroll animations that respect `prefers-reduced-motion`

## Run it locally

The site is plain HTML, CSS and JavaScript, with no build step or dependencies to install.

```bash
python -m http.server 5510
```

Then open http://localhost:5510/.

## Edit the content

Prices, pizzas, contact details and payment methods are in [`js/data.js`](js/data.js).
The menu, the signature lineup and the printable menu are all built from that file.
A pizza appears in the home page lineup when it has a `story`.
The contact details on the page itself and in the search-engine data are written directly in `index.html`, so change those there too.

## Order emails

Orders go to `businessEmail` in `js/data.js`. FormSubmit sends an activation email on the first submission, and its link must be clicked once before messages are delivered.
After activating, replace `formEndpointId` with the alias FormSubmit gives you so the real address isn't exposed in the page source.

## Project layout

| Path | What it is |
|---|---|
| `index.html` | All pages, the header, footer and cart drawer |
| `css/styles.css` | All styles, with design tokens at the top |
| `js/data.js` | Site content |
| `js/theme.js` | Applies the saved theme before first paint |
| `js/app.js` | Cart, routing, forms and scroll effects |

Fonts, icons, the [Lenis](https://github.com/darkroomengineering/lenis) smooth-scroll library and the Unsplash photos load from their CDNs, so they need an internet connection.
If Lenis doesn't load, the page falls back to normal scrolling.

## Deployment

GitHub Pages publishes the root of the `main` branch, so pushing to `main` updates the live site.
Browsers can keep old files for a while, so when you change the CSS or JavaScript, raise the `?v=` number on those files in `index.html`.
