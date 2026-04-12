/**
 * Обновляет кнопку «Войти» в шапке по localStorage и GET /me.
 * Подключайте на страницах с <a href="login.html" class="btn-login" id="headerAuthBtn">.
 */
(function () {
  "use strict";

  const API_BASE = "http://localhost:5000";

  const btn = document.getElementById("headerAuthBtn");
  if (!btn) return;

  function renderHeaderUser(user) {
    btn.href = "cabinet.html";
    const initial = (user.username || "?").trim().charAt(0).toUpperCase() || "?";
    btn.innerHTML =
      '<span class="header__avatar">' + initial + "</span>&nbsp;" + user.username;
    btn.className = "header__cabinet-link";
  }

  function renderHeaderGuest() {
    btn.href = "login.html";
    btn.textContent = "Войти";
    btn.className = "btn-login";
  }

  const cached = localStorage.getItem("user");
  if (cached) {
    try {
      renderHeaderUser(JSON.parse(cached));
    } catch (_) {}
  }

  fetch(API_BASE + "/me", { credentials: "include" })
    .then(function (r) {
      if (!r.ok) {
        localStorage.removeItem("user");
        renderHeaderGuest();
        return null;
      }
      return r.json();
    })
    .then(function (data) {
      if (data && data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
        renderHeaderUser(data.user);
      }
    })
    .catch(function () {});
})();
