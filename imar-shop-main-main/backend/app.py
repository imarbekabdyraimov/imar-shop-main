from flask import Flask
from flask_cors import CORS
from flask_session import Session

from models import db
from routes.auth import auth_bp
from routes.cart import cart_bp


def create_app():
    # Создаём экземпляр Flask-приложения.
    app = Flask(__name__)

    # Базовая конфигурация приложения и базы данных.
    app.config["SECRET_KEY"] = "mall-project-secret-key"
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///database.db"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    # Настройка серверных сессий через Flask-Session.
    app.config["SESSION_TYPE"] = "filesystem"
    app.config["SESSION_PERMANENT"] = False
    app.config["SESSION_USE_SIGNER"] = True

    # Разрешаем запросы с фронтенда, который может открываться через file://.
    CORS(app, supports_credentials=True)

    # Подключаем расширения Flask.
    db.init_app(app)
    Session(app)

    # Регистрируем blueprints с маршрутами авторизации и корзины.
    app.register_blueprint(auth_bp)
    app.register_blueprint(cart_bp)

    return app


app = create_app()


with app.app_context():
    # При запуске автоматически создаём таблицы, если их ещё нет.
    db.create_all()


if __name__ == "__main__":
    # Локальный запуск сервера разработки.
    app.run(debug=True, port=5000)
