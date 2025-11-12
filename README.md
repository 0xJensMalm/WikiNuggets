# WikiNuggets

Static, serverless version. All data is stored in your browser using localStorage.

How to run
- Open `WikiNuggets/index.html` in a modern browser.
- If your browser blocks cross-origin requests from file URLs, serve the folder locally (no backend needed), for example:

```bash
cd /Users/jens-aidn/Documents/Koding/Nettsider/WikiNuggets
python3 -m http.server 8080
```

Then visit `http://localhost:8080/index.html`.

Notes
- No Python/Flask server is required anymore.
- Random articles, sizes, and pageview stats are fetched directly from Wikimedia APIs.
- User stats and the list of read articles are persisted in localStorage and remain in your browser.