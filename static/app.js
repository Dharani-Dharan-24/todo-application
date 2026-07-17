const state = {
  token: localStorage.getItem("todos_token"),
  todos: [],
  filter: "all",
  search: "",
  sort: "priority",
  editingId: null,
};

const els = {
  authView: document.querySelector("#authView"),
  appView: document.querySelector("#appView"),
  sidebar: document.querySelector("#sidebar"),
  loginTab: document.querySelector("#loginTab"),
  signupTab: document.querySelector("#signupTab"),
  loginForm: document.querySelector("#loginForm"),
  signupForm: document.querySelector("#signupForm"),
  todoForm: document.querySelector("#todoForm"),
  todoGrid: document.querySelector("#todoGrid"),
  emptyState: document.querySelector("#emptyState"),
  toast: document.querySelector("#toast"),
  logoutBtn: document.querySelector("#logoutBtn"),
  searchInput: document.querySelector("#searchInput"),
  sortSelect: document.querySelector("#sortSelect"),
  progressText: document.querySelector("#progressText"),
  progressBar: document.querySelector("#progressBar"),
  profilePanel: document.querySelector("#profilePanel"),
  profileName: document.querySelector("#profileName"),
  profileMeta: document.querySelector("#profileMeta"),
  todayLabel: document.querySelector("#todayLabel"),
};

els.todayLabel.textContent = new Intl.DateTimeFormat("en", {
  weekday: "long",
  month: "short",
  day: "numeric",
}).format(new Date());

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.remove("hidden");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => els.toast.classList.add("hidden"), 2800);
}

async function api(path, options = {}) {
  const headers = options.headers ? { ...options.headers } : {};
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  if (options.body && !(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(path, { ...options, headers });
  if (response.status === 401) {
    logout("Session expired. Please sign in again.");
    throw new Error("Unauthorized");
  }
  if (!response.ok) {
    let detail = "Something went wrong.";
    try {
      const data = await response.json();
      detail = data.detail || detail;
    } catch (error) {
      detail = response.statusText || detail;
    }
    throw new Error(Array.isArray(detail) ? detail.map((item) => item.msg).join(", ") : detail);
  }
  if (response.status === 204) return null;
  return response.json();
}

function setAuthMode(mode) {
  const login = mode === "login";
  els.loginTab.classList.toggle("active", login);
  els.signupTab.classList.toggle("active", !login);
  els.loginForm.classList.toggle("hidden", !login);
  els.signupForm.classList.toggle("hidden", login);
}

function setSignedIn(signedIn) {
  document.body.classList.toggle("logged-out", !signedIn);
  els.sidebar.classList.toggle("hidden", !signedIn);
  els.authView.classList.toggle("hidden", signedIn);
  els.appView.classList.toggle("hidden", !signedIn);
  els.profilePanel.classList.toggle("hidden", !signedIn);
}

function formToObject(form) {
  return Object.fromEntries(new FormData(form).entries());
}

async function loadProfile() {
  const user = await api("/user/todo");
  els.profileName.textContent = `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username;
  els.profileMeta.textContent = user.username;
}

async function loadTodos() {
  state.todos = await api("/");
  renderTodos();
}

function visibleTodos() {
  const search = state.search.trim().toLowerCase();
  return state.todos
    .filter((todo) => {
      if (state.filter === "open") return !todo.complete;
      if (state.filter === "done") return todo.complete;
      return true;
    })
    .filter((todo) => {
      if (!search) return true;
      return `${todo.title} ${todo.description}`.toLowerCase().includes(search);
    })
    .sort((a, b) => {
      if (state.sort === "title") return a.title.localeCompare(b.title);
      if (state.sort === "status") return Number(a.complete) - Number(b.complete);
      return a.priority - b.priority;
    });
}

function updateProgress() {
  const total = state.todos.length;
  const done = state.todos.filter((todo) => todo.complete).length;
  const percent = total ? Math.round((done / total) * 100) : 0;
  els.progressText.textContent = `${percent}%`;
  els.progressBar.style.width = `${percent}%`;
}

function renderTodos() {
  updateProgress();
  const todos = visibleTodos();
  els.emptyState.classList.toggle("hidden", todos.length > 0);
  els.todoGrid.innerHTML = todos.map((todo) => renderTodo(todo)).join("");
}

function renderTodo(todo) {
  if (state.editingId === todo.id) {
    return `
      <article class="todo-card">
        <form class="edit-form" data-id="${todo.id}">
          <input name="title" minlength="3" value="${escapeHtml(todo.title)}" required />
          <input name="description" minlength="3" maxlength="60" value="${escapeHtml(todo.description)}" required />
          <select name="priority">
            ${[1, 2, 3, 4, 5].map((priority) => `<option value="${priority}" ${priority === todo.priority ? "selected" : ""}>Priority ${priority}</option>`).join("")}
          </select>
          <div class="actions">
            <button type="submit">Save</button>
            <button type="button" data-action="cancel" data-id="${todo.id}">Cancel</button>
            <button class="danger" type="button" data-action="delete" data-id="${todo.id}">Del</button>
          </div>
        </form>
      </article>
    `;
  }

  return `
    <article class="todo-card ${todo.complete ? "done" : ""}">
      <div class="todo-head">
        <h3>${escapeHtml(todo.title)}</h3>
        <span class="badge">Priority ${todo.priority}</span>
      </div>
      <p>${escapeHtml(todo.description)}</p>
      <div class="actions">
        <button type="button" data-action="toggle" data-id="${todo.id}">${todo.complete ? "Reopen" : "Complete"}</button>
        <button type="button" data-action="edit" data-id="${todo.id}">Edit</button>
        <button class="danger" type="button" data-action="delete" data-id="${todo.id}">Del</button>
      </div>
    </article>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function boot() {
  if (!state.token) {
    setSignedIn(false);
    return;
  }
  try {
    setSignedIn(true);
    await Promise.all([loadProfile(), loadTodos()]);
  } catch (error) {
    showToast(error.message);
  }
}

function logout(message = "Logged out.") {
  state.token = null;
  state.todos = [];
  localStorage.removeItem("todos_token");
  setSignedIn(false);
  renderTodos();
  showToast(message);
}

els.loginTab.addEventListener("click", () => setAuthMode("login"));
els.signupTab.addEventListener("click", () => setAuthMode("signup"));
els.logoutBtn.addEventListener("click", () => logout());

document.querySelectorAll(".password-toggle").forEach((button) => {
  button.addEventListener("click", () => {
    const input = button.parentElement.querySelector("input");
    const isHidden = input.type === "password";
    input.type = isHidden ? "text" : "password";
    button.textContent = isHidden ? "🙈" : "👁";
    button.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");
    button.setAttribute("title", isHidden ? "Hide password" : "Show password");
    input.focus();
  });
});

els.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(els.loginForm);
  try {
    const token = await api("/auth/token", {
      method: "POST",
      body: new URLSearchParams(data),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    state.token = token.access_token;
    localStorage.setItem("todos_token", state.token);
    els.loginForm.reset();
    await boot();
    showToast("Welcome back.");
  } catch (error) {
    showToast(error.message);
  }
});

els.signupForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = formToObject(els.signupForm);
  try {
    await api("/auth/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    els.signupForm.reset();
    setAuthMode("login");
    showToast("Account created. Sign in to continue.");
  } catch (error) {
    showToast(error.message);
  }
});

els.todoForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = formToObject(els.todoForm);
  payload.priority = Number(payload.priority);
  payload.complete = false;
  try {
    await api("/todo", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    els.todoForm.reset();
    await loadTodos();
    showToast("Task added.");
  } catch (error) {
    showToast(error.message);
  }
});

document.querySelectorAll(".filter").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".filter").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    state.filter = button.dataset.filter;
    renderTodos();
  });
});

