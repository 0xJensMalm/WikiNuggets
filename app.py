from flask import Flask, request, jsonify, render_template
import requests
import json
import sys
from datetime import datetime, timedelta
from urllib.parse import quote  # for debugging
from dateutil.relativedelta import relativedelta # for å fikse API kall. 

app = Flask(__name__)

def fetch_random_wiki_article():
    headers = {'User-Agent': 'WikiNuggets/1.0 (https://github.com/0xJensMalm/WikiNuggets; jensmalm@gmail.com)'}
    res = requests.get('https://en.wikipedia.org/api/rest_v1/page/random/summary', headers=headers)
    
    def get_article_size_category(size):
        if size >= 80000:
            return "Very long"
        elif 60000 <= size < 80000:
            return "Long"
        elif 30000 <= size < 60000:
            return "Medium"
        elif 15000 <= size < 30000:
            return "Small"
        elif 5000 <= size < 15000:
            return "Very small"
        else:
            return "Tiny"


    if res.status_code == 200:
        data = res.json()
        title = data['title']
        first_sentence = data['extract'].split('. ')[0] + '.'
        img_url = data['originalimage']['source'] if 'originalimage' in data else None
        final_url = f"https://en.wikipedia.org/wiki/{title.replace(' ', '_')}"

        size_url = f"https://en.wikipedia.org/w/api.php?action=query&format=json&titles={title.replace(' ', '_')}&prop=revisions&rvprop=size"
        size_res = requests.get(size_url, headers=headers)

        if size_res.status_code == 200:
            size_data = size_res.json()
            page = next(iter(size_data['query']['pages'].values()))
            if 'revisions' in page:
                article_size_bytes = page['revisions'][0]['size']
                sys.stdout.write(f"Article size in bytes: {article_size_bytes}\n")  # Debugging line
                article_size_category = get_article_size_category(article_size_bytes)
                sys.stdout.write(f"Article size category: {article_size_category}\n")  # Debugging line


            else:
                article_size_category = "Unknown"
        else:
            article_size_category = "Unknown"

        end_date = datetime.now() - relativedelta(days=datetime.now().day)  # Last day of the previous month
        start_date = end_date - relativedelta(months=1)  # Last day of the month before the previous month

        end_date_str = end_date.strftime('%Y%m%d') + '00'
        start_date_str = start_date.strftime('%Y%m%d') + '00'
        views_count = 0  # Initialize views_count to 0
        try:
            views_res = requests.get(
                f"https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/all-agents/{title.replace(' ', '_')}/monthly/{start_date_str}/{end_date_str}",
                headers=headers
            )
            if views_res.status_code == 200:
                views_data = views_res.json()
                views_count = sum(item['views'] for item in views_data.get('items', []))
            else:
                print(f"Bad request: {views_res.content}")
        except Exception as e:
            print(f"Exception while fetching views: {e}")

        return {
            'title': title,
            'img_url': img_url,
            'first_sentence': first_sentence,
            'url': final_url,
            'views': views_count,
            'size': article_size_category
        }
    else:
        return None

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

@app.route('/mark_interesting', methods=['POST'])
def mark_interesting():
    data = request.json
    title = data['title']
    url = data['url']

    # Load the articles from articles.json
    try:
        with open('articles.json', 'r') as f:
            articles_data = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        articles_data = []

    # Check if the article already exists
    article_exists = False
    for article in articles_data:
        if article['title'] == title and article['url'] == url:
            article['interesting'] = 'yes'
            article_exists = True
            break

    # If the article doesn't exist, add it with the "interesting" field set to "yes"
    if not article_exists:
        articles_data.append({
            'title': title,
            'url': url,
            'interesting': 'yes'
        })

    # Save the changes to articles.json
    with open('articles.json', 'w') as f:
        json.dump(articles_data, f, indent=4)

    return jsonify(success=True)


@app.route('/get_interesting_articles', methods=['GET'])
def get_interesting_articles():
    interesting_articles = [article for article in articles if article.get('interesting') == 'yes']
    return jsonify(interesting_articles)



if __name__ == "__main__":
    app.run(port=3000, debug=True)