from flask_sqlalchemy import SQLAlchemy


# Общий экземпляр SQLAlchemy, который будет инициализирован в app.py.
db = SQLAlchemy()


class User(db.Model):
    # Название таблицы задаём явно для понятности.
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True, nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False)
    # В учебном проекте пароль хранится как обычная строка.
    password = db.Column(db.String(255), nullable=False)


class CartItem(db.Model):
    # Таблица товаров в корзине пользователя.
    __tablename__ = "cart_items"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    product_name = db.Column(db.String(255), nullable=False)
    price = db.Column(db.Float, nullable=False)
    quantity = db.Column(db.Integer, nullable=False, default=1)
