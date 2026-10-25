// Runs in <head> before first paint so the saved theme never flashes.
(function () {
  var theme;
  try { theme = localStorage.getItem("pz-theme"); } catch (e) {}
  if (theme !== "light" && theme !== "dark") {
    theme = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  document.documentElement.setAttribute("data-theme", theme);
})();
