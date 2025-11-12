// Client-only WikiNuggets
// Fetch random Wikipedia articles and store user data in localStorage

// ---- State and storage helpers ----
const STORAGE_KEYS = {
  total: "wikn_totalArticles",
  streak: "wikn_currentStreak",
  lastReadDate: "wikn_lastReadDate",
  readArticles: "wikn_readArticles"
};

let totalArticles = 0;
let currentStreak = 0;
let remainingRerolls = 3;
let readArticles = [];

function loadStateFromStorage() {
  totalArticles = parseInt(localStorage.getItem(STORAGE_KEYS.total) || "0", 10);
  currentStreak = parseInt(localStorage.getItem(STORAGE_KEYS.streak) || "0", 10);
  readArticles = JSON.parse(localStorage.getItem(STORAGE_KEYS.readArticles) || "[]");
}

function saveStateToStorage() {
  localStorage.setItem(STORAGE_KEYS.total, String(totalArticles));
  localStorage.setItem(STORAGE_KEYS.streak, String(currentStreak));
  localStorage.setItem(STORAGE_KEYS.readArticles, JSON.stringify(readArticles));
}

function getTodayDateString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function updateStreakOnRead() {
  const today = getTodayDateString();
  const last = localStorage.getItem(STORAGE_KEYS.lastReadDate);
  if (!last) {
    currentStreak = 1;
  } else {
    const lastDate = new Date(last);
    const todayDate = new Date(today);
    const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) {
      // same day, keep streak as-is
    } else if (diffDays === 1) {
      currentStreak += 1;
    } else if (diffDays > 1) {
      currentStreak = 1;
    }
  }
  localStorage.setItem(STORAGE_KEYS.lastReadDate, today);
}

// ---- UI helpers ----
function showLoadingPopup() {
  document.getElementById("loadingPopup").style.display = "block";
}

function hideLoadingPopup() {
  const popup = document.getElementById("loadingPopup");
  popup.style.animation = "zoomOut 0.5s forwards";
  setTimeout(() => {
    popup.style.display = "none";
    popup.style.animation = "";
  }, 500);
}

function updateUserStats() {
  const totalEl = document.getElementById("total-articles");
  const streakValueEl = document.getElementById("current-streak-value");
  const streakSidebarEl = document.getElementById("current-streak-value-sidebar");
  if (totalEl) totalEl.textContent = String(totalArticles);
  if (streakValueEl) streakValueEl.textContent = String(currentStreak);
  if (streakSidebarEl) streakSidebarEl.textContent = `${currentStreak} days!`;
}

function updateReadArticles() {
  const articleList = document.getElementById("article-list");
  if (!articleList) return;
  articleList.innerHTML = "";
  readArticles.forEach((article) => {
    const listItem = document.createElement("li");
    const anchor = document.createElement("a");
    anchor.href = article.url;
    anchor.textContent = article.title;
    anchor.target = "_blank";
    listItem.appendChild(anchor);
    articleList.appendChild(listItem);
  });
}

// ---- Wikipedia API helpers ----
function getArticleSizeCategory(sizeBytes) {
  if (sizeBytes >= 80000) return "Very long";
  if (sizeBytes >= 60000) return "Long";
  if (sizeBytes >= 30000) return "Medium";
  if (sizeBytes >= 15000) return "Small";
  if (sizeBytes >= 5000) return "Very small";
  return "Tiny";
}

function getLastFullMonthRange() {
  const now = new Date();
  // Last day of previous month
  const end = new Date(now.getFullYear(), now.getMonth(), 0);
  // Last day of the month before the previous
  const start = new Date(end.getFullYear(), end.getMonth(), 0);
  const fmt = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}${m}${day}00`;
  };
  return { start: fmt(start), end: fmt(end) };
}

async function fetchSummary() {
  const res = await fetch("https://en.wikipedia.org/api/rest_v1/page/random/summary");
  if (!res.ok) throw new Error("Failed to fetch random summary");
  return res.json();
}

async function fetchRevisionSizeBytes(title) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&titles=${encodeURIComponent(title)}&prop=revisions&rvprop=size`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch revision size");
  const data = await res.json();
  const page = data?.query?.pages ? Object.values(data.query.pages)[0] : null;
  const size = page?.revisions?.[0]?.size;
  return typeof size === "number" ? size : 0;
}

async function fetchMonthlyPageviews(title) {
  const { start, end } = getLastFullMonthRange();
  const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/all-agents/${encodeURIComponent(title.replace(/ /g, "_"))}/monthly/${start}/${end}`;
  const res = await fetch(url);
  if (!res.ok) return 0;
  const data = await res.json();
  const items = Array.isArray(data?.items) ? data.items : [];
  return items.reduce((sum, item) => sum + (item.views || 0), 0);
}

async function fetchRandomArticle() {
  const summary = await fetchSummary();
  const title = summary.title;
  const first_sentence = (summary.extract || "").split(". ")[0] ? ((summary.extract || "").split(". ")[0] + ".") : (summary.extract || "");
  const img_url = summary.originalimage?.source || null;
  const url = `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;

  const [sizeBytes, views] = await Promise.all([
    fetchRevisionSizeBytes(title).catch(() => 0),
    fetchMonthlyPageviews(title).catch(() => 0)
  ]);
  const size = getArticleSizeCategory(sizeBytes);
  return { title, first_sentence, img_url, url, views, size };
}

