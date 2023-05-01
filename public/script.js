$(()=> {
  
  // Toggle mobile Navbar menu
  const navbarMenu = $('.navbar-menu');
  $('.navbar-toggle').on('click', () => {
    navbarMenu.slideToggle();
  });
  function setNavFlex() {
    navbarMenu.css("display", "flex");
  }
  setInterval(() => {
      if($( window ).width() > 770) setNavFlex();
  }, 1000);

  // Close Modal window
  const modal = $('#modal');
  $('#close-modal').click(function() {
    $("body").removeClass("modelOpened");
    modal.remove();
    location.reload();
  });

  // Get current year for copyright year at footer
  $("#year").text(new Date().getFullYear());

});

// Fetch data
const sendData = (route, data) => {
  axios.post(route, {
    data: data
  }).then(response => {
      console.log(response)
  })
  .catch(err => {
      console.log(err, err.response);
  });
};

// Add item to cart
const addCart = (product)=> {

  sendData("/add", product)
  
  // Open Modal window
  $("#modelItemName").text(product.title);
  $("body").addClass("modelOpened");
  $('#modal').fadeIn();
}

// Remove Item from cart 
const removeItem = (id) => {
  $(`#${id}`).fadeOut();
  axios.delete(`/cart/${id}`)
    .then(response => {
      console.log(response.data);
    })
    .catch(error => {
      console.log(error);
    });

    setTimeout(function() {
      location.reload();
    }, 250);
}

// Update Item Qty
const updateQty = (id, modify) => {

  let qty = parseFloat($(`#${id}_qty`).text());

  // Update helper function
  const updateCall = (id, data)=> {
    axios.patch(`/cart/${id}`, { data: data })
    .then(response => {
      // update total summary
      calTotal(response.data);
    })
    .catch(error => {
      console.log(error)
    });
  }

  // Handle add / remove
  if (modify === "add") { // add
    qty++;
  } else {
    if (qty === 1) return removeItem(id); // remove
    qty--;
  }
  
  // Update html
  $(`#${id}_qty`).text(qty);
  updateCall(id, { quantity: qty });
}

// CheckOut (delete all items in the cart)
const checkOut = () => {
  axios.delete("/checkout")
  .then(response => {
    if(response.data.deletedCount > 0) {
      $('#checkoutBtn').prop('disabled', true);
      window.location.href = '/thankyou';
    }else {
      alert("Your shopping cart is empty...");
    }
  })
  .catch(error => {
    console.log(error);
  });
}
 
// Calculate the summary(SUBTOTAL, TAX, TOTAL)
const calTotal = (cartItems) =>{
  const rate = 0.08;
  let subTotal = 0;

  cartItems.forEach(item => {
    subTotal += item.price * item.quantity;
  });
  
  let tax = subTotal * rate;
  let total = subTotal + tax;

  // Set Html text
  $('#subTotal').text(`$${subTotal.toFixed(2)}`);
  $('#tax').text(`$${tax.toFixed(2)}`);
  $('#total').text(`$${total.toFixed(2)}`);
}