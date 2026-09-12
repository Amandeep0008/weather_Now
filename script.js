// WeatherNow
// Uses Open-Meteo's free Geocoding + Forecast APIs (no API key required).

const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const RECENT_KEY = "weathernow_recent_cities";
const LAST_CITY_KEY = "weathernow_last_city";
const MAX_RECENT = 5;
const SUGGESTION_DEBOUNCE_MS = 300;

// --- Weather code -> category, description, theme ---
// Open-Meteo returns a numeric WMO code; everything else is derived from it.
const CODE_INFO = {
  0: { desc: "clear sky", category: "clear", theme: "clear" },
  1: { desc: "mainly clear", category: "partly", theme: "clear" },
  2: { desc: "partly cloudy", category: "partly", theme: "cloudy" },
  3: { desc: "overcast", category: "cloudy", theme: "cloudy" },
  45: { desc: "fog", category: "fog", theme: "fog" },
  48: { desc: "depositing rime fog", category: "fog", theme: "fog" },
  51: { desc: "light drizzle", category: "rain", theme: "rain" },
  53: { desc: "moderate drizzle", category: "rain", theme: "rain" },
  55: { desc: "dense drizzle", category: "rain", theme: "rain" },
  61: { desc: "slight rain", category: "rain", theme: "rain" },
  63: { desc: "moderate rain", category: "rain", theme: "rain" },
  65: { desc: "heavy rain", category: "rain", theme: "rain" },
  71: { desc: "slight snow", category: "snow", theme: "snow" },
  73: { desc: "moderate snow", category: "snow", theme: "snow" },
  75: { desc: "heavy snow", category: "snow", theme: "snow" },
  80: { desc: "rain showers", category: "rain", theme: "rain" },
  81: { desc: "heavy rain showers", category: "rain", theme: "rain" },
  82: { desc: "violent rain showers", category: "rain", theme: "rain" },
  95: { desc: "thunderstorm", category: "storm", theme: "storm" },
  96: { desc: "thunderstorm with hail", category: "storm", theme: "storm" },
  99: { desc: "severe thunderstorm", category: "storm", theme: "storm" },
};

function describeWeatherCode(code) {
  return CODE_INFO[code] || { desc: "unknown", category: "cloudy", theme: "cloudy" };
}

// --- Hand-drawn line icon set (one visual language, no external icon libs) ---
const ICONS = {
  clear: `<circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>`,
  partly: `<circle cx="8" cy="7" r="3"/><line x1="8" y1="1.6" x2="8" y2="2.8"/><line x1="3.6" y1="4.6" x2="4.4" y2="5.4"/><path d="M8 19a4.5 4.5 0 0 1-.5-8.97 5.9 5.9 0 0 1 1.2.13A6 6 0 0 1 19 10.5 4.5 4.5 0 0 1 18.5 19H8Z"/>`,
  cloudy: `<path d="M7 18a4.5 4.5 0 0 1-.5-8.97A6 6 0 0 1 18 9.5 4.5 4.5 0 0 1 17.5 18H7Z"/>`,
  fog: `<path d="M7 12.5a4 4 0 0 1-.4-7.97A5.5 5.5 0 0 1 17 6.5"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="5" y1="19" x2="19" y2="19"/>`,
  rain: `<path d="M7 15a4.5 4.5 0 0 1-.5-8.97A6 6 0 0 1 18 7.5 4.5 4.5 0 0 1 17.5 15H7Z"/><line x1="8" y1="18" x2="7" y2="21"/><line x1="12" y1="18" x2="11" y2="21"/><line x1="16" y1="18" x2="15" y2="21"/>`,
  snow: `<path d="M7 14a4.5 4.5 0 0 1-.5-8.97A6 6 0 0 1 18 6.5 4.5 4.5 0 0 1 17.5 14H7Z"/><line x1="8" y1="18" x2="8" y2="18.01"/><line x1="12" y1="19.4" x2="12" y2="19.41"/><line x1="16" y1="18" x2="16" y2="18.01"/><line x1="8" y1="21" x2="8" y2="21.01"/><line x1="16" y1="21" x2="16" y2="21.01"/>`,
  storm: `<path d="M7 13a4.5 4.5 0 0 1-.5-8.97A6 6 0 0 1 18 5.5 4.5 4.5 0 0 1 17.5 13H7Z"/><path d="M13 13l-3 5h3l-2 4"/>`,
};

function iconSvg(category) {
  const inner = ICONS[category] || ICONS.cloudy;
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
}

