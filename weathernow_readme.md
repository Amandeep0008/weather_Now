# WeatherNow

A responsive, real-time weather lookup web application built with Vanilla JavaScript and the Fetch API, featuring debounced city autocomplete, a 5-day forecast, and weather-adaptive UI themes.

🔗 **Live Demo:** [weather-now-mdfz.vercel.app](https://weather-now-mdfz.vercel.app)

## 📸 Screenshots

<!-- Add 1–2 screenshots inside a /screenshots folder and update the paths below -->
![WeatherNow Dashboard](./screenshots/weathernow-preview.png)

## ✨ Key Features

- **Real-Time Weather & Geocoding:** Fetches live current conditions and 5-day forecast data from a public weather API using the native Fetch API.
- **Debounced Autocomplete:** Suggests matching cities as you type while minimizing unnecessary API calls, with full keyboard navigation (Arrow keys + Enter).
- **Weather-Adaptive UI:** Dynamically updates the background theme and weather icons to match the live weather conditions of the selected city.
- **Persistent Search History:** Uses the browser's `localStorage` API to remember your last-searched city on reload and maintain a quick-access recent search list.

## 🛠️ Tech Stack

- **Markup & Styling:** HTML5, CSS3
- **Logic & API Integration:** Vanilla JavaScript (ES6+), Fetch API
- **Persistence:** Browser `localStorage` API
- **Deployment:** Vercel

## ⚙️ Running Locally

Since this project uses plain HTML, CSS, and JavaScript, no build step is required.

### 1. Clone the repository
```bash
git clone https://github.com/<your-username>/<weathernow-repo>.git
cd <weathernow-repo>
```

### 2. Run the app
Open `index.html` directly in your browser, or use a local development server such as the **Live Server** extension in VS Code:
```bash
# Optional: serve locally using npx
npx serve .
```

## 🧠 What I Learned

- Implementing debouncing from scratch to keep search suggestions responsive without flooding the geocoding API.
- Managing keyboard accessibility (`ArrowUp`, `ArrowDown`, `Enter`, `Escape`) inside a custom autocomplete dropdown.
- Structuring asynchronous Fetch API calls with clean loading and error states in Vanilla JavaScript.

## 📄 License

This project is open source and available under the [MIT License](LICENSE).