from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from .conftest import IN_MEMORY, TEST_DATABASE_URL, ClientFactory, login

NEW_PRODUCT = {
    "name": "Hand Towel Pack",
    "category": "Kitchen",
    "description": "Thick towels for washrooms.",
    "spec": "50 sheets",
    "price": 120.5,
    "art": "towel",
    "tint": "soft",
    "image_url": "",
    "is_live": True,
}


def test_dashboard_matches_seed(client: TestClient, admin: dict[str, str]) -> None:
    body = client.get("/api/admin/dashboard", headers=admin).json()

    assert body["stats"] == {"products_listed": 10, "new_enquiries": 2, "quotes_sent": 1, "pages_published": 3}
    assert [o["customer_name"] for o in body["latest_orders"]] == [
        "Sample Hotel Group",
        "Sample Supermarket",
        "Sample Café",
    ]
    assert body["latest_orders"][0]["summary"] == "HRT Roll × 20, Toilet Roll × 120"
    assert body["latest_orders"][0]["item_count"] == 140


def test_product_lifecycle(client: TestClient, admin: dict[str, str]) -> None:
    created = client.post("/api/admin/products", headers=admin, json=NEW_PRODUCT)
    assert created.status_code == 201, created.text
    product = created.json()
    assert product["sort_order"] == 10
    shop = {p["name"]: p for p in client.get("/api/site").json()["products"]}
    assert shop["Hand Towel Pack"]["price"] == 120.5

    # Drafts disappear from the shop but stay in the admin list.
    updated = client.put(
        f"/api/admin/products/{product['id']}", headers=admin, json=NEW_PRODUCT | {"spec": "100 sheets", "is_live": False}
    )
    assert updated.json()["spec"] == "100 sheets"
    assert "Hand Towel Pack" not in [p["name"] for p in client.get("/api/site").json()["products"]]

    ids = [p["id"] for p in client.get("/api/admin/products", headers=admin).json()]
    reordered = client.post("/api/admin/products/reorder", headers=admin, json={"ids": ids[::-1]})
    assert [p["id"] for p in reordered.json()] == ids[::-1]
    assert client.post("/api/admin/products/reorder", headers=admin, json={"ids": ids[:-1]}).status_code == 422

    assert client.delete(f"/api/admin/products/{product['id']}", headers=admin).status_code == 204
    assert client.put(f"/api/admin/products/{product['id']}", headers=admin, json=NEW_PRODUCT).status_code == 404


def test_product_validation(client: TestClient, admin: dict[str, str]) -> None:
    for bad in (
        NEW_PRODUCT | {"name": ""},
        NEW_PRODUCT | {"spec": "x" * 121},
        NEW_PRODUCT | {"art": "spaceship"},
        NEW_PRODUCT | {"price": -1},
        NEW_PRODUCT | {"price": 9.999},
        NEW_PRODUCT | {"price": "free"},
        NEW_PRODUCT | {"image_url": "javascript:alert(1)"},
    ):
        assert client.post("/api/admin/products", headers=admin, json=bad).status_code == 422, bad
    for good in ("/images/products/facial-tissue.jpg", "https://cdn.example.com/box.jpg"):
        response = client.post("/api/admin/products", headers=admin, json=NEW_PRODUCT | {"image_url": good})
        assert response.status_code == 201, response.text
    protocol_relative = client.post("/api/admin/products", headers=admin, json=NEW_PRODUCT | {"image_url": "//evil.com/x.jpg"})
    assert protocol_relative.status_code == 422


def test_deleting_a_product_keeps_past_orders(client: TestClient, admin: dict[str, str]) -> None:
    hrt = next(p for p in client.get("/api/admin/products", headers=admin).json() if p["name"] == "HRT Roll")

    assert client.delete(f"/api/admin/products/{hrt['id']}", headers=admin).status_code == 204

    hotel = client.get("/api/admin/orders", headers=admin, params={"q": "Hotel"}).json()["items"][0]
    assert hotel["items"][0] == {
        "product_id": None,
        "product_name": "HRT Roll",
        "product_spec": "1 kg, 40 GSM",
        "quantity": 20,
        "unit_price": 0.0,
        "line_total": 0.0,
    }


