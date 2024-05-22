document.addEventListener("DOMContentLoaded", function () {
  initHeaderEvents();
  initNavigationEvents();
});

function initHeaderEvents() {
  const header = document.querySelector("#header");
  const navLinks = document.querySelectorAll(".header__link");

  function toggleHeaderClass() {
    if (window.scrollY > 0) {
      header.classList.add("active");
    } else {
      header.classList.remove("active");
    }
  }

  toggleHeaderClass();
  window.addEventListener("scroll", toggleHeaderClass);

  const menu = document.querySelector('.header__menu');
  const nav = document.querySelector('.header__nav-adaptive');

  menu.addEventListener('click', function() {
    nav.classList.toggle('active');
  });
}

function initNavigationEvents() {
 const navLinks = document.querySelectorAll(".header__link");
  
 navLinks.forEach(function(link) {
  link.addEventListener("click", function(event) {
   event.preventDefault();

   const href = this.getAttribute("href");

   fetch(href)
    .then((response) => response.text())
    .then((html) => {
     document.body.innerHTML = html;
     history.pushState({}, "", href);
     initHeaderEvents();

     $(".feedbacks__slider").slick({
      arrows: true,
      dots: true,
      slidesToShow: 1,
      speed: 1000,
      draggable: false
     });
    })
    .catch((error) => console.error("Error fetching content: ", error));
  });
 });
}
