document.addEventListener("DOMContentLoaded", () => {
  const API_KEY = "8adeea5f30b20a286e4fb774295b83dd";
  const BASE_URL = "https://api.themoviedb.org/3";
  const IMAGE_URL = "https://image.tmdb.org/t/p/w220_and_h330_face";

  // ---------------- Elements
  const moviesDiv = document.getElementById("movies");
  const sortSelect = document.getElementById("sort_by");
  const allReleasesCheckbox = document.getElementById("all_releases");
  const releaseTypeWrapper = document.getElementById("release_type_wrapper");
  const allCountriesCheckbox = document.getElementById("all_release_countries");
  const searchCountriesDiv = document.getElementById("search_all_countries");
  const releaseRegionSelect = document.getElementById("release_country");
  const applyBtn = document.getElementById("searchBtn");
  const keywordInput = document.getElementById("keywordInput");
  const languageTrigger = document.getElementById("language_trigger");
  const languagePanel = document.getElementById("language_panel");
  const languageFilter = document.getElementById("language_filter");
  const languageList = document.getElementById("language_list");
  const loadMoreBtn = document.querySelector(".load_more");
  
  // Sliders
  const voteAvgGte = document.getElementById("vote_average_gte");
  const voteAvgLte = document.getElementById("vote_average_lte");
  const minVotes = document.getElementById("min_user_votes");
  const runtimeGte = document.getElementById("runtime_gte");
  const runtimeLte = document.getElementById("runtime_lte");
  const genreItems = document.querySelectorAll("#with_genres li");

  // ---------------- State
  let currentPage = 1;
  let nextPage = 2;
  let selectedKeywordId = null;
  let languages = [];
  let selectedGenres = [];

  // ---------------- Search Button States
  function activateApply() {
    applyBtn?.classList.add("active");
  }

  function resetApply() {
    applyBtn?.classList.remove("active");
  }

  function debounce(fn, delay = 400) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  // ---------------- Rating Circle Logic
  function drawScoreCircle(canvas, rating) {
    const ctx = canvas.getContext('2d');
    const percent = Math.round(rating * 10);
    const center = 17;
    const radius = 15;
    
    let barColor = "#21d07a"; 
    let trackColor = "#204529";
    if (percent < 70) { barColor = "#d2d531"; trackColor = "#423d0f"; }
    if (percent < 40) { barColor = "#db2360"; trackColor = "#571435"; }
    if (percent === 0) { barColor = "#666666"; trackColor = "#333333"; }

    ctx.clearRect(0, 0, 34, 34);
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.strokeStyle = trackColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(center, center, radius, -Math.PI / 2, (-Math.PI / 2) + (Math.PI * 2 * (percent / 100)));
    ctx.strokeStyle = barColor;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.stroke();
  }

  // ---------------- Detect Filter Changes
  const sidebar = document.querySelector(".left_column");
  sidebar.addEventListener("input", (e) => {
    // Light up Search button if any input/select changes
    if (e.target.matches("input, select")) {
      activateApply();
    }
  });

  // Keywords with API search
  keywordInput?.addEventListener("input", debounce(async e => {
    const query = e.target.value.trim();
    if (!query) {
      selectedKeywordId = null;
      return;
    }
    try {
      const res = await fetch(`${BASE_URL}/search/keyword?api_key=${API_KEY}&query=${encodeURIComponent(query)}`);
      const data = await res.json();
      selectedKeywordId = data.results?.[0]?.id || null;
      activateApply();
    } catch (err) { console.error(err); }
  }));

  // Genre toggles
  genreItems.forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const genreId = item.getAttribute("data-value");
      if (item.classList.contains("selected")) {
        item.classList.remove("selected");
        selectedGenres = selectedGenres.filter(id => id !== genreId);
      } else {
        item.classList.add("selected");
        selectedGenres.push(genreId);
      }
      activateApply();
    });
  });

  // ---------------- Language & Countries
  async function fetchLanguages() {
    try {
      const res = await fetch(`${BASE_URL}/configuration/languages?api_key=${API_KEY}`);
      languages = await res.json();
      renderLanguages();
    } catch (err) { console.error(err); }
  }

  function renderLanguages(filter = "") {
    if (!languageList) return;
    languageList.innerHTML = "";
    languages.filter(l => l.english_name.toLowerCase().includes(filter.toLowerCase()))
      .forEach(lang => {
        const li = document.createElement("li");
        li.textContent = lang.english_name;
        li.addEventListener("click", () => {
          languageTrigger.textContent = lang.english_name;
          languageTrigger.dataset.value = lang.iso_639_1;
          languagePanel.classList.add("hide");
          activateApply();
        });
        languageList.appendChild(li);
      });
  }

  languageTrigger?.addEventListener("click", () => {
    languagePanel.classList.toggle("hide");
    renderLanguages();
  });
