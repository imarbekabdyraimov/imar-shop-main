const API_BASE_URL = "http://localhost:5000";

const tabLogin = document.getElementById("tab-login");
const tabRegister = document.getElementById("tab-register");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const loginError = document.getElementById("login-error");
const registerError = document.getElementById("register-error");

// Показывает сообщение под формой (ошибка или успех).
function showMessage(element, message, isSuccess = false) {
  element.textContent = message;
  element.classList.add("visible");
  element.classList.toggle("success", isSuccess);
}

// Скрывает сообщение под формой.
function hideMessage(element) {
  element.textContent = "";
  element.classList.remove("visible", "success");
}

// Переключает активную вкладку и соответствующую форму.
function switchTab(tabName) {
  const isLoginTab = tabName === "login";

  tabLogin.classList.toggle("active", isLoginTab);
  tabRegister.classList.toggle("active", !isLoginTab);

  tabLogin.setAttribute("aria-selected", String(isLoginTab));
  tabRegister.setAttribute("aria-selected", String(!isLoginTab));

  loginForm.hidden = !isLoginTab;
  registerForm.hidden = isLoginTab;

  // При переключении очищаем прошлые сообщения.
  hideMessage(loginError);
  hideMessage(registerError);
}

// Возвращает текст ошибки из ответа бэкенда или стандартный fallback.
function getErrorMessage(payload, fallbackText) {
  if (payload && typeof payload.message === "string" && payload.message.trim()) {
    return payload.message;
  }
  return fallbackText;
}

tabLogin.addEventListener("click", () => switchTab("login"));
tabRegister.addEventListener("click", () => switchTab("register"));

// Обработка формы входа.
loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideMessage(loginError);

  const username = loginForm.username.value.trim();
  const password = loginForm.password.value.trim();

  try {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      showMessage(loginError, getErrorMessage(data, "Ошибка входа"));
      return;
    }

    // Сохраняем пользователя в localStorage и переводим в кабинет.
    localStorage.setItem("user", JSON.stringify(data.user));
    window.location.href = "cabinet.html";
  } catch (error) {
    // Ошибка сети или недоступный сервер.
    showMessage(loginError, "Не удалось подключиться к серверу");
  }
});

// Обработка формы регистрации.
registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideMessage(registerError);

  const username = registerForm.username.value.trim();
  const email = registerForm.email.value.trim();
  const password = registerForm.password.value.trim();
  const passwordConfirm = registerForm.password_confirm.value.trim();

  // Клиентская проверка совпадения паролей.
  if (password !== passwordConfirm) {
    showMessage(registerError, "Пароли не совпадают");
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ username, email, password }),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      showMessage(registerError, getErrorMessage(data, "Ошибка регистрации"));
      return;
    }

    // После успешной регистрации возвращаем пользователя на вкладку входа.
    registerForm.reset();
    switchTab("login");
    showMessage(loginError, "Регистрация прошла успешно!", true);
  } catch (error) {
    // Ошибка сети или недоступный сервер.
    showMessage(registerError, "Не удалось подключиться к серверу");
  }
});
