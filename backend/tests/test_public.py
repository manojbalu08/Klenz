import pytest
from fastapi.testclient import TestClient

from .conftest import ClientFactory


def test_site_returns_seeded_design_content(client: TestClient) -> None:
    site = client.get("/api/site").json()

    assert [p["name"] for p in site["products"]][:3] == ["Ultra Soft Tissue", "Soft Tissue", "Semi Soft Tissue"]
    assert len(site["products"]) == 10
    first = site["products"][0]
    assert (first["spec"], first["image_url"]) == ("80 grams", "/images/products/ultra-soft-tissue.jpg")
    assert first["price"] == 60  # starting price; the admin changes it
    assert [v["url"] for v in site["videos"]] == [
        "/videos/facial-tissue.mp4",
        "/videos/tissue-napkins.mp4",
        "/videos/rolls-and-folds.mp4",
    ]
    assert site["content"]["home.headline"] == "Soft on skin. *Strong* in every sheet."
    assert site["content"]["home.hero_video"] == "/videos/hero-facial-tissue.mp4"
    assert site["settings"]["email"] == "klenztissue@gmail.com"
    assert (site["settings"]["upi_id"], site["settings"]["upi_name"]) == ("", "Klenz")  # sample QR until set
    assert "default_theme" not in site["settings"]
    assert "site.announcement" not in site["content"]


def set_prices(client: TestClient, admin: dict[str, str], prices: dict[str, float]) -> dict[str, dict]:
    products = {p["name"]: p for p in client.get("/api/admin/products", headers=admin).json()}
    for name, price in prices.items():
        response = client.put(f"/api/admin/products/{products[name]['id']}", headers=admin,
                              json=products[name] | {"price": price})
        assert response.status_code == 200, response.text
    return products


def test_order_merges_lines_and_copies_prices(client: TestClient, admin: dict[str, str]) -> None:
    products = set_prices(client, admin, {"Premium Facial Tissue Box": 150, "HRT Roll": 1200.5})
    box, roll = products["Premium Facial Tissue Box"], products["HRT Roll"]

    response = client.post(
        "/api/orders",
        json={
            "customer_name": "  Priya  ",
            "phone": "+91 98765 43210",
            "address": "12 Lake Road, Chennai",
            "items": [
                {"product_id": box["id"], "quantity": 2},
                {"product_id": roll["id"], "quantity": 1},
                {"product_id": box["id"], "quantity": 1},
            ],
        },
    )

    assert response.status_code == 201, response.text
    order = response.json()
    assert order["reference"].startswith("KZ-1")
    assert order["item_count"] == 4
    assert [(i["product_name"], i["product_spec"], i["quantity"], i["unit_price"], i["line_total"])
            for i in order["items"]] == [
        ("Premium Facial Tissue Box", "2 Ply (Premium Quality)", 3, 150, 450),
        ("HRT Roll", "1 kg, 40 GSM", 1, 1200.5, 1200.5),
    ]
    assert (order["total"], order["price_pending"]) == (1650.5, False)
    assert (order["payment_method"], order["payment_status"], order["payment_ref"]) == ("later", "pending", "")
    assert order["created_at"].endswith(("Z", "+00:00"))

    # Later price changes do not touch the order.
    set_prices(client, admin, {"HRT Roll": 999})
    saved = client.get("/api/admin/orders", headers=admin, params={"q": "Priya"}).json()["items"][0]
    assert saved["total"] == 1650.5


def test_pay_now_records_the_upi_reference(client: TestClient, admin: dict[str, str]) -> None:
    box = set_prices(client, admin, {"Premium Facial Tissue Box": 150})["Premium Facial Tissue Box"]
    order = {"customer_name": "Priya", "phone": "9876543210", "items": [{"product_id": box["id"], "quantity": 1}]}

    paid = client.post("/api/orders", json=order | {"payment_method": "now", "payment_ref": " 412345678901 "}).json()
    later = client.post("/api/orders", json=order | {"payment_ref": "412345678901"}).json()

    assert (paid["payment_method"], paid["payment_status"], paid["payment_ref"]) == ("now", "reported", "412345678901")
    assert (later["payment_method"], later["payment_status"], later["payment_ref"]) == ("later", "pending", "")
    for bad in ({"payment_method": "card"}, {"payment_ref": "1234; DROP"}, {"payment_ref": "x" * 41}):
        assert client.post("/api/orders", json=order | bad).status_code == 422, bad


