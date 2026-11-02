(function () {
  "use strict";

  const { config: CONFIG, menu: MENU } = window.PIZZARAZZI;
  const MENU_BY_ID = Object.fromEntries(MENU.map((p) => [p.id, p]));
  const FORM_ENDPOINT = `https://formsubmit.co/ajax/${CONFIG.formEndpointId}`;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---------- Helpers ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const pesoFormatter = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 });
  const peso = (n) => pesoFormatter.format(n);

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const img = (url, w) => `${url}?w=${w}&q=75&auto=format&fit=crop`;

  /* ---------- Smooth scroll (Lenis; native scrolling if it didn't load or motion is reduced) ---------- */
  const lenis = window.Lenis && !prefersReducedMotion.matches ? new window.Lenis({ lerp: 0.16 }) : null;
  if (lenis) {
    // Update in the same frame Lenis scrolls, so cards don't trail a frame behind
    lenis.on("scroll", () => runScrollEffects());
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }

  function scrollToTarget(target, { instant = false } = {}) {
    const offset = target === 0 ? 0 : -(document.getElementById("site-header").offsetHeight + 16);
    if (lenis) return lenis.scrollTo(target, { offset, immediate: instant, force: true });
    const top = target === 0 ? 0 : target.getBoundingClientRect().top + window.scrollY + offset;
    window.scrollTo({ top, behavior: instant || prefersReducedMotion.matches ? "auto" : "smooth" });
  }

  const storage = {
    get(key, fallback) {
      try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* private mode */ }
    }
  };

  // YYYY-MM-DD in Manila time, `days` from today
  function manilaDate(days = 0) {
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());
    const d = new Date(`${today}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  }

  function formatDate(iso) {
    return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  }

  function orderRef() {
    const stamp = manilaDate().slice(2).replace(/-/g, "");
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `PZ-${stamp}-${rand}`;
  }

  /* ---------- Toast ---------- */
  const toastEl = $("#toast");
  let toastTimer;
  function toast(message, action) {
    toastEl.innerHTML = `<span>${esc(message)}</span>`;
    if (action) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = action.label;
      btn.addEventListener("click", () => { action.onClick(); hideToast(); });
      toastEl.append(btn);
    }
    toastEl.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, 3500);
  }
  function hideToast() { toastEl.classList.remove("is-visible"); }

  /* ---------- Cart ---------- */
  const cart = {
    items: storage.get("pz-cart", {}),
    save() {
      // Drop anything no longer on the menu
      for (const id of Object.keys(this.items)) if (!MENU_BY_ID[id] || this.items[id] < 1) delete this.items[id];
      storage.set("pz-cart", this.items);
      renderCart();
    },
    qty(id) { return this.items[id] || 0; },
    set(id, qty) {
      if (qty < 1) delete this.items[id];
      else this.items[id] = Math.min(qty, 50);
      this.save();
    },
    clear() { this.items = {}; this.save(); },
    lines() {
      return Object.entries(this.items).map(([id, qty]) => ({ ...MENU_BY_ID[id], qty, total: MENU_BY_ID[id].price * qty }));
    },
    count() { return Object.values(this.items).reduce((a, b) => a + b, 0); },
    subtotal() { return this.lines().reduce((a, l) => a + l.total, 0); }
  };

  function buyControl(id) {
    const q = cart.qty(id);
    const name = esc(MENU_BY_ID[id].name);
    if (!q) {
      return `<button class="btn btn--primary" type="button" data-action="add" data-id="${id}">Add to cart <i class="fa-solid fa-plus" aria-hidden="true"></i></button>`;
    }
    return stepper(id, q, name);
  }

  function stepper(id, q, name, small) {
    return `<div class="stepper${small ? " stepper--sm" : ""}" role="group" aria-label="${name} quantity">
      <button type="button" data-action="dec" data-id="${id}" aria-label="Remove one ${name}"><i class="fa-solid fa-minus" aria-hidden="true"></i></button>
      <output aria-live="polite">${q}</output>
      <button type="button" data-action="inc" data-id="${id}" aria-label="Add one ${name}"><i class="fa-solid fa-plus" aria-hidden="true"></i></button>
    </div>`;
  }

  function lineItems() {
    return cart.lines().map((l) => `
      <li class="line-item">
        <img class="line-item__img" src="${img(l.image, 160)}" alt="" loading="lazy" width="64" height="64">
        <div>
          <p class="line-item__name">${esc(l.name)}</p>
          <p class="line-item__meta">${peso(l.price)} &middot; ${esc(CONFIG.pizzaSize)}</p>
          ${stepper(l.id, l.qty, esc(l.name), true)}
        </div>
        <div class="line-item__right">
          <span class="line-item__total">${peso(l.total)}</span>
          <button class="line-item__remove" type="button" data-action="remove" data-id="${l.id}">Remove</button>
        </div>
      </li>`).join("");
  }

  const emptyCart = `
    <li class="empty-state">
      <i class="fa-solid fa-pizza-slice" aria-hidden="true"></i>
      <p>Your cart is empty.</p>
      <a class="btn btn--ghost" href="#/menu">Browse the menu</a>
    </li>`;

  function renderCart() {
    const count = cart.count();
    const subtotal = peso(cart.subtotal());
    $$("[data-cart-count]").forEach((el) => (el.textContent = count));
    $$("[data-cart-subtotal]").forEach((el) => (el.textContent = subtotal));
    $("#cart-open").setAttribute("aria-label", `Open cart, ${count} item${count === 1 ? "" : "s"}`);

    $$("[data-buy]").forEach((el) => (el.innerHTML = buyControl(el.dataset.buy)));

    const items = count ? lineItems() : emptyCart;
    $("#drawer-items").innerHTML = items;
    $("#checkout-items").innerHTML = count ? lineItems() : "";
    $("#drawer-checkout").hidden = !count;

    if (currentRoute === "checkout") renderCheckoutState();
  }

  function bumpCartButton() {
    const btn = $("#cart-open");
    btn.classList.remove("is-bumped");
    void btn.offsetWidth;
    btn.classList.add("is-bumped");
  }

  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-action]");
    if (!el) return;
    const { action, id } = el.dataset;
    const item = MENU_BY_ID[id];
    if (!item) return;
    const q = cart.qty(id);

    if (action === "add") {
      const buyEl = el.closest("[data-buy]");
      cart.set(id, q + 1);
      bumpCartButton();
      toast(`${item.name} added to cart`, { label: "View cart", onClick: openDrawer });
      // Keep keyboard focus on the stepper that replaced the button
      if (buyEl) $('[data-action="inc"]', buyEl)?.focus();
    } else if (action === "inc") {
      cart.set(id, q + 1);
      bumpCartButton();
    } else if (action === "dec" || action === "remove") {
      const next = action === "remove" ? 0 : q - 1;
      cart.set(id, next);
      if (next === 0) toast(`${item.name} removed`, { label: "Undo", onClick: () => cart.set(id, q) });
    }
  });

  /* ---------- Drawer ---------- */
  const drawer = $("#cart-drawer");
  const scrim = $("#drawer-scrim");
  let lastFocus;

  function openDrawer() {
    lastFocus = document.activeElement;
    scrim.hidden = false;
    drawer.inert = false;
    drawer.setAttribute("aria-hidden", "false");
    requestAnimationFrame(() => {
      scrim.classList.add("is-open");
      drawer.classList.add("is-open");
    });
    $("#cart-open").setAttribute("aria-expanded", "true");
    document.body.classList.add("body-lock");
    lenis?.stop();
    setTimeout(() => $("#cart-close").focus(), 50);
  }

  function closeDrawer() {
    if (!drawer.classList.contains("is-open")) return;
    scrim.classList.remove("is-open");
    drawer.classList.remove("is-open");
    drawer.inert = true;
    drawer.setAttribute("aria-hidden", "true");
    $("#cart-open").setAttribute("aria-expanded", "false");
    document.body.classList.remove("body-lock");
    lenis?.start();
    setTimeout(() => (scrim.hidden = true), 400);
    lastFocus?.focus?.();
  }

  $("#cart-open").addEventListener("click", openDrawer);
  $("#cart-close").addEventListener("click", closeDrawer);
  scrim.addEventListener("click", closeDrawer);
  drawer.addEventListener("click", (e) => { if (e.target.closest("a[href^='#/']")) closeDrawer(); });

  /* ---------- Mobile nav ---------- */
  const nav = $("#nav");
  const navToggle = $("#nav-toggle");
  const header = $("#site-header");

  function setNav(open) {
    nav.classList.toggle("is-open", open);
    header.classList.toggle("nav-open", open);
    navToggle.setAttribute("aria-expanded", String(open));
    navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }
  navToggle.addEventListener("click", () => setNav(!nav.classList.contains("is-open")));
  nav.addEventListener("click", (e) => { if (e.target.closest("a")) setNav(false); });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    closeDrawer();
    setNav(false);
  });

  /* ---------- Router ---------- */
  const ROUTES = ["home", "menu", "faq", "contact", "checkout"];
  const TITLES = {
    home: "Pizzarazzi MNL | Neapolitan-Style Pizza in Marikina",
    menu: "Menu | Pizzarazzi MNL",
    faq: "FAQ | Pizzarazzi MNL",
    contact: "Contact | Pizzarazzi MNL",
    checkout: "Checkout | Pizzarazzi MNL"
  };
  let currentRoute = null;

  function route() {
    const hash = location.hash;
    let name = "home";
    let anchor = null;

    if (hash.startsWith("#/")) {
      name = hash.slice(2).split(/[/?]/)[0] || "home";
      if (!ROUTES.includes(name)) name = "home";
    } else if (hash.length > 1) {
      anchor = document.getElementById(hash.slice(1));
      if (anchor) name = anchor.closest("[data-route]")?.dataset.route || "home";
    }

    const changed = name !== currentRoute;
    if (changed) {
      $$("[data-route]").forEach((p) => (p.hidden = p.dataset.route !== name));
      $$("[data-route-link]").forEach((a) => {
        if (a.dataset.routeLink === name) a.setAttribute("aria-current", "page");
        else a.removeAttribute("aria-current");
      });
      document.title = TITLES[name];
      currentRoute = name;
      if (name === "checkout") renderCheckoutState();
    }

    setNav(false);
    closeDrawer();

    if (anchor) scrollToTarget(anchor);
    else if (changed) scrollToTarget(0, { instant: true });

    if (changed) {
      // Move focus to the page for screen readers without scrolling
      const page = $(`[data-route="${name}"]`);
      page.setAttribute("tabindex", "-1");
      page.focus({ preventScroll: true });
    }
    onScroll();
  }

  window.addEventListener("hashchange", route);

  /* ---------- Rendering ---------- */
  function renderMenu() {
    $("#menu-grid").innerHTML = MENU.map((p, i) => `
      <article class="menu-card reveal" style="--d:${(i % 3) * 0.08}s">
        <div class="menu-card__media">
          <img src="${img(p.image, 720)}" srcset="${img(p.image, 480)} 480w, ${img(p.image, 720)} 720w, ${img(p.image, 1000)} 1000w" sizes="(max-width: 700px) 100vw, 400px" alt="${esc(p.name)} pizza" loading="lazy" width="720" height="540">
          ${p.favorite ? `<span class="badge"><i class="fa-solid fa-star" aria-hidden="true"></i> Favourite</span>` : ""}
        </div>
        <div class="menu-card__body">
          <div class="menu-card__head">
            <h2 class="menu-card__name">${esc(p.name)}</h2>
            <span class="menu-card__price">${peso(p.price)}</span>
          </div>
          <p class="menu-card__size">${esc(CONFIG.pizzaSize)} Neapolitan-style</p>
          <p class="menu-card__desc">${esc(p.desc)}</p>
          <div class="buy" data-buy="${p.id}"></div>
        </div>
      </article>`).join("");
  }

  function renderLineup() {
    const featured = MENU.filter((p) => p.story);
    $("#lineup-list").innerHTML = featured.map((p, i) => `
      <article class="lineup-item reveal">
        <div class="lineup-item__media">
          <img data-parallax="0.1" src="${img(p.image, 1200)}" srcset="${img(p.image, 700)} 700w, ${img(p.image, 1200)} 1200w" sizes="(max-width: 960px) 100vw, 58vw" alt="${esc(p.name)} pizza" loading="lazy">
        </div>
        <div class="lineup-item__text">
          <p class="lineup-item__index">${String(i + 1).padStart(2, "0")} <span class="lineup-item__tag">${esc(p.tag || "")}</span></p>
          <h3 class="display lineup-item__name">${esc(p.name)}</h3>
          <p class="lineup-item__story">${esc(p.story)}</p>
          <div class="lineup-item__buy">
            <span class="lineup-item__price">${peso(p.price)}</span>
            <div class="buy" data-buy="${p.id}"></div>
          </div>
        </div>
      </article>`).join("");
  }

  function renderPrintMenu() {
    $("#print-menu-sheet").innerHTML = `
      <h1>PIZZARAZZI MNL</h1>
      <p class="print-menu__sub">Handcrafted ${esc(CONFIG.pizzaSize)} Neapolitan-style pizza &middot; Order at least ${CONFIG.leadTimeDays} day in advance</p>
      ${MENU.map((p) => `
        <div class="print-menu__item">
          <h2>${esc(p.name)}${p.favorite ? " ★" : ""}</h2>
          <strong>${peso(p.price)}</strong>
          <p>${esc(p.desc)}</p>
        </div>`).join("")}
      <div class="print-menu__foot">
        <p><strong>Order:</strong> pizzarazzimnl website &middot; ${esc(CONFIG.businessEmail)} &middot; ${esc(CONFIG.phone)}</p>
        <p><strong>Kitchen:</strong> ${esc(CONFIG.address)}</p>
        <p><strong>Payment:</strong> ${CONFIG.paymentMethods.map(esc).join(", ")}</p>
      </div>`;
  }

  $("#print-menu").addEventListener("click", () => window.print());

  /* ---------- Sending (FormSubmit, with mailto fallback) ---------- */
  async function sendToInbox(payload) {
    const res = await fetch(FORM_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ _template: "table", _captcha: "false", ...payload })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || String(data.success) !== "true") throw new Error(data.message || `HTTP ${res.status}`);
  }

  function mailtoHref(subject, body) {
    return `mailto:${CONFIG.businessEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  function asText(fields) {
    return Object.entries(fields).map(([k, v]) => (String(v).includes("\n") ? `${k}:\n${v}` : `${k}: ${v}`)).join("\n");
  }

  function setLoading(btn, loading) {
    btn.classList.toggle("is-loading", loading);
    btn.disabled = loading;
  }

  function setStatus(el, html, kind) {
    el.className = `form__status${kind ? ` is-${kind}` : ""}`;
    el.innerHTML = html;
  }

  /* ---------- Validation ---------- */
  function validate(form) {
    let firstInvalid = null;
    $$(".field", form).forEach((field) => {
      const input = $("input, textarea, select", field);
      if (!input) return;
      $(".field__error", field)?.remove();
      field.classList.remove("is-invalid");
      input.removeAttribute("aria-invalid");
      if (input.disabled || input.closest("[hidden]")) return;

      input.value = input.value.trim();
      let msg = "";
      if (input.validity.valueMissing) msg = "This field is required.";
      else if (input.validity.typeMismatch && input.type === "email") msg = "Enter a valid email address.";
      else if (input.validity.rangeUnderflow) msg = `Please choose ${formatDate(input.min)} or later.`;
      else if (input.type === "tel" && input.value && input.value.replace(/\D/g, "").length < 10) msg = "Enter a valid phone number.";

      if (msg) {
        field.classList.add("is-invalid");
        input.setAttribute("aria-invalid", "true");
        const err = document.createElement("span");
        err.className = "field__error";
        err.id = `${input.id}-error`;
        err.textContent = msg;
        input.setAttribute("aria-describedby", err.id);
        field.append(err);
        firstInvalid ||= input;
      }
    });
    firstInvalid?.focus();
    return !firstInvalid;
  }

  /* ---------- Checkout ---------- */
  const orderForm = $("#order-form");
  const orderSubmit = $("#order-submit");
  const orderStatus = $("#order-status");
  const checkoutGrid = $(".checkout");
  const checkoutState = document.createElement("div");
  $("#checkout-root").append(checkoutState);
  let placedOrder = null;

  function renderCheckoutState() {
    if (placedOrder) {
      checkoutGrid.hidden = true;
      checkoutState.hidden = false;
      checkoutState.innerHTML = `
        <div class="success-state card">
          <i class="fa-solid fa-circle-check" aria-hidden="true"></i>
          <h2 class="display">Order <em>received</em></h2>
          <span class="order-ref">${esc(placedOrder.ref)}</span>
          <p>Thanks, ${esc(placedOrder.name)}! We've got your order for ${esc(formatDate(placedOrder.date))}. We'll reach out at ${esc(placedOrder.email)} or ${esc(placedOrder.phone)} to confirm and share payment details.</p>
          <a class="btn btn--ghost" href="#/" data-reset-order>Back to home</a>
        </div>`;
    } else if (!cart.count()) {
      checkoutGrid.hidden = true;
      checkoutState.hidden = false;
      checkoutState.innerHTML = `<ul class="card">${emptyCart}</ul>`;
    } else {
      checkoutGrid.hidden = false;
      checkoutState.hidden = true;
    }
  }

  checkoutState.addEventListener("click", (e) => { if (e.target.closest("[data-reset-order]")) placedOrder = null; });

  function syncFulfillment() {
    const delivery = orderForm.elements.fulfillment.value === "Delivery";
    const field = $("#address-field");
    field.hidden = !delivery;
    $("#customer-address").required = delivery;
  }
  orderForm.addEventListener("change", (e) => { if (e.target.name === "fulfillment") syncFulfillment(); });

  function initOrderForm() {
    const minDate = manilaDate(CONFIG.leadTimeDays);
    const dateInput = $("#order-date");
    dateInput.min = minDate;
    if (!dateInput.value || dateInput.value < minDate) dateInput.value = minDate;

    $("#order-payment").innerHTML = CONFIG.paymentMethods.map((m) => `<option>${esc(m)}</option>`).join("");

    const saved = storage.get("pz-customer", {});
    ["name", "email", "phone", "address"].forEach((k) => { if (saved[k]) orderForm.elements[k].value = saved[k]; });
    syncFulfillment();
  }

  orderForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    setStatus(orderStatus, "");
    if (!cart.count()) return;
    if (!validate(orderForm)) {
      setStatus(orderStatus, "Please check the highlighted fields.", "error");
      return;
    }

    const f = orderForm.elements;
    const ref = orderRef();
    const lines = cart.lines();
    const delivery = f.fulfillment.value === "Delivery";
    const order = {
      "Order ref": ref,
      Name: f.name.value,
      Email: f.email.value,
      Phone: f.phone.value,
      Fulfillment: f.fulfillment.value,
      Address: delivery ? f.address.value : "— (pickup)",
      Date: formatDate(f.date.value),
      Time: f.time.value,
      Payment: f.payment.value,
      Items: lines.map((l) => `${l.qty} × ${l.name} @ ${peso(l.price)} = ${peso(l.total)}`).join("\n"),
      Subtotal: peso(cart.subtotal()) + (delivery ? " + delivery fee (to be quoted)" : ""),
      Notes: f.notes.value || "None",
      "Placed at": new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" })
    };
    const subject = `New order ${ref} — ${f.name.value} (${order.Date})`;

    storage.set("pz-customer", { name: f.name.value, email: f.email.value, phone: f.phone.value, address: f.address.value });

    const succeed = () => {
      placedOrder = { ref, name: f.name.value, email: f.email.value, phone: f.phone.value, date: f.date.value };
      f.notes.value = "";
      cart.clear();
      renderCheckoutState();
      scrollToTarget(0);
    };

    // Honeypot filled → silently pretend success
    if (f._honey.value) return succeed();

    setLoading(orderSubmit, true);
    try {
      await sendToInbox({ _subject: subject, _replyto: f.email.value, ...order });
      succeed();
    } catch (err) {
      console.warn("Order send failed, falling back to email:", err);
      const href = mailtoHref(subject, asText(order));
      setStatus(orderStatus, `We couldn't send your order automatically. Your email app should open with the order filled in &mdash; just hit send. <a href="${esc(href)}">Open email again</a>`, "error");
      window.location.href = href;
    } finally {
      setLoading(orderSubmit, false);
    }
  });

  /* ---------- Contact ---------- */
  const contactForm = $("#contact-form");
  contactForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const status = $(".form__status", contactForm);
    const btn = $("button[type=submit]", contactForm);
    setStatus(status, "");
    if (!validate(contactForm)) return;

    const f = contactForm.elements;
    const fields = { Name: f.name.value, Email: f.email.value, Phone: f.phone.value || "—", Message: f.message.value };
    const subject = `Website message: ${f.subject.value}`;

    if (f._honey.value) { contactForm.reset(); return setStatus(status, "Thanks! Your message has been sent.", "success"); }

    setLoading(btn, true);
    try {
      await sendToInbox({ _subject: subject, _replyto: f.email.value, ...fields });
      contactForm.reset();
      setStatus(status, "Thanks! Your message has been sent &mdash; we'll get back to you soon.", "success");
    } catch (err) {
      console.warn("Contact send failed, falling back to email:", err);
      const href = mailtoHref(f.subject.value, asText(fields));
      setStatus(status, `Couldn't send automatically, so we've opened your email app instead. <a href="${esc(href)}">Open email again</a>`, "error");
      window.location.href = href;
    } finally {
      setLoading(btn, false);
    }
  });

  /* ---------- Theme ---------- */
  const themeBtn = $("#theme-toggle");
  const themeMeta = $('meta[name="theme-color"]');

  function applyThemeUI() {
    const dark = document.documentElement.dataset.theme !== "light";
    themeBtn.innerHTML = `<i class="fa-solid ${dark ? "fa-sun" : "fa-moon"}" aria-hidden="true"></i>`;
    themeBtn.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
    themeMeta.setAttribute("content", dark ? "#0c0b0a" : "#f4efe7");
  }

  themeBtn.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("pz-theme", next); } catch (e) { /* ignore */ }
    themeBtn.animate([{ transform: "rotate(0)" }, { transform: "rotate(360deg)" }], { duration: 500, easing: "cubic-bezier(0.22, 1, 0.36, 1)" });
    applyThemeUI();
  });

  /* ---------- Scroll effects: header, parallax, USP stack ---------- */
  const hero = $(".hero");
  const uspCards = $$(".usp-card");
  const uspList = $(".usp__list");
  const uspInners = uspCards.map((c) => $(".usp-card__inner", c));
  const uspDims = uspInners.map((inner) => inner.appendChild(document.createElement("span")));
  uspDims.forEach((el) => (el.className = "usp-card__dim"));
  const uspWritten = uspCards.map(() => ({}));
  let uspLayout = null;
  let parallaxEls = [];
  const uspCurrent = $("#usp-current");
  const uspProgress = $("#usp-progress");
  let ticking = false;
  let lastY = window.scrollY;
  let uspActive = 0;

  function updateHeader() {
    const y = window.scrollY;
    const onHome = currentRoute === "home";
    const overHero = onHome && y < hero.offsetHeight - header.offsetHeight;
    header.classList.toggle("is-over-hero", overHero && y < 40);
    header.classList.toggle("is-solid", !onHome || y > 40);
    // Tuck the header away while scrolling down, bring it back on any scroll up
    const busy = nav.classList.contains("is-open") || drawer.classList.contains("is-open");
    if (Math.abs(y - lastY) > 4 || y < 120) {
      header.classList.toggle("is-hidden", !busy && y > 120 && y > lastY);
      lastY = y;
    }
  }

  function updateParallax() {
    const vh = window.innerHeight;
    const writes = [];
    parallaxEls.forEach((el) => {
      const frame = el.parentElement;
      if (!frame.offsetParent && frame !== document.body) return; // hidden page
      const rect = frame.getBoundingClientRect();
      if (!prefersReducedMotion.matches && (rect.bottom < -100 || rect.top > vh + 100)) return;
      const extra = el.offsetHeight - frame.offsetHeight;
      if (extra <= 0) return;
      const base = -extra / 2;
      if (prefersReducedMotion.matches) { writes.push([el, base]); return; }
      const speed = parseFloat(el.dataset.parallax) || 0.1;
      const delta = (rect.top + rect.height / 2 - vh / 2) * speed;
      writes.push([el, base - Math.max(-extra / 2, Math.min(extra / 2, delta))]);
    });
    writes.forEach(([el, y]) => (el.style.transform = `translate3d(0, ${y}px, 0)`));
  }

  const clamp01 = (v) => Math.min(1, Math.max(0, v));

  // Layout is read only when it can have changed, never while scrolling
  function measureUsp() {
    const style = getComputedStyle(uspCards[0]);
    const gap = parseFloat(getComputedStyle(uspList).rowGap) || 0;
    let top = uspList.getBoundingClientRect().top + window.scrollY;
    const tops = uspCards.map((card) => {
      const t = top;
      top += card.offsetHeight + gap;
      return t;
    });
    uspLayout = {
      tops,
      stuck: style.position === "sticky",
      stickTop: parseFloat(style.top) || 0,
      travel: window.innerHeight * 0.5, // how far below its slot a card starts swinging in
      narrow: window.innerWidth <= 960
    };
  }

  function writeUspCard(i, transform, opacity, dim) {
    const last = uspWritten[i];
    if (last.transform !== transform) uspInners[i].style.transform = last.transform = transform;
    if (last.opacity !== opacity) {
      uspInners[i].style.opacity = last.opacity = opacity;
      uspInners[i].style.visibility = opacity === "0" ? "hidden" : ""; // buried: nothing left to draw
    }
    if (last.dim !== dim) uspDims[i].style.opacity = last.dim = dim;
  }

  function updateUsp() {
    if (currentRoute !== "home" || !uspCards.length) return;
    if (!uspLayout) measureUsp();
    const { tops, stuck, stickTop, travel, narrow } = uspLayout;

    if (!stuck) { // short screens show a plain list
      uspCards.forEach((_, i) => writeUspCard(i, "", "1", "0"));
      return;
    }

    // away[i]: 1 while card i is still well below its slot, 0 once it has landed
    const y = window.scrollY;
    const away = tops.map((top) => clamp01((top - y - stickTop) / travel));

    let active = 0;
    let landed = 0;
    uspCards.forEach((_, i) => {
      // depth: how many later cards have landed on top of this one (fractional)
      let depth = 0;
      for (let j = i + 1; j < away.length; j++) depth += 1 - away[j];
      if (away[i] < 0.5) active = i;
      landed += 1 - away[i];

      if (prefersReducedMotion.matches) {
        writeUspCard(i, "", (1 - clamp01(depth - 0.5)).toFixed(2) * 1 + "", "0");
        return;
      }

      // Every card rests off to its own side, so the pile zigzags left / right
      const side = i % 2 ? 1 : -1;
      const restX = narrow ? 1 : 3.5;
      const restTilt = narrow ? 1.2 : 2;
      const e = away[i] * away[i]; // ease the swing so it settles softly
      const d = Math.min(depth, 2);
      const back = Math.min(depth, 1);

      const tx = side * (restX + e * (narrow ? 6 : 10));
      const ty = -d * 18;
      const rot = side * (restTilt + e * (narrow ? 3 : 5) + back * (narrow ? 0.6 : 1.5));
      const scale = 1 - d * 0.05;
      writeUspCard(
        i,
        `translate3d(${tx.toFixed(2)}%, ${ty.toFixed(1)}px, 0) rotate(${rot.toFixed(2)}deg) scale(${scale.toFixed(3)})`,
        (1 - clamp01(depth - 1)).toFixed(2) * 1 + "",
        (back * 0.5).toFixed(2)
      );
    });

    const label = String(active + 1).padStart(2, "0");
    if (active !== uspActive) {
      const dir = active > uspActive ? 1 : -1;
      uspActive = active;
      uspCurrent.textContent = label;
      if (!prefersReducedMotion.matches) {
        uspCurrent.animate(
          [{ transform: `translateY(${dir * 70}%)`, opacity: 0 }, { transform: "none", opacity: 1 }],
          { duration: 600, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
        );
      }
    }
    uspProgress.style.transform = `scaleX(${clamp01(landed / uspCards.length)})`;
  }

  function runScrollEffects() {
    updateHeader();
    updateParallax();
    updateUsp();
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      runScrollEffects();
      ticking = false;
    });
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  function remeasure() { uspLayout = null; onScroll(); }
  window.addEventListener("resize", remeasure);
  new ResizeObserver(remeasure).observe(document.body); // fonts, images, page changes
  document.addEventListener("animationend", (e) => { if (e.target.classList?.contains("page")) remeasure(); });

  /* ---------- Fade images in once loaded ---------- */
  function watchImages(root = document) {
    $$('img[loading="lazy"]:not(.is-loaded)', root).forEach((el) => {
      const done = () => el.classList.add("is-loaded");
      if (el.complete) done();
      else { el.addEventListener("load", done, { once: true }); el.addEventListener("error", done, { once: true }); }
    });
  }

  /* ---------- Reveal on scroll ---------- */
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-in");
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -60px 0px" });

  /* ---------- Init ---------- */
  renderMenu();
  renderLineup();
  parallaxEls = $$("[data-parallax]");
  renderPrintMenu();
  initOrderForm();
  applyThemeUI();
  $$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
  $$(".reveal").forEach((el) => revealObserver.observe(el));
  watchImages();
  route();
  renderCart();
  parallaxEls.forEach((el) => el.addEventListener("load", onScroll, { once: true }));
})();
