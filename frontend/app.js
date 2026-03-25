const API = "http://localhost:5000";
let currentUser = null;

// --- Core Functions ---
async function request(method, path, data = null) {
  const opts = {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  };
  if (data) opts.body = JSON.stringify(data);
  
  try {
    const res = await fetch(API + path, opts);
    const responseData = await res.json();
    if (!res.ok) {
      throw new Error(responseData.error || `HTTP error! status: ${res.status}`);
    }
    return responseData;
  } catch (error) {
    console.error("Request failed:", error);
    throw error; // Re-throw the error to be caught by the caller
  }
}

function checkAuth() {
  const user = localStorage.getItem("user");
  currentUser = user ? JSON.parse(user) : null;
  updateNavbar();
}

function updateNavbar() {
  const loginLink = document.getElementById("login-link");
  const logoutBtn = document.getElementById("logout-btn");
  const cartLink = document.getElementById("cart-link");
  
  if (currentUser) {
    loginLink?.classList.add("hidden");
    logoutBtn?.classList.remove("hidden");
    cartLink?.classList.remove("hidden");
  } else {
    loginLink?.classList.remove("hidden");
    logoutBtn?.classList.add("hidden");
    cartLink?.classList.add("hidden");
  }
}

// --- Page Initializers ---
function initProductsPage() {
    loadProducts();
}

// --- Auth Logic ---
async function login() {
  const email = document.getElementById("email")?.value;
  const password = document.getElementById("password")?.value;
  if (!email || !password) return alert("Email and password are required.");

  try {
    const data = await request("POST", "/api/login", { email, password });
    localStorage.setItem("user", JSON.stringify(data.user));
    window.location.href = "products.html";
  } catch (e) {
    alert(`Login Failed: ${e.message}`);
  }
}

async function signup() {
    const name = document.getElementById("name")?.value;
    const email = document.getElementById("email")?.value;
    const password = document.getElementById("password")?.value;
    const contact = document.getElementById("contact")?.value;
    const city = document.getElementById("city")?.value;
    const address = document.getElementById("address")?.value;

    if (!name || !email || !password) return alert("Name, Email, and Password are required.");

    try {
        await request("POST", "/api/register", { name, email, password, contact, city, address });
        alert("Registration successful! Please log in.");
        window.location.href = "login.html";
    } catch (e) {
        alert(`Registration Failed: ${e.message}`);
    }
}

async function logout() {
  try {
    await request("POST", "/api/logout");
  } catch (e) {
    console.error("Logout request failed, clearing session locally anyway.");
  }
  localStorage.removeItem("user");
  currentUser = null;
  window.location.href = "index.html";
}

// --- Product & Search Logic ---
async function loadProducts() {
  const productGrid = document.getElementById("products");
  if (!productGrid) return;
  productGrid.innerHTML = "<p>Loading products...</p>";
  try {
    const items = await request("GET", "/api/items");
    renderProducts(items);
  } catch (e) {
    productGrid.innerHTML = `<p class="error-message">Could not load products: ${e.message}</p>`;
  }
}

async function searchProducts() {
    const searchTerm = document.getElementById('search-input')?.value;
    const productGrid = document.getElementById("products");
    if (!productGrid) return;
    productGrid.innerHTML = `<p>Searching for "${searchTerm}"...</p>`;
    document.getElementById('products-heading').innerText = `Kết quả tìm kiếm cho "${searchTerm}"`;
    try {
        const items = await request("GET", `/api/items/search?q=${encodeURIComponent(searchTerm)}`);
        if (items.length === 0) {
            productGrid.innerHTML = `<p>No products found for "${searchTerm}".</p>`;
        } else {
            renderProducts(items);
        }
    } catch (e) {
        productGrid.innerHTML = `<p class="error-message">Search failed: ${e.message}</p>`;
    }
}

async function filterByCategory(categoryName) {
    const productGrid = document.getElementById("products");
    if (!productGrid) return;
    productGrid.innerHTML = `<p>Loading ${categoryName}...</p>`;
    document.getElementById('products-heading').innerText = `Sản phẩm: ${categoryName}`;
    try {
        const items = await request("GET", `/api/items/category/${categoryName}`);
        renderProducts(items);
    } catch (e) {
        productGrid.innerHTML = `<p class="error-message">Could not load products: ${e.message}</p>`;
    }
}

