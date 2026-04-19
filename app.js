// ─── Configuration ───

const UNSPLASH_ACCESS_KEY = 'qKwQibZuaKVEoeuYCifumIW5YzTzvf1HTpKpEfvkVIo';
const STORAGE_KEY = 'dashboard';
const ARCHIVE_KEY = 'dashboard_archive';
const MAX_TODOS = 10;

// ─── State Management ───

function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDefaultState() {
  return {
    currentDate: getTodayString(),
    userName: null,
    oneThing: null,
    oneThingDone: false,
    cachedPhoto: null,
    cachedCoords: null,
    cachedWeather: null,
    todos: [],
    showTime: true,
    showTodos: true,
    cardOpacityOverride: { clock: null, todos: null },
    cardOpacityOverridePhotoUrl: null,
  };
}

const CARD_DEFAULT_OPACITY = { clock: 0.25, todos: 0.30 };
const CARD_CONTRAST_TARGET = { clock: 3.0, todos: 4.5 };
const CARD_SELECTOR = { clock: '#center-inner', todos: '#todo-section' };

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultState();
    const saved = JSON.parse(raw);
    const defaults = getDefaultState();
    const merged = { ...defaults, ...saved };
    merged.cardOpacityOverride = {
      ...defaults.cardOpacityOverride,
      ...(saved.cardOpacityOverride || {}),
    };
    return merged;
  } catch {
    return getDefaultState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function handleDayChange(newDate) {
  // Archive the current day's data before resetting
  const hasContent = state.oneThing || (state.todos && state.todos.length > 0);
  if (hasContent) {
    archiveDay(state.currentDate, {
      todos: [...state.todos],
      oneThing: state.oneThing,
      oneThingDone: state.oneThingDone,
    });
  }

  // Carry forward incomplete todos into the new day
  const carryOver = (state.todos || [])
    .filter(t => !t.done)
    .map(t => ({ id: Date.now() + Math.random(), text: t.text, done: false }));

  state.currentDate = newDate;
  state.oneThing = null;
  state.oneThingDone = false;
  state.cachedPhoto = null;
  state.todos = carryOver;
  state.cardOpacityOverride = { clock: null, todos: null };
  state.cardOpacityOverridePhotoUrl = null;
  viewingDate = newDate;
  saveState();
  loadDailyPhoto();
  initGreeting();
  initOneThing();
  renderTodos();
}

let state = loadState();
let viewingDate = getTodayString(); // runtime only, always starts on today

// ─── Archive Management ───

function loadArchive() {
  try {
    const raw = localStorage.getItem(ARCHIVE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveArchive(archive) {
  localStorage.setItem(ARCHIVE_KEY, JSON.stringify(archive));
}

function archiveDay(dateStr, data) {
  const archive = loadArchive();
  archive[dateStr] = data;
  saveArchive(archive);
}

function getArchivedDates() {
  const archive = loadArchive();
  return Object.keys(archive).sort();
}

function getArchivedDay(dateStr) {
  const archive = loadArchive();
  return archive[dateStr] || null;
}

function isViewingToday() {
  return viewingDate === getTodayString();
}

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

// ─── Greeting ───

function getTimeOfDayGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function initGreeting() {
  const section = document.getElementById('greeting-section');
  if (state.userName) {
    renderGreetingDisplay(section);
  } else {
    renderGreetingPrompt(section);
  }
}

function renderGreetingPrompt(container) {
  container.innerHTML = `
    <p class="greeting-prompt">What should we call you?</p>
    <input type="text" class="greeting-input" id="greeting-input" autocomplete="off">
  `;
  const input = document.getElementById('greeting-input');
  setTimeout(() => input.focus(), 100);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && input.value.trim()) {
      state.userName = input.value.trim();
      saveState();
      renderGreetingDisplay(container);
    }
  });
}

function renderGreetingDisplay(container) {
  const greeting = getTimeOfDayGreeting();
  container.innerHTML = `
    <p class="greeting-display" id="greeting-display" title="Click to edit name">${greeting}, ${escapeHtml(state.userName)}.</p>
  `;
  document.getElementById('greeting-display').addEventListener('click', () => {
    const prev = state.userName;
    state.userName = null;
    saveState();
    renderGreetingPrompt(container);
    const input = document.getElementById('greeting-input');
    if (input && prev) input.value = prev;
  });
}

// ─── Date Display ───

function updateDateDisplay() {
  const el = document.getElementById('date-display');
  const dateToShow = isViewingToday()
    ? new Date()
    : new Date(viewingDate + 'T12:00:00');
  el.textContent = dateToShow.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
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

  // Update greeting text (time-of-day may change)
  const greetingEl = document.getElementById('greeting-display');
  if (greetingEl && state.userName) {
    greetingEl.textContent = `${getTimeOfDayGreeting()}, ${state.userName}.`;
  }

  // Update date
  updateDateDisplay();

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

  // A new image invalidates previous user opacity overrides + auto values.
  // Compare against the photo URL the existing overrides were set for so
  // overrides survive a same-photo page reload but reset on refresh/new day.
  if (state.cardOpacityOverridePhotoUrl !== photo.url) {
    state.cardOpacityOverride = { clock: null, todos: null };
    state.cardOpacityOverridePhotoUrl = null;
    autoCardOpacity = { clock: null, todos: null };
    saveState();
    applyAllCardOpacities();
  }
  lastSampledPhotoUrl = photo.url;

  // Preload with CORS so we can also sample pixels on the same Image instance
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    bg.style.backgroundImage = `url(${photo.url})`;
    bg.classList.remove('fading');
    lastSampledImage = img;
    runAutoContrastFor(img);
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

// ─── Date Navigation ───

function navigateToPreviousDate() {
  const dates = getArchivedDates();
  for (let i = dates.length - 1; i >= 0; i--) {
    if (dates[i] < viewingDate) {
      viewingDate = dates[i];
      renderViewingState();
      return;
    }
  }
}

function navigateToNextDate() {
  const dates = getArchivedDates();
  const today = getTodayString();

  for (let i = 0; i < dates.length; i++) {
    if (dates[i] > viewingDate && dates[i] < today) {
      viewingDate = dates[i];
      renderViewingState();
      return;
    }
  }
  // No more archived dates before today — jump to today
  viewingDate = today;
  renderViewingState();
}

function navigateToToday() {
  viewingDate = getTodayString();
  renderViewingState();
}

function renderViewingState() {
  updateDateDisplay();
  initOneThing();
  renderTodos();
}

function formatViewingDate(dateStr) {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function renderDateNav() {
  const dates = getArchivedDates();
  const hasPrev = dates.some(d => d < viewingDate);
  const viewing = !isViewingToday();

  let html = '<div class="date-nav">';

  if (hasPrev) {
    html += `<button class="date-nav-btn" id="nav-prev" title="Previous day">&lsaquo;</button>`;
  }

  if (viewing) {
    html += `<span class="date-nav-label">${formatViewingDate(viewingDate)}</span>`;
    html += `<button class="date-nav-btn" id="nav-next" title="Next day">&rsaquo;</button>`;
    html += `<button class="date-nav-btn" id="nav-today" title="Back to today">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="13 19 22 12 13 5"></polyline>
        <polyline points="2 19 11 12 2 5"></polyline>
      </svg>
    </button>`;
  }

  html += '</div>';
  return html;
}

function bindDateNavEvents() {
  const prevBtn = document.getElementById('nav-prev');
  const nextBtn = document.getElementById('nav-next');
  const todayBtn = document.getElementById('nav-today');

  if (prevBtn) prevBtn.addEventListener('click', navigateToPreviousDate);
  if (nextBtn) nextBtn.addEventListener('click', navigateToNextDate);
  if (todayBtn) todayBtn.addEventListener('click', navigateToToday);
}

// ─── One Thing ───

function initOneThing() {
  const section = document.getElementById('one-thing-section');

  if (!isViewingToday()) {
    const archived = getArchivedDay(viewingDate);
    if (archived && archived.oneThing) {
      renderOneThingArchived(section, archived);
    } else {
      section.innerHTML = '';
    }
    return;
  }

  if (state.oneThing) {
    renderOneThingDisplay(section);
  } else {
    renderOneThingPrompt(section);
  }
}

function renderOneThingArchived(container, archived) {
  const doneClass = archived.oneThingDone ? 'done' : '';
  container.innerHTML = `
    <div class="one-thing-row ${doneClass}">
      <button class="one-thing-done-btn" disabled style="cursor: default;">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          ${archived.oneThingDone ? '<polyline points="9 12 11.5 14.5 16 9.5"></polyline>' : ''}
        </svg>
      </button>
      <p class="one-thing-display" style="cursor: default;">${escapeHtml(archived.oneThing)}</p>
    </div>
  `;
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
  const doneClass = state.oneThingDone ? 'done' : '';
  container.innerHTML = `
    <div class="one-thing-row ${doneClass}" id="one-thing-row">
      <button class="one-thing-done-btn" id="one-thing-done-btn" title="Mark as done">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          ${state.oneThingDone ? '<polyline points="9 12 11.5 14.5 16 9.5"></polyline>' : ''}
        </svg>
      </button>
      <p class="one-thing-display" id="one-thing-display" title="Click to edit">${escapeHtml(state.oneThing)}</p>
    </div>
  `;

  // Done button
  document.getElementById('one-thing-done-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    state.oneThingDone = !state.oneThingDone;
    saveState();
    renderOneThingDisplay(container);
    if (state.oneThingDone) {
      document.getElementById('one-thing-row').classList.add('just-completed');
    }
  });

  // Click text to re-edit (pre-fill old value)
  document.getElementById('one-thing-display').addEventListener('click', () => {
    const prev = state.oneThing;
    state.oneThing = null;
    state.oneThingDone = false;
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
  const content = document.getElementById('todo-content');
  const viewing = !isViewingToday();
  const archived = viewing ? getArchivedDay(viewingDate) : null;
  const todos = viewing ? (archived ? archived.todos : []) : state.todos;

  // If toggled off and viewing today, collapse
  if (!state.showTodos && !viewing) {
    section.classList.add('collapsed');
    return;
  }
  section.classList.remove('collapsed');

  if (viewing) {
    section.classList.add('viewing-archive');
  } else {
    section.classList.remove('viewing-archive');
  }

  let html = renderDateNav();

  // If no todos to show
  if (todos.length === 0) {
    if (viewing) {
      html += '<div class="todo-list"><p class="todo-empty-archive">No tasks this day.</p></div>';
    } else {
      html += `
        <div class="todo-list">
          <div class="todo-item">
            <input type="text" class="todo-add-input" id="todo-new-input" placeholder="+ Add a task" autocomplete="off">
          </div>
        </div>
      `;
    }
    content.innerHTML = html;
    if (!viewing) bindNewTodoInput();
    bindDateNavEvents();
    return;
  }

  // Collapse button (today only)
  if (!viewing) {
    html += '<div class="todo-header">';
    html += `<button class="todo-collapse" id="collapse-todos" title="Hide todos">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
    </button>`;
    html += '</div>';
  }

  html += '<ul class="todo-list">';

  todos.forEach((todo, i) => {
    if (viewing) {
      html += `
        <li class="todo-item ${todo.done ? 'done' : ''}">
          <input type="checkbox" class="todo-checkbox" ${todo.done ? 'checked' : ''} disabled>
          <span class="todo-text">${escapeHtml(todo.text)}</span>
        </li>
      `;
    } else {
      html += `
        <li class="todo-item ${todo.done ? 'done' : ''}">
          <input type="checkbox" class="todo-checkbox" ${todo.done ? 'checked' : ''} data-index="${i}">
          <span class="todo-text" data-index="${i}" title="Click to edit">${escapeHtml(todo.text)}</span>
          <button class="todo-remove" data-index="${i}">&times;</button>
        </li>
      `;
    }
  });

  if (!viewing && todos.length < MAX_TODOS) {
    html += `
      <li class="todo-item">
        <input type="text" class="todo-add-input" id="todo-new-input" placeholder="+ Add a task" autocomplete="off">
      </li>
    `;
  }

  html += '</ul>';
  content.innerHTML = html;

  // Bind events only for today view
  if (!viewing) {
    content.querySelectorAll('.todo-checkbox').forEach((cb) => {
      cb.addEventListener('change', (e) => {
        const idx = parseInt(e.target.dataset.index);
        state.todos[idx].done = e.target.checked;
        saveState();
        renderTodos();
      });
    });

    content.querySelectorAll('.todo-remove').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.closest('.todo-remove').dataset.index);
        state.todos.splice(idx, 1);
        saveState();
        renderTodos();
      });
    });

    content.querySelectorAll('.todo-text[data-index]').forEach((span) => {
      span.addEventListener('click', (e) => {
        const idx = parseInt(span.dataset.index);
        const li = span.closest('.todo-item');
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'todo-edit-input';
        input.value = state.todos[idx].text;
        span.replaceWith(input);
        input.focus();
        input.select();

        const save = () => {
          const val = input.value.trim();
          if (val) {
            state.todos[idx].text = val;
            saveState();
          }
          renderTodos();
        };
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') { e.preventDefault(); save(); }
          if (e.key === 'Escape') renderTodos();
        });
        input.addEventListener('blur', save);
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

  bindDateNavEvents();
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

// ─── Weather ───

const WEATHER_CACHE_MS = 30 * 60 * 1000; // 30 minutes

const WMO_DESCRIPTIONS = {
  0: 'Clear',
  1: 'Mostly Clear', 2: 'Partly Cloudy', 3: 'Overcast',
  45: 'Foggy', 48: 'Foggy',
  51: 'Light Drizzle', 53: 'Drizzle', 55: 'Heavy Drizzle',
  56: 'Freezing Drizzle', 57: 'Freezing Drizzle',
  61: 'Light Rain', 63: 'Rain', 65: 'Heavy Rain',
  66: 'Freezing Rain', 67: 'Freezing Rain',
  71: 'Light Snow', 73: 'Snow', 75: 'Heavy Snow',
  77: 'Snow Grains',
  80: 'Light Showers', 81: 'Showers', 82: 'Heavy Showers',
  85: 'Snow Showers', 86: 'Heavy Snow Showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm', 99: 'Thunderstorm',
};

function getWeatherDescription(code) {
  return WMO_DESCRIPTIONS[code] || 'Unknown';
}

function initWeather() {
  // If we have a fresh cache, render immediately
  if (state.cachedWeather && (Date.now() - state.cachedWeather.timestamp < WEATHER_CACHE_MS)) {
    renderWeather(state.cachedWeather);
  }

  // Use cached coords if available, otherwise request geolocation
  if (state.cachedCoords) {
    fetchWeather(state.cachedCoords.lat, state.cachedCoords.lng);
  } else if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        state.cachedCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        saveState();
        fetchWeather(state.cachedCoords.lat, state.cachedCoords.lng);
      },
      () => {
        // Permission denied or error — do nothing
      }
    );
  }
}

