const API_BASE_URL = "http://localhost:5000";

const headerActions = document.getElementById("header-actions");
const profileAvatar = document.getElementById("profile-avatar");
const profileName = document.getElementById("profile-name");
const profileEmail = document.getElementById("profile-email");
const logoutBtn = document.getElementById("logout-btn");

const cartList = document.getElementById("cart-list");
const cartEmpty = document.getElementById("cart-empty");
const cartTotal = document.getElementById("cart-total");
const checkoutBtn = document.getElementById("checkout-btn");
const orderToast = document.getElementById("order-toast");
const orderToastTotal = document.getElementById("order-toast-total");
const orderToastClose = document.getElementById("order-toast-close");

const toggleTestBlockBtn = document.getElementById("toggle-test-block");
const testBlock = document.getElementById("test-block");
const testItemForm = document.getElementById("test-item-form");
const testMessage = document.getElementById("test-message");

let currentUser = null;
let currentCartItems = [];
let toastTimer = null;

// Делает fetch к API с нужными заголовками и cookie-сессией.
async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    credentials: "include",
    ...options,
  });

  let data = null;
  try {
    data = await response.json();
  } catch (error) {
    data = null;
  }

  return { response, data };
}

// Форматирует сумму для отображения в корзине.
function formatPrice(value) {
  return `${Number(value).toFixed(2)} сом`;
}

// Показывает стилизованное уведомление после оформления заказа.
function showOrderToast(totalAmount) {
  orderToastTotal.textContent = formatPrice(totalAmount);
  orderToast.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    hideOrderToast();
  }, 3800);
}

// Скрывает уведомление заказа.
function hideOrderToast() {
  orderToast.classList.remove("show");
  clearTimeout(toastTimer);
}

// Возвращает первую букву имени для аватара-заглушки.
function getAvatarLetter(username) {
  if (!username || typeof username !== "string") {
    return "?";
  }
  return username.trim().charAt(0).toUpperCase() || "?";
}

// Обновляет правую часть хедера: показываем имя и ссылку на кабинет.
function renderHeaderUser(user) {
  headerActions.innerHTML = `
    <a href="cabinet.html" class="header__cabinet-link">
      <span class="header__avatar">${getAvatarLetter(user.username)}</span>
      <span>${user.username}</span>
    </a>
  `;
}

// Заполняет блок профиля данными текущего пользователя.
function renderProfile(user) {
  profileAvatar.textContent = getAvatarLetter(user.username);
  profileName.textContent = user.username;
  profileEmail.textContent = user.email;
}

// Рисует список товаров корзины и считает итоговую сумму.
function renderCart(items) {
  currentCartItems = items;
  cartList.innerHTML = "";

  if (!items.length) {
    cartEmpty.hidden = false;
    cartTotal.textContent = formatPrice(0);
    checkoutBtn.disabled = true;
    return;
  }

  cartEmpty.hidden = true;
  checkoutBtn.disabled = false;

  let total = 0;

  items.forEach((item) => {
    const itemTotal = Number(item.price) * Number(item.quantity);
    total += itemTotal;

    const row = document.createElement("article");
    row.className = "cart-item";
    row.innerHTML = `
      <div class="cart-item__name">${item.product_name}</div>
      <div class="cart-item__meta">Количество: ${item.quantity}</div>
      <div class="cart-item__meta">Цена: ${formatPrice(item.price)}</div>
      <button type="button" class="btn btn-danger btn-sm" data-remove-id="${item.id}">Удалить</button>
    `;
    cartList.appendChild(row);
  });

  cartTotal.textContent = formatPrice(total);
}

// Загружает корзину текущего пользователя с бэкенда.
async function loadCart() {
  const { response, data } = await apiRequest("/cart", { method: "GET" });
  if (!response.ok || !data || data.success === false) {
    renderCart([]);
    return;
  }

  renderCart(Array.isArray(data.items) ? data.items : []);
}

// Удаляет товар из корзины по id и обновляет список.
async function removeItem(itemId) {
  const { response } = await apiRequest(`/cart/remove/${itemId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    alert("Не удалось удалить товар");
    return;
  }

  await loadCart();
}

// Оформляет заказ: показывает alert и очищает корзину удалением каждого товара.
async function checkoutOrder() {
  if (!currentCartItems.length) {
    return;
  }

  const totalBeforeCheckout = currentCartItems.reduce(
    (sum, item) => sum + Number(item.price) * Number(item.quantity),
    0,
  );

  showOrderToast(totalBeforeCheckout);

  // Последовательно удаляем товары, чтобы сохранить предсказуемое поведение.
  for (const item of currentCartItems) {
    await apiRequest(`/cart/remove/${item.id}`, { method: "DELETE" });
  }

  await loadCart();
}

// Добавляет тестовый товар через форму внизу страницы.
async function addTestItem(event) {
  event.preventDefault();
  testMessage.textContent = "";

  const formData = new FormData(testItemForm);
  const productName = String(formData.get("product_name") || "").trim();
  const price = Number(formData.get("price"));
  const quantity = Number(formData.get("quantity"));

  if (!productName || Number.isNaN(price) || Number.isNaN(quantity) || quantity < 1 || price < 0) {
    testMessage.textContent = "Введите корректные данные товара";
    return;
  }

  const { response, data } = await apiRequest("/cart/add", {
    method: "POST",
    body: JSON.stringify({
      product_name: productName,
      price,
      quantity,
    }),
  });

  if (!response.ok || (data && data.success === false)) {
    testMessage.textContent = (data && data.message) || "Не удалось добавить товар";
    return;
  }

  testItemForm.reset();
  testMessage.textContent = "Товар добавлен";
  await loadCart();
}

// Выход пользователя: закрываем сессию, чистим localStorage и уходим на главную.
async function logout() {
  await apiRequest("/logout", { method: "POST" });
  localStorage.removeItem("user");
  window.location.href = "index.html";
}

// Проверяет авторизацию через /me и инициализирует страницу кабинета.
async function initCabinetPage() {
  const { response, data } = await apiRequest("/me", { method: "GET" });

  if (response.status === 401 || !response.ok || !data || data.success === false || !data.user) {
    window.location.href = "login.html";
    return;
  }

  currentUser = data.user;
  localStorage.setItem("user", JSON.stringify(currentUser));

  renderHeaderUser(currentUser);
  renderProfile(currentUser);
  await loadCart();
}

// Клик по кнопке удаления делегируем на контейнер списка корзины.
cartList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-remove-id]");
  if (!button) {
    return;
  }

  const itemId = Number(button.getAttribute("data-remove-id"));
  if (Number.isNaN(itemId)) {
    return;
  }

  await removeItem(itemId);
});

checkoutBtn.addEventListener("click", checkoutOrder);
logoutBtn.addEventListener("click", logout);
testItemForm.addEventListener("submit", addTestItem);

toggleTestBlockBtn.addEventListener("click", () => {
  testBlock.classList.toggle("visible");
});
orderToastClose.addEventListener("click", hideOrderToast);

initCabinetPage();
