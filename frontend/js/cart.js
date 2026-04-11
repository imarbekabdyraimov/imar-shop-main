/**
 * cart.js — Личный кабинет Imar mall
 * Отвечает за:
 *  - проверку авторизации через /me (редирект на login.html до отрисовки страницы)
 *  - отображение профиля пользователя
 *  - загрузку и отрисовку корзины
 *  - удаление товаров
 *  - оформление заказа (toast-уведомление + очистка корзины)
 *  - кнопку «Выйти»
 *  - обновление хедера (имя пользователя вместо «Войти»)
 */

"use strict";

/* ============================================================
   1. КОНСТАНТЫ И ССЫЛКИ НА DOM-ЭЛЕМЕНТЫ
   ============================================================ */

const API_BASE = "http://localhost:5000";

// Элементы хедера
const headerActions = document.getElementById("header-actions");

// Элементы блока профиля
const profileAvatar = document.getElementById("profile-avatar");
const profileName   = document.getElementById("profile-name");
const profileEmail  = document.getElementById("profile-email");
const logoutBtn     = document.getElementById("logout-btn");

// Элементы блока корзины
const cartList      = document.getElementById("cart-list");
const cartEmptyMsg  = document.getElementById("cart-empty-msg");
const cartTotal     = document.getElementById("cart-total");
const checkoutBtn   = document.getElementById("checkout-btn");

// Элементы toast-уведомления
const orderToast      = document.getElementById("order-toast");
const orderToastTotal = document.getElementById("order-toast-total");
const orderToastClose = document.getElementById("order-toast-close");

// Хранилище текущих товаров корзины (массив объектов)
let currentItems = [];

// Таймер авто-закрытия toast
let toastTimer = null;


/* ============================================================
   2. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
   ============================================================ */

/**
 * Универсальный fetch к API.
 * Всегда передаёт credentials: "include" для работы с cookie-сессией.
 * Возвращает { ok, status, data } — data уже распарсен из JSON (или null при ошибке).
 */
async function apiFetch(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    credentials: "include",
  });

  let data = null;
  try {
    data = await response.json();
  } catch (_) {
    // Тело ответа не является JSON — оставляем data = null
  }

  return { ok: response.ok, status: response.status, data };
}

/**
 * Форматирует числовое значение в строку «1 234,00 сом».
 */
function formatPrice(value) {
  return Number(value).toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " сом";
}

/**
 * Возвращает первую букву имени пользователя для аватара-заглушки.
 */
function getInitial(username) {
  return (username || "?").trim().charAt(0).toUpperCase() || "?";
}


/* ============================================================
   3. TOAST-УВЕДОМЛЕНИЕ
   ============================================================ */

/**
 * Показывает toast с итоговой суммой заказа.
 * Автоматически скрывается через 3,8 секунды.
 */
function showOrderToast(total) {
  orderToastTotal.textContent = formatPrice(total);

  // Сбрасываем класс, чтобы анимация прогресс-бара перезапустилась
  orderToast.classList.remove("show");

  // Небольшая пауза нужна, чтобы браузер успел применить сброс
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      orderToast.classList.add("show");
    });
  });

  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideOrderToast, 3800);
}

/**
 * Скрывает toast.
 */
function hideOrderToast() {
  orderToast.classList.remove("show");
  clearTimeout(toastTimer);
}

// Кнопка «✕» внутри toast
orderToastClose.addEventListener("click", hideOrderToast);


/* ============================================================
   4. ХЕДЕР — отображение имени пользователя
   ============================================================ */

/**
 * Заменяет кнопку «Войти» на ссылку с именем авторизованного пользователя.
 */
function renderHeaderUser(user) {
  headerActions.innerHTML = `
    <a href="cabinet.html" class="header__cabinet-link">
      <span class="header__avatar">${getInitial(user.username)}</span>
      <span>${user.username}</span>
    </a>
  `;
}


/* ============================================================
   5. БЛОК ПРОФИЛЯ
   ============================================================ */

/**
 * Заполняет блок профиля: аватар-буква, имя, e-mail.
 */
function renderProfile(user) {
  profileAvatar.textContent = getInitial(user.username);
  profileName.textContent   = user.username;
  profileEmail.textContent  = user.email;
}


/* ============================================================
   6. КОРЗИНА — отрисовка
   ============================================================ */

/**
 * Отрисовывает список товаров корзины в DOM.
 * Каждая строка: название | количество | цена/шт | итого | удалить.
 * Если массив пуст — показывает сообщение «Корзина пуста».
 * Обновляет итоговую сумму и активность кнопки «Оформить заказ».
 */
