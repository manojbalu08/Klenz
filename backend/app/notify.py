"""WhatsApp alerts to the admin for new orders, through the free CallMeBot service.

The admin activates CallMeBot once from their own WhatsApp (DEPLOY.md) and saves the API key in
Admin → Settings. Without a key nothing is sent. CallMeBot only messages the phone that activated it.
"""

import logging
import re
import urllib.error
import urllib.parse
import urllib.request
from decimal import Decimal

from .models import Order

log = logging.getLogger("uvicorn.error")

CALLMEBOT_URL = "https://api.callmebot.com/whatsapp.php"


def rupees(amount: Decimal | float | int) -> str:
    """Indian grouping, paise only when needed: ₹1,25,000 or ₹240.50."""
    whole, _, paise = f"{Decimal(amount):.2f}".partition(".")
    head, tail = whole[:-3], whole[-3:]
    groups: list[str] = []
    while len(head) > 2:
        groups.insert(0, head[-2:])
        head = head[:-2]
    if head:
        groups.insert(0, head)
    text = ",".join([*groups, tail])
    return f"₹{text}" if paise == "00" else f"₹{text}.{paise}"


def payment_label(order: Order) -> str:
    if order.payment_status == "paid":
        return "Paid"
    if order.payment_method == "now":
        reference = f", UPI ref {order.payment_ref}" if order.payment_ref else ""
        return f"Paid by UPI QR{reference} (check your bank)"
    return "Pay later"


def order_alert_text(order: Order) -> str:
    lines = [f"*New order {order.reference}*", ""]
    for item in order.items:
        spec = f" ({item.product_spec})" if item.product_spec else ""
        price = rupees(item.line_total) if item.unit_price > 0 else "price on request"
        lines.append(f"• {item.quantity} × {item.product_name}{spec}: {price}")
    if order.total <= 0 and order.price_pending:
        total = "on request"
    else:
        total = rupees(order.total) + (" + items on request" if order.price_pending else "")
    lines += ["", f"*Total: {total}*", f"Payment: {payment_label(order)}", "",
              f"Name: {order.customer_name}", f"Phone: {order.phone}"]
    if order.address:
        lines.append(f"Address: {order.address}")
    if order.note:
        lines.append(f"Note: {order.note}")
    return "\n".join(lines)


def send_whatsapp(phone: str, apikey: str, text: str, timeout: float = 15) -> tuple[bool, str]:
    """Send one message; returns (sent, what CallMeBot answered or the error)."""
    query = urllib.parse.urlencode(
        {"phone": "+" + re.sub(r"\D", "", phone), "text": text, "apikey": apikey},
        quote_via=urllib.parse.quote,
    )
    try:
        with urllib.request.urlopen(f"{CALLMEBOT_URL}?{query}", timeout=timeout) as response:
            body = response.read(4000).decode("utf-8", "replace")
    except urllib.error.HTTPError as error:
        body = error.read(4000).decode("utf-8", "replace")
        return False, _plain(body) or f"HTTP {error.code}"
    except (OSError, ValueError) as error:  # no network, timeout, DNS
        return False, str(error)
    answer = _plain(body)
    return bool(re.search(r"queued|sent", answer, re.IGNORECASE)), answer


def send_order_alert(phone: str, apikey: str, text: str) -> None:
    """Background task after an order is saved; a failure only gets logged."""
    sent, answer = send_whatsapp(phone, apikey, text)
    if not sent:
        log.warning("WhatsApp order alert not sent: %s", answer)


def _plain(html: str) -> str:
    return " ".join(re.sub(r"<[^>]+>", " ", html).split())[:300]