def test_orders_filter_search_and_status(client: TestClient, admin: dict[str, str]) -> None:
    listing = client.get("/api/admin/orders", headers=admin).json()
    assert listing["counts"] == {"new": 2, "quoted": 1, "closed": 0, "all": 3}

    new_only = client.get("/api/admin/orders", headers=admin, params={"status": "new"}).json()
    assert {o["customer_name"] for o in new_only["items"]} == {"Sample Hotel Group", "Sample Supermarket"}

    cafe = client.get("/api/admin/orders", headers=admin, params={"q": "café"}).json()["items"]
    assert [o["customer_name"] for o in cafe] == ["Sample Café"]
    by_reference = client.get("/api/admin/orders", headers=admin, params={"q": cafe[0]["reference"]}).json()
    assert [o["id"] for o in by_reference["items"]] == [cafe[0]["id"]]
    assert client.get("/api/admin/orders", headers=admin, params={"q": "100%"}).json()["total"] == 0

    order_id = cafe[0]["id"]
    patched = client.patch(f"/api/admin/orders/{order_id}", headers=admin, json={"status": "closed"})
    assert patched.json()["status"] == "closed"
    assert client.patch(f"/api/admin/orders/{order_id}", headers=admin, json={"status": "lost"}).status_code == 422

    assert cafe[0]["payment_method"] == "later" and cafe[0]["payment_status"] == "pending"
    paid = client.patch(f"/api/admin/orders/{order_id}", headers=admin, json={"payment_status": "paid"}).json()
    assert (paid["payment_status"], paid["status"]) == ("paid", "closed")
    assert client.patch(f"/api/admin/orders/{order_id}", headers=admin, json={"payment_status": "maybe"}).status_code == 422
    assert client.patch(f"/api/admin/orders/{order_id}", headers=admin, json={}).status_code == 422

    assert client.delete(f"/api/admin/orders/{order_id}", headers=admin).status_code == 204
    assert client.get(f"/api/admin/orders/{order_id}", headers=admin).status_code == 404


def test_content_editing(client: TestClient, admin: dict[str, str]) -> None:
    pages = client.get("/api/admin/content", headers=admin).json()
    assert [p["id"] for p in pages] == ["home", "about", "contact", "site"]

    response = client.put(
        "/api/admin/content",
        headers=admin,
        json={"values": {"home.headline": " Softest *tissue* in town ", "about.photo_url": ""}},
    )
    assert response.status_code == 200, response.text
    assert client.get("/api/site").json()["content"]["home.headline"] == "Softest *tissue* in town"

    unknown = client.put("/api/admin/content", headers=admin, json={"values": {"home.nope": "x"}})
    assert unknown.status_code == 422
    bad_url = client.put("/api/admin/content", headers=admin, json={"values": {"about.photo_url": "not a link"}})
    assert bad_url.status_code == 422


def test_settings(client: TestClient, admin: dict[str, str]) -> None:
    payload = {
        "whatsapp_number": "+91 98765 43210",
        "phone": "044 2345 6789",
        "email": "hello@klenz.in",
        "address": "Plot 4, SIDCO Estate, Chennai 600098",
        "hours": "Mon–Sat, 9:00 – 18:00",
        "country_code": "91",
        "upi_id": "9087312905@okicici",
        "upi_name": "Klenz Tissue",
    }
    response = client.put("/api/admin/settings", headers=admin, json=payload)
    assert response.status_code == 200, response.text
    assert client.get("/api/site").json()["settings"] == payload

    bank_account = payload | {"upi_id": "123456789012@SBIN0001234.ifsc.npci"}
    assert client.put("/api/admin/settings", headers=admin, json=bank_account).status_code == 200
    for bad in ({"whatsapp_number": "abc"}, {"email": "nope"}, {"country_code": "+91"}, {"upi_id": "klenz upi"}):
        assert client.put("/api/admin/settings", headers=admin, json=payload | bad).status_code == 422, bad


