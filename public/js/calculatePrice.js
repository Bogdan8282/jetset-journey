function calculatePrice() {
  const peopleNumSelect = document.getElementById("peopleNum");
  const selectedOption =
    peopleNumSelect.options[peopleNumSelect.selectedIndex].value;
  const tourPrice = parseFloat(document.getElementById("tourPrice").innerText);
  let hotelPrice = 0;

  const hotelSelect = document.getElementById("hotel");
  if (hotelSelect.value) {
    const hotelInfo = hotelSelect.value.split(",");
    hotelPrice = parseFloat(hotelInfo[1]);
  }

  let additionalPrice = 0;
  switch (selectedOption) {
    case "1":
      additionalPrice = 0;
      break;
    case "2-4":
      additionalPrice = 2;
      break;
    case "5+":
      additionalPrice = 4;
      break;
    default:
      additionalPrice = 0;
  }

  const totalPrice = tourPrice + hotelPrice + 100 * additionalPrice;

  document.getElementById(
    "totalPrice"
  ).innerText = `Приблизна вартість: ${totalPrice} грн`;
}

window.onload = calculatePrice;
