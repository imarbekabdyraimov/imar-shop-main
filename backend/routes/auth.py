from flask import Blueprint, jsonify, request, session

from models import User, db


# Blueprint для маршрутов авторизации.
auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/register", methods=["POST"])
def register():
    # Получаем JSON-данные из запроса.
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    email = (data.get("email") or "").strip()
    password = (data.get("password") or "").strip()

    # Проверяем, что все обязательные поля заполнены.
    if not username or not email or not password:
        return jsonify({"success": False, "message": "Все поля обязательны"}), 400

    # Проверяем уникальность имени пользователя.
    if User.query.filter_by(username=username).first():
        return jsonify({"success": False, "message": "Имя пользователя уже занято"}), 400

    # Проверяем уникальность e-mail.
    if User.query.filter_by(email=email).first():
        return jsonify({"success": False, "message": "E-mail уже занят"}), 400

    # Создаём нового пользователя и сохраняем его в базе.
    user = User(username=username, email=email, password=password)
    db.session.add(user)
    db.session.commit()

    return jsonify({"success": True, "message": "Пользователь успешно зарегистрирован"}), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    # Получаем данные для входа.
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = (data.get("password") or "").strip()

    if not username or not password:
        return jsonify({"success": False, "message": "Введите имя пользователя и пароль"}), 400

    # Ищем пользователя по имени.
    user = User.query.filter_by(username=username).first()
    if not user or user.password != password:
        return jsonify({"success": False, "message": "Неверное имя пользователя или пароль"}), 401

    # Сохраняем идентификатор пользователя в сессии.
    session["user_id"] = user.id

    return jsonify(
        {
            "success": True,
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
            },
        }
    )


@auth_bp.route("/logout", methods=["POST"])
def logout():
    # Полностью очищаем текущую сессию.
    session.clear()
    return jsonify({"success": True})


@auth_bp.route("/me", methods=["GET"])
def get_current_user():
    # Достаём user_id из сессии и возвращаем профиль пользователя.
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"success": False, "message": "Не авторизован"}), 401

    user = User.query.get(user_id)
    if not user:
        session.clear()
        return jsonify({"success": False, "message": "Не авторизован"}), 401

    return jsonify(
        {
            "success": True,
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
            },
        }
    )
