from flask import Flask, send_from_directory, make_response

app = Flask(__name__, static_folder='.', static_url_path='')

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/images/<path:filename>')
def serve_tour(filename):
    # Crear respuesta y luego modificar los headers
    response = make_response(send_from_directory('images', filename, mimetype='image/jpeg'))
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

@app.route('/<path:path>')
def send_file(path):
    return send_from_directory('.', path)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8399, debug=True)