// Initialize user statistics
let totalArticles = 0;
let currentStreak = 0;
let readArticles = [];

// Function to update user statistics on the page
function updateUserStats() {
    document.getElementById('total-articles').textContent = totalArticles;
    document.getElementById('current-streak').textContent = currentStreak;
}

// Function to update the list of read articles
function updateReadArticles() {
  const articleList = document.getElementById('article-list');
  articleList.innerHTML = '';
  readArticles.forEach(article => {
      const listItem = document.createElement('li');
      const anchor = document.createElement('a');
      anchor.href = article.url;
      anchor.textContent = article.title;
      anchor.target = '_blank';  // Opens the link in a new tab
      listItem.appendChild(anchor);
      articleList.appendChild(listItem);
  });
}

document.addEventListener('DOMContentLoaded', function() {
  const rerollButton = document.getElementById('reroll-button');
  const toggleReadArticlesButton = document.getElementById('toggle-read-articles');
  const readArticlesList = document.getElementById('read-articles-list');
  const resetButton = document.getElementById('reset-button');
  const articleModal = document.getElementById('article-modal');
  const articleFrame = document.getElementById('article-frame');
  const closeModal = document.getElementById('close-modal');
  

  // Toggle read articles list
  toggleReadArticlesButton.addEventListener('click', function() {
      readArticlesList.classList.toggle('hidden');
  });

  // Reset button functionality
  resetButton.addEventListener('click', function() {
      readArticles = [];
      totalArticles = 0;
      currentStreak = 0;
      updateUserStats();
      updateReadArticles();
  });

  // Close modal functionality
  closeModal.addEventListener('click', function() {
      articleModal.classList.add('hidden');
  });

  rerollButton.addEventListener('click', function() {
    fetch('/new_articles')
        .then(response => response.json())
        .then(newArticles => {
            const cardElements = document.querySelectorAll('.card');
            cardElements.forEach((cardElement, index) => {
                const newArticle = newArticles[index];
                cardElement.parentElement.href = newArticle.url;
                cardElement.querySelector('.card-title').textContent = newArticle.title;
                cardElement.querySelector('.card-excerpt').textContent = newArticle.first_sentence;
                cardElement.querySelector('.card-views').textContent = `Total views last month: ${newArticle.views}`;
                cardElement.querySelector('.card-size').textContent = `Article length: ${newArticle.size}`;  // Add this line
                if (newArticle.img_url) {
                    cardElement.querySelector('.card-thumb img').src = newArticle.img_url;
                    }
                });
            })
            .catch(error => {
                console.error('Error fetching new articles:', error);
            });
    });

    const cardElements = document.querySelectorAll(".card");
    cardElements.forEach(card => {
        card.addEventListener("click", function(event) {
            event.preventDefault();  // Prevent the default link behavior
            const title = card.querySelector(".card-title").textContent;
            const firstSentence = card.querySelector(".card-excerpt").textContent;
            const url = card.closest('a').getAttribute('href');

            // Open the article in a modal
            articleFrame.src = url;
            articleModal.classList.remove('hidden');

            fetch("/handle_click", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    title: title,
                    firstSentence: firstSentence,
                    url: url,
                }),
            });

            // Increment total articles read
            totalArticles++;
            // Increment current streak (this is a placeholder; you'll likely want more complex logic)
            currentStreak++;

            // Add to read articles
            readArticles.push({ title: title, firstSentence: firstSentence, url: url });

            // Update user statistics and read articles
            updateUserStats();
            updateReadArticles();
        });
    });
  
});