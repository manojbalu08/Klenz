from decimal import Decimal

from app.models import Order, OrderItem
from app.notify import order_alert_text, rupees


def test_rupees_use_indian_grouping() -> None:
    amounts = ("0", "240.50", "1250", "125000", "12345678.9")
    assert [rupees(Decimal(a)) for a in amounts] == ["₹0", "₹240.50", "₹1,250", "₹1,25,000", "₹1,23,45,678.90"]


def test_alert_for_an_order_without_prices_says_on_request() -> None:
    order = Order(id=7, customer_name="Priya", phone="9876543210", address="", note="", total=Decimal("0"),
                  payment_method="later", payment_status="pending", payment_ref="")
    order.items.append(OrderItem(product_name="Toilet Roll", product_spec="100 pulls", quantity=3,
                                 unit_price=Decimal("0"), line_total=Decimal("0")))

    text = order_alert_text(order)

    assert "*New order KZ-10007*" in text
    assert "• 3 × Toilet Roll (100 pulls): price on request" in text
    assert "*Total: on request*" in text
    assert "Payment: Pay later" in text
