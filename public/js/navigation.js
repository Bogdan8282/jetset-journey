document.addEventListener("DOMContentLoaded", function () {
  const links = document.querySelectorAll(".header__link");
  links.forEach(function (link) {
    link.addEventListener("click", function (event) {
      event.preventDefault();

      const href = this.getAttribute("href");

      fetch(href)
        .then((response) => response.text())
        .then((html) => {
          document.body.innerHTML = html;
          history.pushState({}, "", href);
        })
        .catch((error) => console.error("Error fetching content: ", error));
    });
  });
});