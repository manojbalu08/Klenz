from fastapi.testclient import TestClient

from app import security

from .conftest import ADMIN_EMAIL, ADMIN_PASSWORD, ClientFactory, login


def test_login_and_me(client: TestClient) -> None:
    response = client.post("/api/auth/login", json={"email": " Admin@Klenz.com ", "password": ADMIN_PASSWORD})

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["user"]["email"] == ADMIN_EMAIL
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {body['access_token']}"})
    assert me.json()["email"] == ADMIN_EMAIL


def test_wrong_credentials_are_rejected(client: TestClient) -> None:
    for email, password in ((ADMIN_EMAIL, "nope-nope"), ("someone@else.com", ADMIN_PASSWORD)):
        response = client.post("/api/auth/login", json={"email": email, "password": password})
        assert response.status_code == 401
        assert response.json()["detail"] == "Wrong email or password."


def test_admin_routes_need_a_valid_token(client: TestClient) -> None:
    assert client.get("/api/admin/dashboard").status_code == 401
    assert client.get("/api/admin/dashboard", headers={"Authorization": "Bearer not-a-token"}).status_code == 401
    assert client.get("/api/admin/dashboard", headers=login(client)).status_code == 200


def test_repeated_failures_are_rate_limited(make_client: ClientFactory) -> None:
    client = make_client(max_login_failures=3)
    for _ in range(3):
        client.post("/api/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong-password"})

    response = client.post("/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert response.status_code == 429


def test_password_change_signs_out_old_sessions(client: TestClient) -> None:
    old_headers = login(client)
    other_session = login(client, remember=True)

    wrong = client.post(
        "/api/admin/account/password",
        headers=old_headers,
        json={"current_password": "not-it", "new_password": "a-new-password"},
    )
    assert wrong.status_code == 400

    response = client.post(
        "/api/admin/account/password",
        headers=old_headers,
        json={"current_password": ADMIN_PASSWORD, "new_password": "a-new-password"},
    )
    assert response.status_code == 200, response.text
    new_headers = {"Authorization": f"Bearer {response.json()['access_token']}"}

    assert client.get("/api/auth/me", headers=old_headers).status_code == 401
    assert client.get("/api/auth/me", headers=other_session).status_code == 401
    assert client.get("/api/auth/me", headers=new_headers).status_code == 200
    login(client, password="a-new-password")


def test_password_hash_format() -> None:
    stored = security.hash_password("secret-password")

    assert stored.startswith("pbkdf2_sha256$1000$")
    assert security.verify_password("secret-password", stored)
    assert not security.verify_password("other-password", stored)
    assert not security.verify_password("secret-password", "garbage")
