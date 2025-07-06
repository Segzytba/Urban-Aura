// js/script.js
let cart = [];

function addToCart(productName, price) {
  cart.push({ productName, price });
  alert(`${productName} added to cart!`);
  localStorage.setItem('cart', JSON.stringify(cart));
}

function loadCart() {
  cart = JSON.parse(localStorage.getItem('cart')) || [];
}



function displayCart() {
  const cartContainer = document.getElementById('cart');
  cartContainer.innerHTML = '';
  if (cart.length === 0) {
    cartContainer.innerHTML = '<p>Your cart is empty.</p>';
    return;
  }
  
  let total = 0;
  cart.forEach(item => {
    total += item.price;
    const itemElement = document.createElement('div');
    itemElement.textContent = `${item.productName} - $${item.price.toFixed(2)}`;
    cartContainer.appendChild(itemElement);
  });
  
  const totalElement = document.createElement('div');
  totalElement.textContent = `Total: $${total.toFixed(2)}`;
  cartContainer.appendChild(totalElement);
}