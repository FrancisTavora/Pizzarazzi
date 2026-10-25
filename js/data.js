/*
 * Pizzarazzi MNL — site content.
 * Edit prices, pizzas and contact details here; the rest of the site reads from this file.
 */
window.PIZZARAZZI = {
  config: {
    businessEmail: "pizzarazzimnl@gmail.com",
    // Orders and contact messages are emailed to the address above via FormSubmit (https://formsubmit.co).
    // The very first submission triggers an activation email — click the link in it once.
    // After activating, FormSubmit gives you a random alias (e.g. "a1b2c3..."); paste it here
    // so your real address isn't visible in the page source.
    formEndpointId: "pizzarazzimnl@gmail.com",
    phone: "0917 853 5101",
    phoneHref: "+639178535101",
    address: "69 Scarlet Street, Concepcion Dos, Marikina City, Metro Manila 1811",
    mapsUrl: "https://maps.google.com/?q=69+Scarlet+Street+Concepcion+Dos+Marikina+City",
    leadTimeDays: 1,
    pizzaSize: '12"',
    paymentMethods: ["Cash on pickup / delivery", "GCash", "Maya", "Bank transfer"],
    socials: {
      facebook: "https://facebook.com/pizzarazzimanila",
      instagram: "https://instagram.com/pizzarazzimanila",
      tiktok: "https://tiktok.com/@pizzarazzimanila"
    }
  },

  menu: [
    {
      id: "pepperoni",
      name: "Pepperoni",
      price: 350,
      desc: "Classic pepperoni with mozzarella, crushed tomatoes and extra virgin olive oil.",
      image: "https://images.unsplash.com/photo-1628840042765-356cda07504e",
      tag: "Popular",
      story: "Generous layers of premium pepperoni over melted mozzarella and our fresh tomato sauce. A crowd favourite that never disappoints."
    },
    {
      id: "margherita",
      name: "Margherita",
      price: 300,
      desc: "Fresh mozzarella, tomatoes, basil and extra virgin olive oil — the timeless classic.",
      image: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002",
      tag: "Classic",
      story: "The Italian original. Fresh mozzarella, ripe tomatoes, fragrant basil and extra virgin olive oil in perfect balance."
    },
    {
      id: "marinara",
      name: "Marinara",
      price: 280,
      desc: "Simple perfection: tomato sauce, garlic, oregano and extra virgin olive oil.",
      image: "https://images.unsplash.com/photo-1590947132387-155cc02f3212"
    },
    {
      id: "meaty",
      name: "Meaty",
      price: 420,
      desc: "Loaded with pepperoni, sausage, bacon and ham — a meat lover's paradise.",
      image: "https://images.unsplash.com/photo-1534308983496-4fabb1a015ee"
    },
    {
      id: "hawaiian",
      name: "Hawaiian",
      price: 350,
      desc: "Ham, bacon and sweet pineapple — the Filipino favourite done right.",
      image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38",
      tag: "Filipino favourite",
      story: "Premium ham, crispy bacon and sweet pineapple chunks. The sweet-and-savoury balance that keeps Marikina coming back."
    },
    {
      id: "tres",
      name: "Tres",
      price: 380,
      desc: "A heavenly blend of mozzarella, cheddar and Parmesan on our signature dough.",
      image: "https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f",
      favorite: true,
      tag: "House favourite",
      story: "Mozzarella, aged cheddar and Parmesan layered into rich, creamy goodness in every bite."
    },
    {
      id: "prosciutto",
      name: "Prosciutto",
      price: 480,
      desc: "Premium prosciutto, arugula, mozzarella and Parmesan — elevated Italian luxury.",
      image: "https://images.unsplash.com/photo-1595854341625-f33ee10dbf94",
      favorite: true,
      tag: "Premium",
      story: "Delicate prosciutto, peppery arugula, creamy mozzarella and sharp Parmesan on our artisan crust."
    }
  ]
};
