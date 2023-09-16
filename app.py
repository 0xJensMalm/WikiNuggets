from flask import Flask, request, jsonify, render_template
import requests
from bs4 import BeautifulSoup
import sqlite3 # til db
import json

app = Flask(__name__)

def fetch_categories(title):
    params = {
        'action': 'query',
        'format': 'json',
        'titles': title,
        'prop': 'categories'
    }
    res = requests.get('https://en.wikipedia.org/w/api.php', params=params)
    if res.status_code == 200:
        data = res.json()
        page_id = next(iter(data['query']['pages']))
        categories = [cat['title'].replace('Category:', '') for cat in data['query']['pages'][page_id].get('categories', [])]
        return categories
    else:
        return []

def fetch_random_wiki_article():
    res = requests.get('https://en.wikipedia.org/api/rest_v1/page/random/summary')
    if res.status_code == 200:
        data = res.json()
        title = data['title']
        first_sentence = data['extract'].split('. ')[0] + '.'
        img_url = data['originalimage']['source'] if 'originalimage' in data else None
        final_url = f"https://en.wikipedia.org/wiki/{title.replace(' ', '_')}"

        # Fetch categories
        categories = fetch_categories(title)
        
        return {
            'title': title,
            'img_url': img_url,
            'first_sentence': first_sentence,
            'url': final_url,
            'categories': categories  # adding the categories
        }
    else:
        return None  # Or some error handling

def init_db():
    # Connect to the database (it will create a file called "articles.db" if it doesn't exist)
    conn = sqlite3.connect("articles.db")
    c = conn.cursor()
    
    # Create a new table for articles
    c.execute('''
        CREATE TABLE IF NOT EXISTS articles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            first_sentence TEXT,
            img_url TEXT,
            url TEXT,
            categories TEXT
        );
    ''')
    
    conn.commit()
    conn.close()

def add_article_to_db(article): #add article to db
    conn = sqlite3.connect("articles.db")
    c = conn.cursor()
    
    # Insert the article into the table
    c.execute("INSERT INTO articles (title, first_sentence, img_url, url, categories) VALUES (?, ?, ?, ?, ?)", 
              (article["title"], article["first_sentence"], article["img_url"], article["url"], ",".join(article.get("categories", []))))
    
    conn.commit()
    conn.close()


@app.route('/')
def home():
    articles = [fetch_random_wiki_article() for _ in range(3)]
    for article in articles:
        add_article_to_db(article)
    return render_template('index.html', articles=articles)
    
@app.route('/new_articles')
def new_articles():
    articles = [fetch_random_wiki_article() for _ in range(3)]
    for article in articles:
        add_article_to_db(article)
    return jsonify(articles)

# save to json 
@app.route('/handle_click', methods=['POST'])
def handle_click():
    data = request.json
    title = data.get('title')
    firstSentence = data.get('firstSentence')
    url = data.get('url')

    clicked_article = {
        'title': title,
        'first_sentence': firstSentence,
        'url': url,
    }

    try:
        with open('articles.json', 'r') as f:
            articles_data = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        articles_data = []

    articles_data.append(clicked_article)

    with open('articles.json', 'w') as f:
        json.dump(articles_data, f, indent=4)

    return jsonify({'message': 'Click handled'})





if __name__ == "__main__":
    init_db()
    app.run(debug=True)