els.searchInput.addEventListener("input", (event) => {
  state.search = event.target.value;
  renderTodos();
});

els.sortSelect.addEventListener("change", (event) => {
  state.sort = event.target.value;
  renderTodos();
});

els.todoGrid.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const id = Number(button.dataset.id);
  const todo = state.todos.find((item) => item.id === id);
  if (!todo && button.dataset.action !== "cancel") return;

  try {
    if (button.dataset.action === "edit") {
      state.editingId = id;
      renderTodos();
    }
    if (button.dataset.action === "cancel") {
      state.editingId = null;
      renderTodos();
    }
    if (button.dataset.action === "toggle") {
      await api(`/todo/${id}`, {
        method: "PUT",
        body: JSON.stringify({ ...todo, complete: !todo.complete }),
      });
      await loadTodos();
    }
    if (button.dataset.action === "delete") {
      await api(`/todo/${id}`, { method: "DELETE" });
      await loadTodos();
      showToast("Task deleted.");
    }
  } catch (error) {
    showToast(error.message);
  }
});

els.todoGrid.addEventListener("submit", async (event) => {
  const form = event.target.closest(".edit-form");
  if (!form) return;
  event.preventDefault();
  const id = Number(form.dataset.id);
  const todo = state.todos.find((item) => item.id === id);
  const payload = formToObject(form);
  payload.priority = Number(payload.priority);
  payload.complete = Boolean(todo.complete);

  try {
    await api(`/todo/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    state.editingId = null;
    await loadTodos();
    showToast("Task updated.");
  } catch (error) {
    showToast(error.message);
  }
});

boot();
