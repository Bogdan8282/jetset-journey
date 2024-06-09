$(document).ready(function () {
  $("#order-form").submit(function (event) {
    event.preventDefault();
    const formData = $(this).serialize();

    $.ajax({
      type: "POST",
      url: "/order",
      data: formData,
      success: function (response) {
        if (response.success) {
          alert(response.success);
          window.location.href = "/tours";
        }
      },
      error: function (xhr, status, error) {
        const response = xhr.responseJSON;
        if (response && response.error) {
          alert(response.error);
        } else {
          alert("Помилка при замовленні туру");
        }
      },
    });
  });
});
