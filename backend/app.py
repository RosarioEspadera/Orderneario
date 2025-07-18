# backend/app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

# Connect to Supabase Postgres
conn = psycopg2.connect(os.getenv("postgresql://postgres:Rosario1072005hackdogkagid@db.neigxicrhalonnsaqkud.supabase.co:5432/postgres
"))
cursor = conn.cursor()

@app.route('/api/stores', methods=['GET', 'POST'])
def stores():
    if request.method == 'GET':
        cursor.execute("SELECT * FROM stores")
        rows = cursor.fetchall()
        return jsonify(rows)
    else:
        data = request.json
        cursor.execute("""
            INSERT INTO stores (name, address, lat, lng, owner_id)
            VALUES (%s, %s, %s, %s, %s)
        """, (data['name'], data['address'], data['lat'], data['lng'], data['owner_id']))
        conn.commit()
        return '', 204

@app.route('/api/foods', methods=['GET', 'POST'])
def foods():
    if request.method == 'GET':
        store_id = request.args.get('store_id')
        cursor.execute("SELECT * FROM foods WHERE store_id = %s", (store_id,))
        rows = cursor.fetchall()
        return jsonify(rows)
    else:
        data = request.json
        cursor.execute("""
            INSERT INTO foods (name, description, price, image_url, store_id)
            VALUES (%s, %s, %s, %s, %s)
        """, (data['name'], data['description'], data['price'], data['image_url'], data['store_id']))
        conn.commit()
        return '', 204

@app.route('/api/orders', methods=['POST'])
def orders():
    data = request.json
    cursor.execute("""
        INSERT INTO orders (user_id, food_id, status, timestamp)
        VALUES (%s, %s, %s, %s)
    """, (data['user_id'], data['food_id'], 'pending', data['timestamp']))
    conn.commit()
    return '', 204

@app.route('/api/users/<user_id>', methods=['GET'])
def user_profile(user_id):
    cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
    row = cursor.fetchone()
    return jsonify(row)

if __name__ == '__main__':
    app.run(debug=True)