def test_order_alert_settings_keep_the_key_secret(
    client: TestClient, admin: dict[str, str], monkeypatch: pytest.MonkeyPatch
) -> None:
    alerts = "/api/admin/settings/alerts"
    assert client.get(alerts, headers=admin).json() == {"phone": "", "apikey_set": False}
    assert client.post(f"{alerts}/test", headers=admin).status_code == 400

    saved = client.put(alerts, headers=admin, json={"phone": "+91 90873 12905", "apikey": "123456"}).json()
    assert saved == {"phone": "+91 90873 12905", "apikey_set": True}
    # Leaving the key out keeps it; the key never comes back, not even to the admin or the shop.
    assert client.put(alerts, headers=admin, json={"phone": "+91 90000 00009"}).json()["apikey_set"] is True
    assert "123456" not in client.get(alerts, headers=admin).text
    assert "123456" not in client.get("/api/site").text

    sent: list[tuple[str, str, str]] = []

    def fake_send(phone: str, apikey: str, text: str) -> tuple[bool, str]:
        sent.append((phone, apikey, text))
        return True, "Message queued"

    monkeypatch.setattr("app.notify.send_whatsapp", fake_send)
    assert client.post(f"{alerts}/test", headers=admin).json() == {"ok": True, "detail": "Message queued"}
    assert sent[0][:2] == ("+91 90000 00009", "123456")

    assert client.put(alerts, headers=admin, json={"phone": "", "apikey": ""}).json()["apikey_set"] is False
    assert client.put(alerts, headers=admin, json={"phone": "call me"}).status_code == 422


def test_unedited_old_page_text_is_upgraded(make_client: ClientFactory, tmp_path: Path) -> None:
    url = f"sqlite:///{(tmp_path / 'klenz.db').as_posix()}" if IN_MEMORY else TEST_DATABASE_URL
    first = make_client(database_url=url)
    old_texts = {"home.step2_title": "Send on WhatsApp", "home.step3_text": "Our own words"}
    first.put("/api/admin/content", headers=login(first), json={"values": old_texts})

    content = make_client(database_url=url, fresh=False).get("/api/site").json()["content"]

    assert content["home.step2_title"] == "Place your order"  # old default: replaced
    assert content["home.step3_text"] == "Our own words"  # edited by the admin: kept
    assert "site.announcement" not in content


def test_videos(client: TestClient, admin: dict[str, str]) -> None:
    created = client.post(
        "/api/admin/videos", headers=admin, json={"title": "Launch", "url": "https://youtu.be/dQw4w9WgXcQ"}
    )
    assert created.status_code == 201, created.text
    video = created.json()

    updated = client.put(f"/api/admin/videos/{video['id']}", headers=admin, json={"title": "Launch day", "url": ""})
    assert updated.json() == {"id": video["id"], "title": "Launch day", "url": ""}

    ids = [v["id"] for v in client.get("/api/admin/videos", headers=admin).json()]
    client.post("/api/admin/videos/reorder", headers=admin, json={"ids": [ids[-1], *ids[:-1]]})
    assert client.get("/api/site").json()["videos"][0]["title"] == "Launch day"

    bad = client.post("/api/admin/videos", headers=admin, json={"title": "x", "url": "ftp://example.com/v.mp4"})
    assert bad.status_code == 422
    assert client.delete(f"/api/admin/videos/{video['id']}", headers=admin).status_code == 204


def test_starter_data_is_added_only_once(make_client: ClientFactory, tmp_path: Path) -> None:
    url = f"sqlite:///{(tmp_path / 'klenz.db').as_posix()}" if IN_MEMORY else TEST_DATABASE_URL
    first = make_client(database_url=url)
    admin = login(first)
    product_id = first.get("/api/admin/products", headers=admin).json()[0]["id"]
    first.delete(f"/api/admin/products/{product_id}", headers=admin)

    restarted = make_client(database_url=url, fresh=False)

    assert len(restarted.get("/api/site").json()["products"]) == 9
    assert len(restarted.get("/api/admin/orders", headers=login(restarted)).json()["items"]) == 3
