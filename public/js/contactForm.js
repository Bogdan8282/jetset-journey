$(document).ready(function () {
  $(".feedbacks__slider").slick({
    arrows: true,
    dots: true,
    slidesToShow: 1,
    speed: 1000,
    draggable: false,
  });

  $("#contact-form").submit(function (event) {
    event.preventDefault();
    const formData = $(this).serialize();

    $.ajax({
      type: "POST",
      url: "/submit-form",
      data: formData,
      success: function (response) {
        if (response.success) {
          alert(response.success);
          $("#contact-form")[0].reset();
        }
      },
      error: function (xhr, status, error) {
        const response = xhr.responseJSON;
        if (response && response.error) {
          alert(response.error);
        } else {
          alert("Error sending message");
        }
      },
    });
  });
});
