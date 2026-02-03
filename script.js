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
  
  // Keywords
  const keywordInput = document.getElementById("keywordInput");
  const keywordResults = document.getElementById("keyword_results");

  // Language
  const languageTrigger = document.getElementById("language_trigger");
  const languagePanel = document.getElementById("language_panel");
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

  // ---------------- Search Button States (Untouched Logic)
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

  // ---------------- Keywords search with full-length Result Box
  keywordInput?.addEventListener("input", debounce(async e => {
    const query = e.target.value.trim();
    if (!query) {
      keywordResults?.classList.add("hide");
      selectedKeywordId = null;
      return;
    }
    try {
      const res = await fetch(`${BASE_URL}/search/keyword?api_key=${API_KEY}&query=${encodeURIComponent(query)}`);
      const data = await res.json();
      
      if (keywordResults) {
        keywordResults.innerHTML = "";
        keywordResults.classList.remove("hide");

        if (data.results && data.results.length > 0) {
          data.results.forEach(item => {
            const li = document.createElement("li");
            li.textContent = item.name;
            li.addEventListener("click", () => {
              keywordInput.value = item.name;
              selectedKeywordId = item.id;
              keywordResults.classList.add("hide");
              activateApply(); 
            });
            keywordResults.appendChild(li);
          });
        } else {
          // "Not found" message in full-length box
          const li = document.createElement("li");
          li.textContent = "No results found";
          li.classList.add("no_results");
          keywordResults.appendChild(li);
        }
      }
    } catch (err) { console.error(err); }
  }));

  // Close results when clicking outside
  document.addEventListener("click", (e) => {
    if (!keywordInput?.contains(e.target) && !keywordResults?.contains(e.target)) {
      keywordResults?.classList.add("hide");
    }
  });

  // ---------------- Detect Filter Changes
  const sidebar = document.querySelector(".left_column");
  sidebar?.addEventListener("input", (e) => {
    if (e.target.matches("input, select")) {
      activateApply();
    }
  });

  // Genre toggles
  genreItems.forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const genreId = item.getAttribute("data-value");
      item.classList.toggle("selected");
      if (item.classList.contains("selected")) {
        selectedGenres.push(genreId);
      } else {
        selectedGenres = selectedGenres.filter(id => id !== genreId);
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
  });

  async function populateCountries() {
    try {
      const res = await fetch(`${BASE_URL}/configuration/countries?api_key=${API_KEY}`);
      const countries = await res.json();
      if (releaseRegionSelect) {
        releaseRegionSelect.innerHTML = countries.map(c => 
          `<option value="${c.iso_3166_1}">${c.english_name}</option>`
        ).join("");
        releaseRegionSelect.value = "AM"; 
      }
    } catch (err) { console.error(err); }
  }

  // ---------------- URL Construction
  function buildDiscoveryUrl(page) {
    let url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&sort_by=${sortSelect.value}&page=${page}`;
    
    if (allReleasesCheckbox && !allReleasesCheckbox.checked) {
      const gte = document.getElementById("release_date_gte")?.value;
      const lte = document.getElementById("release_date_lte")?.value;
      if (gte) url += `&primary_release_date.gte=${gte}`;
      if (lte) url += `&primary_release_date.lte=${lte}`;
    }
    if (allCountriesCheckbox?.checked) url += `&region=${releaseRegionSelect.value}`;
    if (selectedKeywordId) url += `&with_keywords=${selectedKeywordId}`;
    if (selectedGenres.length) url += `&with_genres=${selectedGenres.join(",")}`;
    if (languageTrigger?.dataset.value) url += `&with_original_language=${languageTrigger.dataset.value}`;
    
    url += `&vote_average.gte=${voteAvgGte.value}&vote_average.lte=${voteAvgLte.value}`;
    url += `&vote_count.gte=${minVotes.value}`;
    url += `&with_runtime.gte=${runtimeGte.value}&with_runtime.lte=${runtimeLte.value}`;
    
    return url;
  }

  // ---------------- Rendering
  function renderMovieCards(movies, append = false) {
    if (!append) moviesDiv.innerHTML = "";

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
            <div class="overview">${movie.overview || "No description available."}</div>
          </div>
        `;
      moviesDiv.appendChild(card);
      const canvas = card.querySelector('canvas');
      requestAnimationFrame(() => drawScoreCircle(canvas, rating));
    });
  }

  // ---------------- Fetch and Apply
  async function fetchMovies(reset = true) {
    if (reset) { currentPage = 1; nextPage = 2; }
    try {
      const res = await fetch(buildDiscoveryUrl(currentPage));
      const data = await res.json();
      if (!data.results?.length && reset) {
        moviesDiv.innerHTML = "<p>No movies found.</p>";
      } else {
        renderMovieCards(data.results, !reset); 
      }
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
        renderMovieCards(data.results, true); 
        currentPage = nextPage++;
      }
      loadMoreBtn.textContent = "Load More";
    } catch (err) { 
      console.error(err); 
      loadMoreBtn.textContent = "Load More";
    }
  });

  // Accordion Logic
  document.querySelectorAll(".filter_panel .name").forEach(n => {
    n.addEventListener("click", () => n.parentElement.classList.toggle("closed"));
  });

  // Init
  fetchLanguages();
  populateCountries();
  fetchMovies(true);
});