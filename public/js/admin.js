let deleteItem = (btn) => {
  console.log("-- delete function --");
  let productId = btn.parentNode.querySelector("[name=productId]").value;
  let csrf = btn.parentNode.querySelector("[name=_csrf]").value;

  let productElement = btn.closest("article");

  fetch("/admin/product/" + productId, {
    method: "DELETE",
    headers: {
      "csrf-token": csrf,
    },
  })
    .then((result) => {
      return result.json();
    })
    .then((data) => {
      console.log(data);
      productElement.remove();
    })
    .catch((error) => {
      console.log(error);
    });
};