function renderCart(items) {
  currentItems   = items;
  cartList.innerHTML = "";

  if (!items.length) {
    // Корзина пустая
    cartEmptyMsg.hidden    = false;
    cartTotal.textContent  = formatPrice(0);
    checkoutBtn.disabled   = true;
    return;
  }

  // Корзина не пустая — скрываем сообщение-заглушку
  cartEmptyMsg.hidden  = true;
  checkoutBtn.disabled = false;

  let totalSum = 0;

  items.forEach((item) => {
    const itemTotal = Number(item.price) * Number(item.quantity);
    totalSum += itemTotal;

    // Создаём строку товара
    const row = document.createElement("article");
    row.className = "cart-item";
    row.innerHTML = `
      <div class="cart-item__name">${escapeHtml(item.product_name)}</div>
      <div class="cart-item__cell">
        Кол-во:&nbsp;<strong>${item.quantity}</strong>
      </div>
      <div class="cart-item__cell">
        Цена:&nbsp;<strong>${formatPrice(item.price)}</strong>
      </div>
      <div class="cart-item__cell">
        Итого:&nbsp;<strong>${formatPrice(itemTotal)}</strong>
      </div>
      <button
        type="button"
        class="btn btn-danger btn-sm"
        data-remove-id="${item.id}"
        aria-label="Удалить «${escapeHtml(item.product_name)}»"
      >
        Удалить
      </button>
    `;
    cartList.appendChild(row);
  });

  cartTotal.textContent = formatPrice(totalSum);
}

/**
 * Экранирует спецсимволы HTML чтобы избежать XSS при вставке данных в innerHTML.
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}


/* ============================================================
   7. КОРЗИНА — загрузка с сервера
   ============================================================ */

/**
 * Делает GET /cart и передаёт полученный массив в renderCart().
 */
async function loadCart() {
  const { ok, data } = await apiFetch("/cart");

  if (!ok || !data || !Array.isArray(data.items)) {
    renderCart([]);
    return;
  }

  renderCart(data.items);
}


/* ============================================================
   8. УДАЛЕНИЕ ТОВАРА
   ============================================================ */

/**
 * Делает DELETE /cart/remove/<id> и при успехе перезагружает корзину.
 * Не перезагружает всю страницу.
 */
async function removeItem(itemId) {
  const { ok } = await apiFetch(`/cart/remove/${itemId}`, {
    method: "DELETE",
  });

  if (!ok) {
    // Сообщаем об ошибке без alert — просто выводим в консоль
    console.error(`Не удалось удалить товар id=${itemId}`);
    return;
  }

  // Перезагружаем корзину из API, чтобы данные всегда были актуальными
  await loadCart();
}

/**
 * Делегируем клики кнопок «Удалить» на родительский контейнер списка.
 * Это позволяет не навешивать обработчики на каждую кнопку отдельно.
 */
cartList.addEventListener("click", async (event) => {
  const btn = event.target.closest("[data-remove-id]");
  if (!btn) return;

  const id = parseInt(btn.getAttribute("data-remove-id"), 10);
  if (isNaN(id)) return;

  // Блокируем кнопку на время запроса, чтобы избежать двойного клика
  btn.disabled = true;
  btn.textContent = "…";

  await removeItem(id);
});


/* ============================================================
   9. ОФОРМЛЕНИЕ ЗАКАЗА
   ============================================================ */

/**
 * При нажатии «Оформить заказ»:
 *  1. Запоминаем итоговую сумму.
 *  2. Показываем toast.
 *  3. Последовательно удаляем каждый товар через API.
 *  4. Перерисовываем пустую корзину.
 */
checkoutBtn.addEventListener("click", async () => {
  if (!currentItems.length) return;

  // Считаем итоговую сумму из текущего состояния
  const total = currentItems.reduce(
    (sum, item) => sum + Number(item.price) * Number(item.quantity),
    0
  );

  // Показываем toast
  showOrderToast(total);

  // Удаляем все товары по одному — предсказуемо и надёжно
  for (const item of currentItems) {
    await apiFetch(`/cart/remove/${item.id}`, { method: "DELETE" });
  }

  // Обновляем отображение корзины
  await loadCart();
});


/* ============================================================
   10. ВЫХОД
   ============================================================ */

/**
 * POST /logout → очистить localStorage → перейти на index.html.
 */
logoutBtn.addEventListener("click", async () => {
  await apiFetch("/logout", { method: "POST" });
  localStorage.removeItem("user");
  window.location.href = "index.html";
});


/* ============================================================
   11. ИНИЦИАЛИЗАЦИЯ СТРАНИЦЫ
   ============================================================ */

/**
 * Точка входа. Вызывается сразу при загрузке скрипта.
 *
 * Порядок действий:
 *  1. GET /me — проверяем авторизацию.
 *  2. Если ответ 401 → немедленный redirect на login.html
 *     (страница ещё скрыта через visibility:hidden, поэтому «мигания» нет).
 *  3. Если авторизованы → делаем страницу видимой, рисуем профиль и корзину.
 */
async function init() {
  const { ok, status, data } = await apiFetch("/me");

  // Пользователь не авторизован — уходим до показа страницы
  if (status === 401 || !ok || !data?.user) {
    window.location.replace("login.html");
    return; // дальнейший код не выполняется
  }

  // Авторизация подтверждена — раскрываем страницу пользователю
  document.documentElement.style.visibility = "visible";

  const user = data.user;

  // Сохраняем актуальные данные пользователя в localStorage
  localStorage.setItem("user", JSON.stringify(user));

  // Обновляем хедер и блок профиля
  renderHeaderUser(user);
  renderProfile(user);

  // Загружаем корзину
  await loadCart();
}

// Запускаем инициализацию
init();
