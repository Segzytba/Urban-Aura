// Enhanced cart functionality
let cart = [];

// Load product catalog for stock management
let productCatalog = [
  {
    name: "Black Blaze Flow Tee",
    source: "images/Black Blaze Flow Tee.jpg",
    price: 22000,
    stock: 10,
    id: "black-blaze-flow",
  },
  {
    name: "Black Drift Tee",
    source: "images/Black Drift Tee.jpg",
    price: 22000,
    stock: 8,
    id: "black-drift",
  },
  {
    name: "Brown Drift Tee",
    source: "images/Brown Drift Tee.jpg",
    price: 22000,
    stock: 12,
    id: "brown-drift",
  },
  {
    name: "Cream Blaze Flow Tee",
    source: "images/Cream Blaze Flow Tee.jpg",
    price: 22000,
    stock: 6,
    id: "cream-blaze-flow",
  },
  {
    name: "Green Drift Tee",
    source: "images/Green Drift Tee.jpg",
    price: 22000,
    stock: 9,
    id: "green-drift",
  },
  {
    name: "White Blaze Flow Tee",
    source: "images/White Blaze Flow Tee.jpg",
    price: 22000,
    stock: 5,
    id: "white-blaze-flow",
  },
  {
    name: "Pink Blaze Flow Tee",
    source: "images/Pink Blaze Flow Tee.jpg",
    price: 22000,
    stock: 7,
    id: "pink-blaze-flow",
  },
  {
    name: "Green Aura Tank Top",
    source: "images/Green Aura Tank Top.jpg",
    price: 25000,
    stock: 4,
    id: "green-tank",
  },
];

// Load stock from localStorage
function loadStock() {
  const savedStock = localStorage.getItem("productStock");
  if (savedStock) {
    const stockData = JSON.parse(savedStock);
    productCatalog.forEach((product) => {
      if (stockData[product.id] !== undefined) {
        product.stock = stockData[product.id];
      }
    });
  }
}

// Save stock to localStorage
function saveStock() {
  const stockData = {};
  productCatalog.forEach((product) => {
    stockData[product.id] = product.stock;
  });
  localStorage.setItem("productStock", JSON.stringify(stockData));
}

// Show toast notification
window.showToast = function (message, type = "success") {
  const toast = document.getElementById("toast");
  const toastMessage = document.getElementById("toast-message");

  if (toast && toastMessage) {
    toastMessage.textContent = message;
    toast.className = `toast ${type} show`;

    // Auto hide after 3 seconds
    setTimeout(() => {
      toast.className = "toast";
    }, 3000);
  }
};

// Close toast notification
window.closeToast = function () {
  const toast = document.getElementById("toast");
  if (toast) {
    toast.className = "toast";
  }
};

// Enhanced addToCart function with quantity and stock management
window.addToCart = function (productName, price, productId) {
  const quantityInput = document.getElementById(`qty-${productId}`);
  const quantity = quantityInput ? parseInt(quantityInput.value) || 1 : 1;

  // Find product in catalog
  const product = productCatalog.find((p) => p.id === productId);

  if (!product) {
    showToast("Product not found!", "error");
    return;
  }

  // Check stock availability
  if (quantity > product.stock) {
    showToast(`Only ${product.stock} items available in stock!`, "error");
    return;
  }

  if (product.stock === 0) {
    showToast("Product is out of stock!", "error");
    return;
  }

  // Check if product already exists in cart
  const existingItem = cart.find((item) => item.productId === productId);

  if (existingItem) {
    const newQuantity = existingItem.quantity + quantity;
    if (newQuantity > product.stock) {
      showToast(
        `Cannot add more. Only ${product.stock} items available!`,
        "error"
      );
      return;
    }
    existingItem.quantity = newQuantity;
  } else {
    cart.push({
      productName,
      price,
      productId,
      quantity,
      image: product.source,
    });
  }

  // Update stock
  product.stock -= quantity;
  saveStock();
  updateStockDisplay();

  showToast(`${quantity} ${productName}(s) added to cart!`, "success");
  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartCount();
};

// Update stock display on page
function updateStockDisplay() {
  productCatalog.forEach((product) => {
    const stockSpan = document.querySelector(
      `[data-product-id="${product.id}"] .stock-count`
    );
    const quantityInput = document.getElementById(`qty-${product.id}`);
    const button = document.querySelector(
      `[data-product-id="${product.id}"] button`
    );

    if (stockSpan) {
      stockSpan.textContent = product.stock;
    }

    if (quantityInput) {
      quantityInput.max = product.stock;
      if (parseInt(quantityInput.value) > product.stock) {
        quantityInput.value = Math.max(1, product.stock);
      }
    }

    if (button) {
      if (product.stock === 0) {
        button.textContent = "Out of Stock";
        button.disabled = true;
        button.style.backgroundColor = "#ccc";
      } else {
        button.textContent = "Add to Cart";
        button.disabled = false;
        button.style.backgroundColor = "";
      }
    }
  });
}

