from flask import Flask, jsonify, request

app = Flask(__name__)

@app.route('/api/status')
def status():
    return jsonify({"status": "Atlasio Systems Online", "security_level": "High"})

if __name__ == '__main__':
    app.run(debug=True)