def test_unpriced_items_leave_the_total_pending(client: TestClient, admin: dict[str, str]) -> None:
    products = set_prices(client, admin, {"Toilet Roll": 40, "Kitchen Roll": 0})  # 0 = price on request
    items = [{"product_id": products["Toilet Roll"]["id"], "quantity": 5},
             {"product_id": products["Kitchen Roll"]["id"], "quantity": 2}]

    order = client.post("/api/orders", json={"customer_name": "Priya", "phone": "9876543210", "items": items}).json()

    assert (order["total"], order["price_pending"]) == (200, True)


def test_new_orders_alert_the_admin_on_whatsapp(
    client: TestClient, admin: dict[str, str], monkeypatch: pytest.MonkeyPatch
) -> None:
    sent: list[tuple[str, str, str]] = []

    def fake_send(phone: str, apikey: str, text: str) -> tuple[bool, str]:
        sent.append((phone, apikey, text))
        return True, "Message queued"

    monkeypatch.setattr("app.notify.send_whatsapp", fake_send)
    box = set_prices(client, admin, {"Premium Facial Tissue Box": 1250})["Premium Facial Tissue Box"]
    order = {"customer_name": "Priya", "phone": "9876543210", "items": [{"product_id": box["id"], "quantity": 80}]}

    client.post("/api/orders", json=order)  # no CallMeBot key yet: nothing is sent
    assert sent == []

    client.put("/api/admin/settings/alerts", headers=admin, json={"phone": "", "apikey": "123456"})
    created = client.post("/api/orders", json=order | {"payment_method": "now", "payment_ref": "412345678901"}).json()

    [(phone, apikey, text)] = sent
    assert (phone, apikey) == ("+91 95663 78152", "123456")  # falls back to the WhatsApp number for orders
    assert f"*New order {created['reference']}*" in text
    assert "• 80 × Premium Facial Tissue Box (2 Ply (Premium Quality)): ₹1,00,000" in text
    assert "*Total: ₹1,00,000*" in text
    assert "Payment: Paid by UPI QR, UPI ref 412345678901 (check your bank)" in text
    assert "Name: Priya" in text


def test_order_rejects_draft_and_unknown_products(client: TestClient, admin: dict[str, str]) -> None:
    product = client.get("/api/admin/products", headers=admin).json()[0]
    client.put(f"/api/admin/products/{product['id']}", headers=admin, json=product | {"is_live": False})

    response = client.post(
        "/api/orders",
        json={
            "customer_name": "Priya",
            "phone": "9876543210",
            "items": [{"product_id": product["id"], "quantity": 1}, {"product_id": 999999, "quantity": 1}],
        },
    )

    assert response.status_code == 409
    assert sorted(response.json()["detail"]["unavailable"]) == [product["id"], 999999]


def test_order_validation(client: TestClient) -> None:
    product_id = client.get("/api/site").json()["products"][0]["id"]
    good = {"customer_name": "Priya", "phone": "9876543210", "items": [{"product_id": product_id, "quantity": 1}]}

    assert client.post("/api/orders", json=good).status_code == 201
    for bad in (
        good | {"items": []},
        good | {"customer_name": "   "},
        good | {"phone": "call me"},
        good | {"phone": "123"},
        good | {"items": [{"product_id": product_id, "quantity": 0}]},
        good | {"items": [{"product_id": product_id, "quantity": 100}]},
    ):
        assert client.post("/api/orders", json=bad).status_code == 422, bad


def test_orders_are_rate_limited(make_client: ClientFactory) -> None:
    client = make_client(max_orders_per_hour=2)
    product_id = client.get("/api/site").json()["products"][0]["id"]
    order = {"customer_name": "Priya", "phone": "9876543210", "items": [{"product_id": product_id, "quantity": 1}]}

    assert [client.post("/api/orders", json=order).status_code for _ in range(3)] == [201, 201, 429]


def test_health(client: TestClient) -> None:
    assert client.get("/api/health").json()["status"] == "ok"


def test_health_reports_the_deployed_commit(make_client: ClientFactory) -> None:
    # The GitHub Actions deploy waits until this matches the commit it pushed.
    client = make_client(git_commit="abc123")
    assert client.get("/api/health").json()["commit"] == "abc123"