async function fetchArticles(count) {
  const articles = [];
  for (let i = 0; i < count; i++) {
    try {
      // Stagger slightly to vary random responses
      // eslint-disable-next-line no-await-in-loop
      articles.push(await fetchRandomArticle());
    } catch (e) {
      // In case of failure, push a placeholder
      articles.push({
        title: "Failed to load",
        first_sentence: "Please try reroll.",
        img_url: null,
        url: "https://en.wikipedia.org/wiki/Special:Random",
        views: 0,
        size: "Unknown"
      });
    }
  }
  return articles;
}

// ---- Rendering ----
function renderCards(articles) {
  const cardsContainer = document.getElementById("cards");
  if (!cardsContainer) return;
  cardsContainer.innerHTML = articles
    .map((a) => {
      const img = a.img_url ? `<img src="${a.img_url}" alt="${a.title}">` : "";
      return `
        <a href="${a.url}" target="_blank">
          <article class="card">
            <div class="card-thumb">${img}</div>
            <div class="card-title">${a.title}</div>
            <div class="card-excerpt">${a.first_sentence}</div>
            <div class="card-size">Article length: ${a.size}</div>
            <div class="card-views">Views last month: ${a.views}</div>
          </article>
        </a>
      `;
    })
    .join("");

  const articleModal = document.getElementById("article-modal");
  const articleFrame = document.getElementById("article-frame");

  // Attach click handlers
  const cardElements = cardsContainer.querySelectorAll(".card");
  cardElements.forEach((card) => {
    card.addEventListener("click", function (event) {
      event.preventDefault();
      const title = card.querySelector(".card-title").textContent;
      const firstSentence = card.querySelector(".card-excerpt").textContent;
      const url = card.closest("a").getAttribute("href");

      // Open modal
      if (articleFrame && articleModal) {
        articleFrame.src = url;
        articleModal.classList.remove("hidden");
      }

      // Update stats and storage
      totalArticles += 1;
      updateStreakOnRead();
      readArticles.push({ title, firstSentence, url });
      saveStateToStorage();
      updateUserStats();
      updateReadArticles();
    });
  });
}

// ---- Init ----
document.addEventListener("DOMContentLoaded", async function () {
  const rerollButton = document.getElementById("reroll-button");
  const toggleReadArticlesButton = document.getElementById("toggle-read-articles");
  const readArticlesList = document.getElementById("read-articles-list");
  const resetButton = document.getElementById("reset-button");
  const articleModal = document.getElementById("article-modal");
  const closeModal = document.getElementById("close-modal");

  // Load state
  loadStateFromStorage();
  updateUserStats();
  updateReadArticles();

  // Toggle read articles list
  if (toggleReadArticlesButton && readArticlesList) {
    toggleReadArticlesButton.addEventListener("click", function () {
      readArticlesList.classList.toggle("hidden");
    });
  }

  // Reset button
  if (resetButton) {
    resetButton.addEventListener("click", function () {
      readArticles = [];
      totalArticles = 0;
      currentStreak = 0;
      localStorage.removeItem(STORAGE_KEYS.lastReadDate);
      remainingRerolls = 3;
      if (rerollButton) {
        rerollButton.textContent = `Reroll (rolls left: ${remainingRerolls})`;
        rerollButton.disabled = false;
      }
      saveStateToStorage();
      updateUserStats();
      updateReadArticles();
    });
  }

  // Close modal
  if (closeModal && articleModal) {
    closeModal.addEventListener("click", function () {
      articleModal.classList.add("hidden");
    });
  }

  // Reroll button
  if (rerollButton) {
    rerollButton.textContent = `Reroll (rolls left: ${remainingRerolls})`;
    rerollButton.addEventListener("click", async function () {
      if (remainingRerolls > 0) {
        showLoadingPopup();
        remainingRerolls -= 1;
        rerollButton.textContent = `Reroll (rolls left: ${remainingRerolls})`;
        if (remainingRerolls === 0) {
          rerollButton.disabled = true;
        }
        try {
          const newArticles = await fetchArticles(3);
          renderCards(newArticles);
        } catch (e) {
          console.error("Error fetching new articles:", e);
        } finally {
          hideLoadingPopup();
        }
      }
    });
  }

  // Initial load
  try {
    showLoadingPopup();
    const initial = await fetchArticles(3);
    renderCards(initial);
  } catch (e) {
    console.error("Initial fetch failed", e);
  } finally {
    hideLoadingPopup();
  }
});
