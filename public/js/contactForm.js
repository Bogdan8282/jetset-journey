$(document).ready(function () {
  $(".feedbacks__slider").slick({
    arrows: true,
    dots: true,
    slidesToShow: 1,
    speed: 1000,
    draggable: false
  });

  $("#contact-form").submit(function (event) {
    event.preventDefault();
    const formData = $(this).serialize();

    $.ajax({
      type: "POST",
      url: "/submit-form",
      data: formData,
      success: function (response) {
        alert("Повідомлення відправлено успішно. Відповідь надійде вам на пошту.");
        $("#contact-form")[0].reset();
      },
      error: function (xhr, status, error) {
        alert("Error sending message");
        console.error(error);
      },
    });
  });
});