// Update cart count
function updateCartCount() {
  const cartCountElement = document.getElementById("cart-count");
  if (cartCountElement) {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCountElement.textContent = totalItems;
  }
}

function loadCart() {
  cart = JSON.parse(localStorage.getItem("cart")) || [];
  updateCartCount();
}

// Clear cart function
window.clearCart = function () {
  if (confirm("Are you sure you want to clear your cart?")) {
    // Restore stock when clearing cart (do this BEFORE clearing cart)
    cart.forEach((item) => {
      const product = productCatalog.find((p) => p.id === item.productId);
      if (product) {
        product.stock += item.quantity;
      }
    });

    // Now clear the cart
    cart = [];
    localStorage.setItem("cart", JSON.stringify(cart));
    saveStock();
    updateStockDisplay();
    updateCartCount();
    showToast("Cart cleared!", "success");

    if (typeof displayCart === "function") {
      displayCart();
    }

    // Update cart display on current page if function exists
    if (typeof updateCartDisplay === "function") {
      updateCartDisplay();
    }
  }
};

// Remove item from cart
window.removeFromCart = function (productId) {
  const itemIndex = cart.findIndex((item) => item.productId === productId);
  if (itemIndex > -1) {
    const item = cart[itemIndex];

    // Restore stock
    const product = productCatalog.find((p) => p.id === productId);
    if (product) {
      product.stock += item.quantity;
      saveStock();
      updateStockDisplay();
    }

    cart.splice(itemIndex, 1);
    localStorage.setItem("cart", JSON.stringify(cart));
    updateCartCount();
    showToast("Item removed from cart!", "success");

    if (typeof displayCart === "function") {
      displayCart();
    }

    // Update cart display on current page if function exists
    if (typeof updateCartDisplay === "function") {
      updateCartDisplay();
    }
  }
};

// Update item quantity in cart
window.updateCartItemQuantity = function (productId, newQuantity) {
  const item = cart.find((item) => item.productId === productId);
  const product = productCatalog.find((p) => p.id === productId);

  if (!item || !product) return;

  const currentQuantity = item.quantity;
  const difference = newQuantity - currentQuantity;

  // Check if new quantity is available in stock
  if (difference > 0 && difference > product.stock) {
    showToast(`Only ${product.stock} more items available!`, "error");
    return false;
  }

  if (newQuantity <= 0) {
    removeFromCart(productId);
    return true;
  }

  // Update quantities
  item.quantity = newQuantity;
  product.stock -= difference;

  saveStock();
  updateStockDisplay();
  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartCount();

  // Update cart display if we're on the cart page
  if (typeof displayCart === "function") {
    displayCart();
  }

  // Update cart display on current page if function exists
  if (typeof updateCartDisplay === "function") {
    updateCartDisplay();
  }

  return true;
};

function displayCart() {
  const cartContainer = document.getElementById("cart-items");
  if (!cartContainer) return;

  cartContainer.innerHTML = "";

  if (cart.length === 0) {
    cartContainer.innerHTML = "<p>Your cart is empty.</p>";
    return;
  }

  let total = 0;
  cart.forEach((item) => {
    total += item.price * item.quantity;
    const itemElement = document.createElement("div");
    itemElement.className = "cart-item";
    itemElement.innerHTML = `
      <div class="cart-item-details">
        <img src="${item.image}" alt="${
      item.productName
    }" class="cart-item-image">
        <div>
          <h4>${item.productName}</h4>
          <p>₦${item.price.toLocaleString()}</p>
        </div>
      </div>
      <div class="cart-item-controls">
        <div class="quantity-controls">
          <button onclick="updateCartItemQuantity('${item.productId}', ${
      item.quantity - 1
    })">-</button>
          <span>${item.quantity}</span>
          <button onclick="updateCartItemQuantity('${item.productId}', ${
      item.quantity + 1
    })">+</button>
        </div>
        <p class="item-total">₦${(
          item.price * item.quantity
        ).toLocaleString()}</p>
        <button class="remove-btn" onclick="removeFromCart('${
          item.productId
        }')">Remove</button>
      </div>
    `;
    cartContainer.appendChild(itemElement);
  });

  const totalElement = document.createElement("div");
  totalElement.className = "cart-total";
  totalElement.innerHTML = `<h3>Total: ₦${total.toLocaleString()}</h3>`;
  cartContainer.appendChild(totalElement);
}

// Initialize when page loads
document.addEventListener("DOMContentLoaded", function () {
  loadStock();
  loadCart();
  updateStockDisplay();

  if (typeof displayCart === "function") {
    displayCart();
  }
});