function renderProducts(items) {
    const productGrid = document.getElementById("products");
    if (!items || items.length === 0) {
        productGrid.innerHTML = "<p>No products available at the moment.</p>";
        return;
    }
    productGrid.innerHTML = items.map(item => `
      <div class="card">
        <div class="card-image">
          <img src="${API}${item.image_path}" alt="${item.name}" onerror="this.onerror=null;this.src='https://via.placeholder.com/250?text=Image+Not+Found';"/>
        </div>
        <div class="card-body">
          <div class="card-name">${item.name}</div>
          <div class="card-price">$${item.price.toLocaleString()}</div>
          ${currentUser ? 
            `<button onclick="addToCart(${item.id})">Thêm giỏ hàng</button>` : 
            '' // Hoàn toàn không hiển thị nút nếu chưa đăng nhập
          }
        </div>
      </div>
    `).join("");
}

function initCartPage() {
    loadCart();
}

// --- Cart Logic ---
async function loadCart() {
    const cartItemsContainer = document.getElementById("cart-items");
    if (!cartItemsContainer) return;
    cartItemsContainer.innerHTML = "<p>Loading cart...</p>";
    try {
        const items = await request("GET", "/api/cart");
        renderCart(items);
    } catch (e) {
        if (e.message.includes("Unauthorized")) {
            cartItemsContainer.innerHTML = '<p>Vui lòng <a href="login.html">đăng nhập</a> để xem giỏ hàng của bạn.</p>';
            document.getElementById("cart-summary").style.display = 'none';
        } else {
            cartItemsContainer.innerHTML = `<p class="error-message">Could not load cart: ${e.message}</p>`;
        }
    }
}

function renderCart(items) {
    const cartItemsContainer = document.getElementById("cart-items");
    const cartSummaryContainer = document.getElementById("cart-summary");

    if (!items || items.length === 0) {
        cartItemsContainer.innerHTML = '<div class="cart-empty"><div class="cart-empty-icon">🛒</div><p>Giỏ hàng của bạn trống</p><a href="products.html" class="btn mt-20">Tiếp tục mua sắm</a></div>';
        cartSummaryContainer.style.display = 'none';
        return;
    }
    cartSummaryContainer.style.display = 'block';

    let total = 0;
    cartItemsContainer.innerHTML = items.map(item => {
        total += item.price;
        return `
            <div class="cart-item">
                <img src="${API}${item.image_path}" alt="${item.name}" class="cart-item-image">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">$${item.price.toLocaleString()}</div>
                </div>
                <button class="cart-item-remove" onclick="removeFromCart(${item.id})">Xóa</button>
            </div>
        `;
    }).join("");

    cartSummaryContainer.innerHTML = `
        <div class="cart-summary">
            <h3>Tóm tắt đơn hàng</h3>
            <div class="summary-row">
                <span>Tạm tính</span>
                <span>$${total.toLocaleString()}</span>
            </div>
            <div class="summary-row total">
                <span>Tổng cộng</span>
                <span>$${total.toLocaleString()}</span>
            </div>
            <button class="checkout-btn" onclick="checkout()">Thanh toán</button>
        </div>
    `;
}

async function addToCart(itemId) {
  if (!currentUser) {
    alert("Please log in to add items to your cart.");
    return;
  }
  try {
    await request("POST", "/api/cart", { itemId });
    alert("Đã thêm sản phẩm vào giỏ hàng!");
  } catch (e) {
    alert(`Could not add to cart: ${e.message}`);
  }
}

async function removeFromCart(itemId) {
    if (!confirm("Bạn có chắc muốn xóa sản phẩm này khỏi giỏ hàng?")) return;
    try {
        await request("DELETE", `/api/cart/${itemId}`);
        loadCart(); // Refresh the cart view
    } catch (e) {
        alert(`Error removing item: ${e.message}`);
    }
}

async function checkout() {
    if (!confirm("Bạn có muốn tiến hành thanh toán không?")) return;
    try {
        const result = await request("POST", "/api/checkout");
        alert(result.message);
        window.location.href = "index.html";
    } catch (e) {
        alert(`Checkout failed: ${e.message}`);
    }
}

// --- Main Application Entry Point ---
function main() {
    checkAuth();

    const path = window.location.pathname;

    if (path.includes("products.html") || path === "/" || path.includes("index.html")) {
        initProductsPage();
    }
    
    if (path.includes("cart.html")) {
        initCartPage();
    }
}

document.addEventListener("DOMContentLoaded", main);
