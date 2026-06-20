const menuButton = document.querySelector(".menu-toggle");
const nav = document.querySelector(".site-nav");

menuButton?.addEventListener("click", () => {
  const isOpen = nav.classList.toggle("is-open");
  menuButton.setAttribute("aria-expanded", String(isOpen));
});

nav?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    nav.classList.remove("is-open");
    menuButton?.setAttribute("aria-expanded", "false");
  });
});

document.querySelectorAll(".article-card").forEach((card, index) => {
  const button = card.querySelector(".article-toggle");
  if (index === 0) {
    card.classList.add("is-open");
    button?.querySelector("b")?.replaceChildren("收合");
  }

  button?.addEventListener("click", () => {
    const isOpen = card.classList.toggle("is-open");
    const label = button.querySelector("b");
    if (label) {
      label.textContent = isOpen ? "收合" : "展開";
    }
  });
});
