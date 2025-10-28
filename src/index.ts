import "./background.js";

document.addEventListener("DOMContentLoaded", () => {
  const yearSpan = document.getElementById("current-year");
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear().toString();
  }
});

const canvas = document.querySelector("canvas");

// window.addEventListener("resize", (ev: UIEvent) => {
//   if (window.innerWidth < 1024) {
//     canvas.width = 2000;
//     canvas.height = 2000;
//   }
// });
