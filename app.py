from flask import Flask, request, jsonify, render_template
import requests
import json
from datetime import datetime, timedelta


app = Flask(__name__)

def fetch_random_wiki_article():
    res = requests.get('https://en.wikipedia.org/api/rest_v1/page/random/summary')
    if res.status_code == 200:
        data = res.json()
        title = data['title']
        first_sentence = data['extract'].split('. ')[0] + '.'
        img_url = data['originalimage']['source'] if 'originalimage' in data else None
        final_url = f"https://en.wikipedia.org/wiki/{title.replace(' ', '_')}"

        # Get the current date and the date one month ago
        end_date = datetime.now()
        start_date = end_date - timedelta(days=30)

        # Format the dates for the API call
        end_date_str = end_date.strftime('%Y%m%d') + '00'
        start_date_str = start_date.strftime('%Y%m%d') + '00'

        # Fetch views for the last month
        views_res = requests.get(f"https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/all-agents/{title.replace(' ', '_')}/monthly/{start_date_str}/{end_date_str}")
        if views_res.status_code == 200:
            views_data = views_res.json()
            views_count = sum(item['views'] for item in views_data.get('items', []))
        else:
            views_count = 0

        return {
            'title': title,
            'img_url': img_url,
            'first_sentence': first_sentence,
            'url': final_url,
            'views': views_count  # adding the views
        }
    else:
        return None  # Or some error handling


@app.route('/')
def home():
    articles = [fetch_random_wiki_article() for _ in range(3)]
    return render_template('index.html', articles=articles)

@app.route('/new_articles')
def new_articles():
    articles = [fetch_random_wiki_article() for _ in range(3)]
    return jsonify(articles)

@app.route('/handle_click', methods=['POST'])
def handle_click():
    data = request.json
    title = data.get('title')
    first_sentence = data.get('first_sentence')
    url = data.get('url')
    views = data.get('views')

    clicked_article = {
        'title': title,
        'first_sentence': first_sentence,
        'url': url,
        'views': views
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
    app.run(port=3000, debug=True)