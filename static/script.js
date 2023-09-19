// Reroll button
document.addEventListener('DOMContentLoaded', function() {
    const rerollButton = document.getElementById('reroll-button');
    
    rerollButton.addEventListener('click', function() {
      // Fetch new articles from the server
      fetch('/new_articles')
        .then(response => response.json())
        .then(newArticles => {
          // Find all the existing cards
          const cardElements = document.querySelectorAll('.card');
          
          // Update each card with new article data
          cardElements.forEach((cardElement, index) => {
            const newArticle = newArticles[index];
            cardElement.parentElement.href = newArticle.url;
            cardElement.querySelector('.card-title').textContent = newArticle.title;
            cardElement.querySelector('.card-excerpt').textContent = newArticle.first_sentence;
            cardElement.querySelector('.card-views').textContent = `views last month: ${newArticle.views}`;  // Update views
            if (newArticle.img_url) {
                cardElement.querySelector('.card-thumb img').src = newArticle.img_url;
            }
        });


        })
        .catch(error => {
          console.error('Error fetching new articles:', error);
        });
    });
});

// Save to JSON
document.addEventListener("DOMContentLoaded", function() {
    console.log("Card clicked!"); // for testing
    const cardElements = document.querySelectorAll(".card");
  
    cardElements.forEach(card => {
      card.addEventListener("click", function() {
        const title = card.querySelector(".card-title").textContent;
        const firstSentence = card.querySelector(".card-excerpt").textContent;
        const url = card.closest('a').getAttribute('href');
  
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
      });
    });
});
