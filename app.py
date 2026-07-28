import os
from flask import Flask
from config import DB_NAME
from etl import process_excel_files
from routes.views import views_bp
from routes.api import api_bp

app = Flask(__name__)

app.register_blueprint(views_bp)
app.register_blueprint(api_bp, url_prefix='/api')

if __name__ == '__main__':
    if not os.path.exists(DB_NAME):
        process_excel_files()
        
    print("🚀 Server berjalan di http://127.0.0.1:5000")
    app.run(debug=True, port=5000)