// --- DOM references ---
const form = document.getElementById("search-form");
const cityInput = document.getElementById("city-input");
const suggestionsEl = document.getElementById("suggestions");
const statusMessage = document.getElementById("status-message");

const currentWeatherSection = document.getElementById("current-weather");
const locationName = document.getElementById("location-name");
const locationTime = document.getElementById("location-time");
const currentIcon = document.getElementById("current-icon");
const currentTemp = document.getElementById("current-temp");
const currentDesc = document.getElementById("current-desc");
const feelsLike = document.getElementById("feels-like");
const humidity = document.getElementById("humidity");
const wind = document.getElementById("wind");

const forecastSection = document.getElementById("forecast");
const forecastList = document.getElementById("forecast-list");

const recentCitiesEl = document.getElementById("recent-cities");

// --- Status helpers ---
function setStatus(message, type = "") {
  statusMessage.textContent = message;
  statusMessage.className = "status-message" + (type ? ` ${type}` : "");
}

function clearStatus() {
  setStatus("");
}

function setTheme(themeName) {
  document.body.className = `theme-${themeName || "default"}`;
}

// --- localStorage: recent city history ---
function getRecentCities() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY)) || [];
  } catch {
    return [];
  }
}

function saveRecentCity(name) {
  let recent = getRecentCities().filter(
    (c) => c.toLowerCase() !== name.toLowerCase()
  );
  recent.unshift(name);
  recent = recent.slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
  renderRecentCities();
}

function renderRecentCities() {
  const recent = getRecentCities();
  recentCitiesEl.innerHTML = "";
  recent.forEach((city) => {
    const chip = document.createElement("span");
    chip.className = "recent-chip";
    chip.textContent = city;
    chip.addEventListener("click", () => {
      cityInput.value = city;
      loadWeatherForCity(city);
    });
    recentCitiesEl.appendChild(chip);
  });
}

// --- Geocoding: city name -> lat/lon (single best match, used on submit) ---
async function geocodeCity(city) {
  const url = `${GEOCODE_URL}?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Geocoding service unavailable. Please try again.");
  }

  const data = await response.json();

  if (!data.results || data.results.length === 0) {
    throw new Error(`Couldn't find "${city}". Check the spelling and try again.`);
  }

  const match = data.results[0];
  return {
    name: match.name,
    country: match.country,
    latitude: match.latitude,
    longitude: match.longitude,
    timezone: match.timezone,
  };
}

// --- Geocoding: multiple matches, used for the live autocomplete dropdown ---
async function fetchSuggestions(query) {
  const url = `${GEOCODE_URL}?name=${encodeURIComponent(query)}&count=5&language=en&format=json`;
  const response = await fetch(url);
  if (!response.ok) return [];
  const data = await response.json();
  return data.results || [];
}

// --- Forecast: lat/lon -> current + 5-day weather ---
async function fetchForecast(latitude, longitude, timezone) {
  const params = new URLSearchParams({
    latitude,
    longitude,
    timezone: timezone || "auto",
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m",
    daily: "weather_code,temperature_2m_max,temperature_2m_min",
    forecast_days: 5,
  });

  const response = await fetch(`${FORECAST_URL}?${params.toString()}`);

  if (!response.ok) {
    throw new Error("Weather service unavailable. Please try again shortly.");
  }

  return response.json();
}

