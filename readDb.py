import sqlite3

conn = sqlite3.connect("articles.db")
c = conn.cursor()

# Add the 'watched' column
c.execute("ALTER TABLE articles ADD COLUMN watched INTEGER")

conn.commit()
conn.close()
