from flask import Flask, jsonify
from flask_cors import CORS
import random
from datetime import datetime

app = Flask(__name__)
CORS(app)

@app.route('/api/stats')
def get_stats():
    return jsonify({
        "status": "ONLINE",
        "system_load": f"{random.randint(10, 45)}%",
        "active_nodes": random.randint(120, 150),
        "threat_level": random.choice(["DÜŞÜK", "ORTA", "KRİTİK"]),
        "last_update": datetime.now().strftime("%H:%M:%S"),
        "auth_code": f"ATL-{random.randint(1000, 9999)}"
    })

if __name__ == '__main__':
    print("\n🚀 ATLASIO API KÖPRÜSÜ AKTİF!")
    print("🔗 Veriler http://127.0.0.1:5000/api/stats üzerinden yayınlanıyor...\n")
    app.run(port=5000)
