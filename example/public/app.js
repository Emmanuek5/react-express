// Layout script: loaded once in <head>, so it uses `rx:load` (fires on first load and
// after every client-side navigation) instead of DOMContentLoaded.
document.addEventListener("rx:load", () => {
  document.querySelectorAll(".top nav a").forEach((a) => {
    a.classList.toggle("active", new URL(a.href).pathname === location.pathname);
  });
});