// --- Rendering ---
function renderCurrentWeather(location, data) {
  const { current } = data;
  const info = describeWeatherCode(current.weather_code);

  locationName.textContent = `${location.name}${location.country ? ", " + location.country : ""}`;
  locationTime.textContent = new Date(current.time).toLocaleString(undefined, {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  currentIcon.innerHTML = iconSvg(info.category);
  currentTemp.textContent = `${Math.round(current.temperature_2m)}°C`;
  currentDesc.textContent = info.desc;
  feelsLike.textContent = `${Math.round(current.apparent_temperature)}°C`;
  humidity.textContent = `${current.relative_humidity_2m}%`;
  wind.textContent = `${Math.round(current.wind_speed_10m)} km/h`;

  currentWeatherSection.classList.remove("hidden");
  setTheme(info.theme);
}

function renderForecast(data) {
  const { daily } = data;
  forecastList.innerHTML = "";

  daily.time.forEach((dateStr, i) => {
    const info = describeWeatherCode(daily.weather_code[i]);
    const dayName = new Date(dateStr).toLocaleDateString(undefined, {
      weekday: "short",
    });

    const card = document.createElement("div");
    card.className = "forecast-day";
    card.innerHTML = `
      <div class="day-name">${dayName}</div>
      <div class="day-icon">${iconSvg(info.category)}</div>
      <div class="day-temps">
        ${Math.round(daily.temperature_2m_max[i])}°
        <span class="low">${Math.round(daily.temperature_2m_min[i])}°</span>
      </div>
    `;
    forecastList.appendChild(card);
  });

  forecastSection.classList.remove("hidden");
}

// --- Main weather flow ---
async function loadWeatherForCity(city) {
  closeSuggestions();
  setStatus("Loading weather...", "loading");
  currentWeatherSection.classList.add("hidden");
  forecastSection.classList.add("hidden");

  try {
    const location = await geocodeCity(city);
    const data = await fetchForecast(location.latitude, location.longitude, location.timezone);

    renderCurrentWeather(location, data);
    renderForecast(data);

    clearStatus();
    saveRecentCity(location.name);
    localStorage.setItem(LAST_CITY_KEY, location.name);
  } catch (err) {
    setStatus(err.message || "Something went wrong. Please try again.", "error");
  }
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const city = cityInput.value.trim();
  if (!city) return;
  loadWeatherForCity(city);
});

// --- Live autocomplete suggestions ---
let debounceTimer = null;
let activeSuggestionIndex = -1;
let currentSuggestions = [];

function closeSuggestions() {
  suggestionsEl.innerHTML = "";
  suggestionsEl.classList.add("hidden");
  cityInput.setAttribute("aria-expanded", "false");
  activeSuggestionIndex = -1;
  currentSuggestions = [];
}

function renderSuggestions(results) {
  currentSuggestions = results;
  activeSuggestionIndex = -1;

  if (!results.length) {
    closeSuggestions();
    return;
  }

  suggestionsEl.innerHTML = "";
  results.forEach((place, i) => {
    const li = document.createElement("li");
    li.setAttribute("role", "option");
    li.id = `suggestion-${i}`;
    const region = [place.admin1, place.country].filter(Boolean).join(", ");
    li.innerHTML = `
      <span class="s-name">${place.name}</span>
      ${region ? `<span class="s-region">${region}</span>` : ""}
    `;
    li.addEventListener("mousedown", (e) => {
      // mousedown (not click) so this fires before the input's blur event
      e.preventDefault();
      selectSuggestion(place);
    });
    suggestionsEl.appendChild(li);
  });

  suggestionsEl.classList.remove("hidden");
  cityInput.setAttribute("aria-expanded", "true");
}

function selectSuggestion(place) {
  cityInput.value = place.name;
  closeSuggestions();
  loadWeatherForCity(place.name);
}

function highlightSuggestion(index) {
  const items = suggestionsEl.querySelectorAll("li");
  items.forEach((item) => item.classList.remove("active"));
  if (index >= 0 && items[index]) {
    items[index].classList.add("active");
    items[index].scrollIntoView({ block: "nearest" });
  }
}

cityInput.addEventListener("input", () => {
  const query = cityInput.value.trim();
  clearTimeout(debounceTimer);

  if (query.length < 2) {
    closeSuggestions();
    return;
  }

  debounceTimer = setTimeout(async () => {
    const results = await fetchSuggestions(query);
    // Guard against stale responses if the user kept typing.
    if (cityInput.value.trim() === query) {
      renderSuggestions(results);
    }
  }, SUGGESTION_DEBOUNCE_MS);
});

cityInput.addEventListener("keydown", (e) => {
  if (suggestionsEl.classList.contains("hidden")) return;

  if (e.key === "ArrowDown") {
    e.preventDefault();
    activeSuggestionIndex = Math.min(activeSuggestionIndex + 1, currentSuggestions.length - 1);
    highlightSuggestion(activeSuggestionIndex);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    activeSuggestionIndex = Math.max(activeSuggestionIndex - 1, 0);
    highlightSuggestion(activeSuggestionIndex);
  } else if (e.key === "Enter") {
    if (activeSuggestionIndex >= 0 && currentSuggestions[activeSuggestionIndex]) {
      e.preventDefault();
      selectSuggestion(currentSuggestions[activeSuggestionIndex]);
    }
  } else if (e.key === "Escape") {
    closeSuggestions();
  }
});

document.addEventListener("click", (e) => {
  if (!e.target.closest(".search-field")) {
    closeSuggestions();
  }
});

// On load: restore recent city chips and auto-load the last searched city.
window.addEventListener("DOMContentLoaded", () => {
  renderRecentCities();
  const lastCity = localStorage.getItem(LAST_CITY_KEY);
  if (lastCity) {
    cityInput.value = lastCity;
    loadWeatherForCity(lastCity);
  }
});
