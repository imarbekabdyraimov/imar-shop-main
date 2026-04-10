from flask import Blueprint, jsonify, request, session

from models import CartItem, db


# Blueprint для маршрутов корзины.
cart_bp = Blueprint("cart", __name__)


def get_authorized_user_id():
    # Вспомогательная функция для проверки авторизации.
    return session.get("user_id")


@cart_bp.route("/cart", methods=["GET"])
def get_cart():
    # Все маршруты корзины доступны только авторизованному пользователю.
    user_id = get_authorized_user_id()
    if not user_id:
        return jsonify({"success": False, "message": "Не авторизован"}), 401

    items = CartItem.query.filter_by(user_id=user_id).all()
    items_data = [
        {
            "id": item.id,
            "product_name": item.product_name,
            "price": item.price,
            "quantity": item.quantity,
        }
        for item in items
    ]

    return jsonify({"success": True, "items": items_data})


@cart_bp.route("/cart/add", methods=["POST"])
def add_to_cart():
    # Добавляем товар в корзину текущего пользователя.
    user_id = get_authorized_user_id()
    if not user_id:
        return jsonify({"success": False, "message": "Не авторизован"}), 401

    data = request.get_json(silent=True) or {}
    product_name = (data.get("product_name") or "").strip()
    price = data.get("price")
    quantity = data.get("quantity", 1)

    if not product_name or price is None:
        return jsonify({"success": False, "message": "Некорректные данные товара"}), 400

    item = CartItem(
        user_id=user_id,
        product_name=product_name,
        price=float(price),
        quantity=int(quantity),
    )
    db.session.add(item)
    db.session.commit()

    return jsonify({"success": True}), 201


@cart_bp.route("/cart/remove/<int:item_id>", methods=["DELETE"])
def remove_from_cart(item_id):
    # Удаляем только тот товар, который принадлежит текущему пользователю.
    user_id = get_authorized_user_id()
    if not user_id:
        return jsonify({"success": False, "message": "Не авторизован"}), 401

    item = CartItem.query.filter_by(id=item_id, user_id=user_id).first()
    if not item:
        return jsonify({"success": False, "message": "Товар не найден"}), 404

    db.session.delete(item)
    db.session.commit()

    return jsonify({"success": True})