async function populateCountries() {
  try {
    const res = await fetch(`${BASE_URL}/configuration/countries?api_key=${API_KEY}`);
    const countries = await res.json();
    if (releaseRegionSelect) {
      // Clean mapping without extra icons that break standard select tags
      releaseRegionSelect.innerHTML = countries.map(c => 
        `<option value="${c.iso_3166_1}">${c.english_name}</option>`
      ).join("");
      releaseRegionSelect.value = "AM"; // Default
    }
  } catch (err) { console.error(err); }
}

  // ---------------- Checkbox behavior
  allReleasesCheckbox?.addEventListener("change", () => {
    releaseTypeWrapper.style.display = allReleasesCheckbox.checked ? "block" : "none";
  });
  allCountriesCheckbox?.addEventListener("change", () => {
    searchCountriesDiv.style.display = allCountriesCheckbox.checked ? "block" : "none";
  });

  // ---------------- URL Construction
  function buildDiscoveryUrl(page) {
    let url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&sort_by=${sortSelect.value}&page=${page}`;
    
    if (!allReleasesCheckbox.checked) {
      const gte = document.getElementById("release_date_gte").value;
      const lte = document.getElementById("release_date_lte").value;
      if (gte) url += `&primary_release_date.gte=${gte}`;
      if (lte) url += `&primary_release_date.lte=${lte}`;
    }
    if (allCountriesCheckbox.checked) url += `&region=${releaseRegionSelect.value}`;
    if (selectedKeywordId) url += `&with_keywords=${selectedKeywordId}`;
    if (selectedGenres.length) url += `&with_genres=${selectedGenres.join(",")}`;
    if (languageTrigger.dataset.value) url += `&with_original_language=${languageTrigger.dataset.value}`;
    
    url += `&vote_average.gte=${voteAvgGte.value}&vote_average.lte=${voteAvgLte.value}`;
    url += `&vote_count.gte=${minVotes.value}`;
    url += `&with_runtime.gte=${runtimeGte.value}&with_runtime.lte=${runtimeLte.value}`;
    
    return url;
  }

  // ---------------- Rendering
  function renderMovieCards(movies) {
  moviesDiv.innerHTML = "";
  movies.forEach(movie => {
    const card = document.createElement("div");
    card.className = "movie-card";
    
    const rating = movie.vote_average || 0;
    const displayPercent = Math.round(rating * 10);
    const movieTitle = movie.title || movie.name || "Untitled";

    card.innerHTML = `
        <div class="image_wrapper">
          <img src="${movie.poster_path ? IMAGE_URL + movie.poster_path : 'https://via.placeholder.com/220x330?text=No+Image'}" alt="${movieTitle}">
          
          <div class="user_score_chart">
              <canvas width="34" height="34"></canvas>
              <div class="percent">${displayPercent === 0 ? 'NR' : displayPercent + '<span>%</span>'}</div>
          </div>
        </div>

        <div class="movie-info">
          <h3 class="movie_name">${movieTitle}</h3>
          <p class="release_date">${movie.release_date || movie.first_air_date || "N/A"}</p>
          
          <div class="overview">
            ${movie.overview || "No description available."}
          </div>
        </div>
      `;
    moviesDiv.appendChild(card);
    const canvas = card.querySelector('canvas');
    requestAnimationFrame(() => drawScoreCircle(canvas, rating));
  });
}

  // ---------------- Fetch and Apply
  async function fetchMovies(reset = true) {
    if (reset) {
      moviesDiv.innerHTML = "";
      currentPage = 1;
      nextPage = 2;
    }
    try {
      const res = await fetch(buildDiscoveryUrl(currentPage));
      const data = await res.json();
      if (!data.results?.length && reset) moviesDiv.innerHTML = "<p>No movies found.</p>";
      else renderMovieCards(data.results);
    } catch (err) { console.error(err); }
  }

  applyBtn?.addEventListener("click", () => {
    if (applyBtn.classList.contains("active")) {
      fetchMovies(true);
      resetApply();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  loadMoreBtn?.addEventListener("click", async () => {
    loadMoreBtn.textContent = "Loading...";
    try {
      const res = await fetch(buildDiscoveryUrl(nextPage));
      const data = await res.json();
      if (data.results?.length) {
        renderMovieCards(data.results);
        currentPage = nextPage++;
      }
      loadMoreBtn.textContent = "Load More";
    } catch (err) { console.error(err); }
  });

  // Accordion
  document.querySelectorAll(".filter_panel .name").forEach(n => n.addEventListener("click", () => n.parentElement.classList.toggle("closed")));

  fetchLanguages();
  populateCountries();
  fetchMovies();
});


// ===== SAFE ADD-ON (DOES NOT TOUCH EXISTING CODE) =====
(function () {
  const searchBar = document.getElementById("searchBar");
  const searchBtn = document.getElementById("searchBtn");

  if (!searchBar || !searchBtn) return;

  // show bar when any input/select changes
  document.addEventListener("input", e => {
    if (e.target.matches("input, select")) {
      searchBar.classList.remove("fade-out");
    }
  });

  // hide after search click
  searchBtn.addEventListener("click", () => {
    searchBar.classList.add("fade-out");
  });

  // hide on scroll
  let lastScroll = 0;
  window.addEventListener("scroll", () => {
    const current = window.scrollY;
    if (current > lastScroll && current > 120) {
      searchBar.classList.add("fade-out");
    }
    lastScroll = current;
  });
})();


// ===== SAFE ADD-ON (DOES NOT TOUCH EXISTING CODE) =====
document.addEventListener("DOMContentLoaded", () => {
  const searchBar = document.getElementById("searchBar");
  const searchBtn = document.getElementById("searchBtn");

  if (!searchBar || !searchBtn) return;

  // show bar when any input/select changes
  document.addEventListener("input", e => {
    if (e.target.matches("input, select")) {
      searchBar.classList.remove("fade-out");
    }
  });

  // hide after search click
  searchBtn.addEventListener("click", () => {
    searchBar.classList.add("fade-out");
  });

  // hide on scroll
  let lastScroll = 0;
  window.addEventListener("scroll", () => {
    const current = window.scrollY;
    if (current > lastScroll && current > 120) {
      searchBar.classList.add("fade-out");
    }
    lastScroll = current;
  });
});



