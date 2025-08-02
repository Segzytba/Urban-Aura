// Product data with images from the workspace
const products = [
    {
        id: 1,
        name: "Black Blaze Flow Tee",
        price: 15000,
        image: "images/Black Blaze Flow Tee.jpg",
        description: "Premium black streetwear tee with modern flow design"
    },
    {
        id: 2,
        name: "Black Drift Tee",
        price: 14000,
        image: "images/Black Drift Tee.jpg",
        description: "Casual black tee with drift-inspired graphics"
    },
    {
        id: 3,
        name: "Brown Drift Tee",
        price: 14000,
        image: "images/Brown Drift Tee.jpg",
        description: "Earthy brown tee with urban drift design"
    },
    {
        id: 4,
        name: "Cream Blaze Flow Tee",
        price: 15000,
        image: "images/Cream Blaze Flow Tee.jpg",
        description: "Elegant cream tee with blaze flow pattern"
    },
    {
        id: 5,
        name: "Green Aura Tank Top",
        price: 12000,
        image: "images/Green Aura Tank Top.jpg",
        description: "Fresh green tank top with aura vibes"
    },
    {
        id: 6,
        name: "Green Drift Tee",
        price: 14000,
        image: "images/Green Drift Tee.jpg",
        description: "Vibrant green tee with drift aesthetics"
    },
    {
        id: 7,
        name: "Pink Blaze Flow Tee",
        price: 15000,
        image: "images/Pink Blaze Flow Tee.jpg",
        description: "Bold pink tee with signature blaze flow design"
    }
];

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

// Cart management functions
function getCart() {
    return JSON.parse(localStorage.getItem('cart')) || [];
}

function saveCart(cart) {
    localStorage.setItem('cart', JSON.stringify(cart));
}

function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const cart = getCart();
    const existingItem = cart.find(item => item.id === productId);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            quantity: 1
        });
    }

    saveCart(cart);
    updateCartCount();
    showToast(`${product.name} added to cart!`);

    // Add visual feedback to the button
    const button = document.querySelector(`button[onclick="addToCart(${productId})"]`);
    if (button) {
        const originalText = button.textContent;
        button.textContent = 'Added!';
        button.style.backgroundColor = '#28a745';
        setTimeout(() => {
            button.textContent = originalText;
            button.style.backgroundColor = '';
        }, 1000);
    }
}

function removeFromCart(productId) {
    const cart = getCart();
    const updatedCart = cart.filter(item => item.id !== productId);
    saveCart(updatedCart);
    updateCartCount();
    loadCartItems(); // Refresh cart display
    showToast('Item removed from cart');
}

function updateQuantity(productId, newQuantity) {
    if (newQuantity <= 0) {
        removeFromCart(productId);
        return;
    }

    const cart = getCart();
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.quantity = newQuantity;
        saveCart(cart);
        updateCartCount();
        loadCartItems(); // Refresh cart display
    }
}

function clearCart() {
    localStorage.removeItem('cart');
    updateCartCount();
    loadCartItems();
    showToast('Cart cleared');
}

function updateCartCount() {
    const cart = getCart();
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

    // Update all cart count elements
    const cartCountElements = document.querySelectorAll('#cart-count, #cart-icon-count');
    cartCountElements.forEach(element => {
        if (element) element.textContent = totalItems;
    });
}

// Product display functions
function loadProducts() {
    const container = document.getElementById('products-container');
    if (!container) return;

    container.innerHTML = '';

    products.forEach(product => {
        const productDiv = document.createElement('div');
        productDiv.className = 'product';
        productDiv.innerHTML = `
            <img src="${product.image}" alt="${product.name}" onerror="this.src='images/URBAN AURA.jpg'">
            <h3>${product.name}</h3>
            <p>${product.description}</p>
            <p class="price">₦${product.price.toLocaleString()}</p>
            <button onclick="addToCart(${product.id})" class="add-to-cart-btn">Add to Cart</button>
        `;
        container.appendChild(productDiv);
    });
}

// Cart display functions
function loadCartItems() {
    const container = document.getElementById('cart-items-container');
    if (!container) return;

    const cart = getCart();

    if (cart.length === 0) {
        container.innerHTML = `
            <div class="empty-cart">
                <h3>Your cart is empty</h3>
                <p>Browse our collection and add some items!</p>
                <a href="shop.html" class="shop-link">Continue Shopping</a>
            </div>
        `;
        updateCartSummary(0, 0);
        return;
    }

    container.innerHTML = '';

    cart.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'cart-item';
        itemDiv.innerHTML = `
            <img src="${item.image}" alt="${item.name}" onerror="this.src='images/URBAN AURA.jpg'">
            <div class="cart-item-details">
                <h4>${item.name}</h4>
                <p class="cart-item-price">₦${item.price.toLocaleString()}</p>
                <div class="quantity-controls">
                    <button onclick="updateQuantity(${item.id}, ${item.quantity - 1})">-</button>
                    <span class="quantity">${item.quantity}</span>
                    <button onclick="updateQuantity(${item.id}, ${item.quantity + 1})">+</button>
                </div>
                <p class="cart-item-total">Total: ₦${(item.price * item.quantity).toLocaleString()}</p>
            </div>
            <button onclick="removeFromCart(${item.id})" class="remove-btn">Remove</button>
        `;
        container.appendChild(itemDiv);
    });

    // Update cart summary
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    updateCartSummary(totalItems, totalPrice);
}

function updateCartSummary(totalItems, totalPrice) {
    const totalItemsElement = document.getElementById('total-items');
    const totalPriceElement = document.getElementById('total-price');

    if (totalItemsElement) totalItemsElement.textContent = totalItems;
    if (totalPriceElement) totalPriceElement.textContent = totalPrice.toLocaleString();
}

// Toast notification functions
function showToast(message) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');

    if (toast && toastMessage) {
        toastMessage.textContent = message;
        toast.classList.add('toast-show');

        // Auto-hide after 3 seconds
        setTimeout(() => {
            toast.classList.remove('toast-show');
        }, 3000);
    }
}

function closeToast() {
    const toast = document.getElementById('toast');
    if (toast) {
        toast.classList.remove('toast-show');
    }
}

// Checkout function
function proceedToCheckout() {
    const cart = getCart();
    if (cart.length === 0) {
        showToast('Your cart is empty!');
        return;
    }

    // You can redirect to checkout page or integrate with payment gateway
    showToast('Redirecting to checkout...');
    setTimeout(() => {
        window.location.href = 'checkout.html';
    }, 1000);
}

// Initialize when page loads
document.addEventListener("DOMContentLoaded", function () {
  loadStock();
  loadCart();
  updateStockDisplay();
  loadProducts();

  if (typeof displayCart === "function") {
    displayCart();
  }

  // Initialize cart count
  updateCartCount();

  // Add click event to floating cart if it exists
  const floatingCart = document.getElementById('cart-floating');
  if (floatingCart && !floatingCart.onclick) {
    floatingCart.onclick = function() {
      window.location.href = 'cart.html';
    };
  }
});