function fetchWeather(lat, lng) {
  // Skip fetch if cache is still fresh
  if (state.cachedWeather && (Date.now() - state.cachedWeather.timestamp < WEATHER_CACHE_MS)) {
    return;
  }

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code`;

  fetch(url)
    .then((r) => {
      if (!r.ok) throw new Error(`Weather API error: ${r.status}`);
      return r.json();
    })
    .then((data) => {
      const weather = {
        temp: Math.round(data.current.temperature_2m),
        code: data.current.weather_code,
        timestamp: Date.now(),
      };
      state.cachedWeather = weather;
      saveState();
      renderWeather(weather);
    })
    .catch(() => {
      // API failure — silently ignore
    });
}

function renderWeather(weather) {
  const el = document.getElementById('weather-display');
  const desc = getWeatherDescription(weather.code);
  el.textContent = `${weather.temp}° ${desc}`;
  el.classList.add('visible');
}

// ─── Per-card Opacity Control ───

let autoCardOpacity = { clock: null, todos: null };

function getCardElement(card) {
  return document.querySelector(CARD_SELECTOR[card]);
}

function getEffectiveOpacity(card) {
  const override = state.cardOpacityOverride[card];
  if (override !== null && override !== undefined) return override;
  if (autoCardOpacity[card] !== null) return autoCardOpacity[card];
  return CARD_DEFAULT_OPACITY[card];
}

function applyCardOpacity(card) {
  const el = getCardElement(card);
  if (!el) return;
  const value = getEffectiveOpacity(card);
  el.style.setProperty('--card-opacity', value.toFixed(3));
  const slider = el.querySelector('.opacity-slider');
  if (slider && document.activeElement !== slider) {
    slider.value = String(value);
  }
}

function applyAllCardOpacities() {
  Object.keys(CARD_SELECTOR).forEach(applyCardOpacity);
}

function initOpacityControls() {
  document.querySelectorAll('.opacity-control').forEach((control) => {
    const card = control.dataset.card;
    if (!card) return;
    const dial = control.querySelector('.opacity-dial');
    const slider = control.querySelector('.opacity-slider');

    slider.value = String(getEffectiveOpacity(card));

    dial.addEventListener('click', (e) => {
      e.stopPropagation();
      const wasExpanded = control.classList.contains('expanded');
      // Collapse all other open controls first
      document.querySelectorAll('.opacity-control.expanded').forEach((c) => {
        if (c !== control) c.classList.remove('expanded');
      });
      control.classList.toggle('expanded', !wasExpanded);
      if (!wasExpanded) {
        slider.value = String(getEffectiveOpacity(card));
      }
    });

    // Prevent collapse when clicking within the slider
    slider.addEventListener('click', (e) => e.stopPropagation());
    slider.addEventListener('mousedown', (e) => e.stopPropagation());

    slider.addEventListener('input', () => {
      const value = parseFloat(slider.value);
      state.cardOpacityOverride[card] = value;
      state.cardOpacityOverridePhotoUrl = lastSampledPhotoUrl
        || (state.cachedPhoto && state.cachedPhoto.url)
        || state.cardOpacityOverridePhotoUrl;
      saveState();
      applyCardOpacity(card);
    });

    // Double-click the dial to clear override and re-enable auto
    dial.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      state.cardOpacityOverride[card] = null;
      saveState();
      applyCardOpacity(card);
    });
  });

  // Click outside to collapse
  document.addEventListener('click', () => {
    document.querySelectorAll('.opacity-control.expanded').forEach((c) => {
      c.classList.remove('expanded');
    });
  });

  applyAllCardOpacities();
}

// ─── Auto-Contrast (WCAG luminance) ───

let lastSampledPhotoUrl = null;
let lastSampledImage = null;

function srgbToLinear(c) {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function relativeLuminance(r, g, b) {
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

function computeMinAlphaForContrast(rAvg, gAvg, bAvg, targetRatio) {
  // White text has L=1. Black overlay composited in sRGB space scales each
  // channel by (1 - alpha): p_eff = (1 - alpha) * p_img. The luminance
  // function is non-linear, so we search for the smallest alpha that
  // achieves the target contrast ratio against white.
  const maxAllowedL = 1.05 / targetRatio - 0.05;
  const baseL = relativeLuminance(rAvg, gAvg, bAvg);
  if (baseL <= maxAllowedL) return 0;
  let lo = 0;
  let hi = 0.95;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    const f = 1 - mid;
    const l = relativeLuminance(rAvg * f, gAvg * f, bAvg * f);
    if (l <= maxAllowedL) hi = mid;
    else lo = mid;
  }
  return hi;
}

function mapRectToImageCoords(rect, imgW, imgH, viewportW, viewportH) {
  // Mirrors background-size: cover, background-position: center
  const scale = Math.max(viewportW / imgW, viewportH / imgH);
  const drawnW = imgW * scale;
  const drawnH = imgH * scale;
  const offsetX = (viewportW - drawnW) / 2;
  const offsetY = (viewportH - drawnH) / 2;
  const sx = Math.max(0, (rect.left - offsetX) / scale);
  const sy = Math.max(0, (rect.top - offsetY) / scale);
  const sw = Math.min(imgW - sx, rect.width / scale);
  const sh = Math.min(imgH - sy, rect.height / scale);
  return { sx, sy, sw, sh };
}

function sampleAverageColor(img, rect) {
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;
  const { sx, sy, sw, sh } = mapRectToImageCoords(
    rect, img.naturalWidth, img.naturalHeight, viewportW, viewportH
  );
  if (sw <= 0 || sh <= 0) return null;

  // Downsample for speed: cap target canvas area
  const targetW = Math.max(8, Math.min(64, Math.round(sw / 16)));
  const targetH = Math.max(8, Math.min(64, Math.round(sh / 16)));

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  try {
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);
    const data = ctx.getImageData(0, 0, targetW, targetH).data;
    let r = 0, g = 0, b = 0, count = 0;
    for (let i = 0; i < data.length; i += 4) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      count++;
    }
    if (count === 0) return null;
    return { r: r / count, g: g / count, b: b / count };
  } catch (err) {
    // Tainted canvas (CORS) or other failure
    return null;
  }
}

function runAutoContrastFor(img) {
  if (!img || !img.complete || !img.naturalWidth) return;
  Object.keys(CARD_SELECTOR).forEach((card) => {
    const el = getCardElement(card);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const color = sampleAverageColor(img, rect);
    if (color === null) return;
    const alphaMin = computeMinAlphaForContrast(
      color.r, color.g, color.b, CARD_CONTRAST_TARGET[card]
    );
    autoCardOpacity[card] = Math.max(CARD_DEFAULT_OPACITY[card], alphaMin);
    applyCardOpacity(card);
  });
}

let resizeTimer = null;
function initContrastResize() {
  window.addEventListener('resize', () => {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (lastSampledImage) runAutoContrastFor(lastSampledImage);
    }, 150);
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
  initOpacityControls();
  initContrastResize();
  loadDailyPhoto();
  initGreeting();
  updateDateDisplay();
  initClock();
  initOneThing();
  initWeather();
  initTodos();
  initToggles();
});
