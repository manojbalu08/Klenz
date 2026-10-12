from fastapi.testclient import TestClient

from .conftest import ClientFactory


def test_site_returns_seeded_design_content(client: TestClient) -> None:
    site = client.get("/api/site").json()

    assert [p["name"] for p in site["products"]][:3] == ["Ultra Soft Tissue", "Soft Tissue", "Semi Soft Tissue"]
    assert len(site["products"]) == 10
    first = site["products"][0]
    assert (first["spec"], first["image_url"]) == ("80 grams", "/images/products/ultra-soft-tissue.jpg")
    assert "price" not in first
    assert [v["url"] for v in site["videos"]] == [
        "/videos/facial-tissue.mp4",
        "/videos/tissue-napkins.mp4",
        "/videos/rolls-and-folds.mp4",
    ]
    assert site["content"]["home.headline"] == "Soft on skin. *Strong* in every sheet."
    assert site["content"]["home.hero_video"] == "/videos/hero-facial-tissue.mp4"
    assert site["settings"]["email"] == "klenztissue@gmail.com"
    assert "default_theme" not in site["settings"]


def test_order_merges_lines_and_copies_pack_size(client: TestClient) -> None:
    products = {p["name"]: p for p in client.get("/api/site").json()["products"]}
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
    assert "total" not in order
    assert [(i["product_name"], i["product_spec"], i["quantity"]) for i in order["items"]] == [
        ("Premium Facial Tissue Box", "2 Ply (Premium Quality)", 3),
        ("HRT Roll", "1 kg, 40 GSM", 1),
    ]
    assert order["created_at"].endswith(("Z", "+00:00"))


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
