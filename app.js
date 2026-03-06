// ─── Configuration ───

const UNSPLASH_ACCESS_KEY = 'qKwQibZuaKVEoeuYCifumIW5YzTzvf1HTpKpEfvkVIo';
const STORAGE_KEY = 'dashboard';
const MAX_TODOS = 5;

// ─── State Management ───

function getTodayString() {
  return new Date().toISOString().slice(0, 10);
}

function getDefaultState() {
  return {
    currentDate: getTodayString(),
    oneThing: null,
    cachedPhoto: null,
    todos: [],
    showTime: true,
    showTodos: true,
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultState();
    const saved = JSON.parse(raw);
    // Merge with defaults so new fields are always present
    return { ...getDefaultState(), ...saved };
  } catch {
    return getDefaultState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function handleDayChange(newDate) {
  state.currentDate = newDate;
  state.oneThing = null;
  state.cachedPhoto = null;
  saveState();
  loadDailyPhoto();
  initOneThing();
}

let state = loadState();

// Check for day change on load
const today = getTodayString();
if (state.currentDate !== today) {
  handleDayChange(today);
}

// ─── Utility ───

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ─── Clock ───

function initClock() {
  updateClock();
  setInterval(updateClock, 1000);
}

function updateClock() {
  const clock = document.getElementById('clock');
  if (!state.showTime) {
    clock.classList.add('hidden');
    return;
  }
  clock.classList.remove('hidden');

  const now = new Date();
  const hours = now.getHours() % 12 || 12;
  const minutes = String(now.getMinutes()).padStart(2, '0');
  clock.textContent = `${hours}:${minutes}`;

  // Day change detection
  const currentDate = getTodayString();
  if (state.currentDate !== currentDate) {
    handleDayChange(currentDate);
  }
}

// ─── Background Photo ───

function loadDailyPhoto() {
  // Use cached photo if it's from today
  if (state.cachedPhoto && state.cachedPhoto.date === state.currentDate) {
    applyPhoto(state.cachedPhoto);
    return;
  }

  fetchNewPhoto();
}

function fetchNewPhoto() {
  const url = 'https://api.unsplash.com/photos/random?orientation=landscape&query=nature+landscape+scenic';

  fetch(url, {
    headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` },
  })
    .then((r) => {
      if (!r.ok) throw new Error(`Unsplash API error: ${r.status}`);
      return r.json();
    })
    .then((data) => {
      const photo = {
        url: data.urls.full + '&w=1920&q=80',
        thumb: data.urls.small,
        author: data.user.name,
        authorUrl: data.user.links.html,
        unsplashUrl: data.links.html,
        date: state.currentDate,
      };
      state.cachedPhoto = photo;
      saveState();
      applyPhoto(photo);
    })
    .catch(() => {
      // Fallback: nice gradient if API fails
      const bg = document.getElementById('bg');
      bg.style.background = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)';
    });
}

function applyPhoto(photo) {
  const bg = document.getElementById('bg');

  // Preload before showing
  const img = new Image();
  img.onload = () => {
    bg.style.backgroundImage = `url(${photo.url})`;
    bg.classList.remove('fading');
  };
  img.onerror = () => {
    bg.style.background = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)';
    bg.classList.remove('fading');
  };
  bg.classList.add('fading');
  img.src = photo.url;

  // Credit
  updatePhotoCredit(photo);
}

function updatePhotoCredit(photo) {
  const credit = document.getElementById('photo-credit');
  if (photo.author) {
    credit.innerHTML = `Photo by <a href="${photo.authorUrl}?utm_source=dashboard&utm_medium=referral" target="_blank">${escapeHtml(photo.author)}</a> on <a href="https://unsplash.com/?utm_source=dashboard&utm_medium=referral" target="_blank">Unsplash</a>`;
  }
}

function refreshPhoto() {
  state.cachedPhoto = null;
  saveState();
  fetchNewPhoto();
}

// ─── One Thing ───

function initOneThing() {
  const section = document.getElementById('one-thing-section');
  if (state.oneThing) {
    renderOneThingDisplay(section);
  } else {
    renderOneThingPrompt(section);
  }
}

function renderOneThingPrompt(container, prefill) {
  container.innerHTML = `
    <p class="one-thing-prompt">What is your one thing for today?</p>
    <input type="text" class="one-thing-input" id="one-thing-input" autocomplete="off">
  `;
  const input = document.getElementById('one-thing-input');
  if (prefill) input.value = prefill;
  // Don't steal focus if user might be interacting with todos
  setTimeout(() => input.focus(), 100);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && input.value.trim()) {
      state.oneThing = input.value.trim();
      saveState();
      renderOneThingDisplay(container);
    }
  });
}

function renderOneThingDisplay(container) {
  container.innerHTML = `
    <p class="one-thing-display" id="one-thing-display" title="Click to edit">${escapeHtml(state.oneThing)}</p>
  `;
  // Click to re-edit (pre-fill old value)
  document.getElementById('one-thing-display').addEventListener('click', () => {
    const prev = state.oneThing;
    state.oneThing = null;
    saveState();
    renderOneThingPrompt(container, prev);
  });
}

// ─── Todos ───

function initTodos() {
  renderTodos();
}

function renderTodos() {
  const section = document.getElementById('todo-section');

  // If toggled off, collapse
  if (!state.showTodos) {
    section.classList.add('collapsed');
    return;
  }
  section.classList.remove('collapsed');

  // If empty, show just the add input
  if (state.todos.length === 0) {
    section.innerHTML = `
      <div class="todo-list">
        <div class="todo-item">
          <input type="text" class="todo-add-input" id="todo-new-input" placeholder="+ Add a task" autocomplete="off">
        </div>
      </div>
    `;
    bindNewTodoInput();
    return;
  }

  let html = '<div class="todo-header">';
  html += `<button class="todo-collapse" id="collapse-todos" title="Hide todos">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  </button>`;
  html += '</div><ul class="todo-list">';

  state.todos.forEach((todo, i) => {
    html += `
      <li class="todo-item ${todo.done ? 'done' : ''}">
        <input type="checkbox" class="todo-checkbox" ${todo.done ? 'checked' : ''} data-index="${i}">
        <span class="todo-text">${escapeHtml(todo.text)}</span>
        <button class="todo-remove" data-index="${i}">&times;</button>
      </li>
    `;
  });

  if (state.todos.length < MAX_TODOS) {
    html += `
      <li class="todo-item">
        <input type="text" class="todo-add-input" id="todo-new-input" placeholder="+ Add a task" autocomplete="off">
      </li>
    `;
  }

  html += '</ul>';
  section.innerHTML = html;

  // Bind events
  section.querySelectorAll('.todo-checkbox').forEach((cb) => {
    cb.addEventListener('change', (e) => {
      const idx = parseInt(e.target.dataset.index);
      state.todos[idx].done = e.target.checked;
      saveState();
      renderTodos();
    });
  });

  section.querySelectorAll('.todo-remove').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.target.closest('.todo-remove').dataset.index);
      state.todos.splice(idx, 1);
      saveState();
      renderTodos();
    });
  });

  const collapseBtn = document.getElementById('collapse-todos');
  if (collapseBtn) {
    collapseBtn.addEventListener('click', () => {
      state.showTodos = false;
      saveState();
      renderTodos();
    });
  }

  bindNewTodoInput();
}

function bindNewTodoInput() {
  const newInput = document.getElementById('todo-new-input');
  if (!newInput) return;
  newInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && newInput.value.trim()) {
      state.todos.push({
        id: Date.now(),
        text: newInput.value.trim(),
        done: false,
      });
      saveState();
      renderTodos();
      // Re-focus the new input after re-render
      const next = document.getElementById('todo-new-input');
      if (next) next.focus();
    }
  });
}

// ─── Toggle Icons & Proximity Fade ───

function initToggles() {
  const topBar = document.getElementById('top-bar');

  // Proximity: show icons when mouse near top of screen
  document.addEventListener('mousemove', (e) => {
    if (e.clientY < 80) {
      topBar.classList.add('visible');
    } else {
      topBar.classList.remove('visible');
    }
  });

  // Toggle time
  document.getElementById('toggle-time').addEventListener('click', () => {
    state.showTime = !state.showTime;
    saveState();
    updateClock();
  });

  // Toggle todos
  document.getElementById('toggle-todos').addEventListener('click', () => {
    state.showTodos = !state.showTodos;
    saveState();
    renderTodos();
  });

  // Refresh photo
  document.getElementById('refresh-photo').addEventListener('click', refreshPhoto);
}

// ─── Initialize ───

document.addEventListener('DOMContentLoaded', () => {
  loadDailyPhoto();
  initClock();
  initOneThing();
  initTodos();
  initToggles();
});
