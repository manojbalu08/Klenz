from pathlib import Path

from .conftest import ClientFactory


def test_built_frontend_is_served_with_spa_fallback(make_client: ClientFactory, tmp_path: Path) -> None:
    dist = tmp_path / "dist"
    (dist / "assets").mkdir(parents=True)
    (dist / "index.html").write_text("<div id=root></div>", encoding="utf-8")
    (dist / "assets" / "app.js").write_text("console.log('klenz')", encoding="utf-8")
    (dist / "favicon.svg").write_text("<svg/>", encoding="utf-8")
    (tmp_path / "secret.txt").write_text("do not serve", encoding="utf-8")

    client = make_client(frontend_dist=dist)

    assert client.get("/").text == "<div id=root></div>"
    assert client.get("/admin/products").text == "<div id=root></div>"
    assert client.get("/assets/app.js").text == "console.log('klenz')"
    assert client.get("/favicon.svg").text == "<svg/>"
    assert "do not serve" not in client.get("/..%2fsecret.txt").text
    assert client.get("/api/unknown").status_code == 404
    assert client.get("/api/site").status_code == 200
