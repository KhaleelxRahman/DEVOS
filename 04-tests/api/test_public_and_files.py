import io
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.db.base import Base
from app.db.session import engine


@pytest_asyncio.fixture
async def client():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


async def _register(client, email="owner@example.com", name="Owner"):
    res = await client.post(
        "/api/v1/auth/register",
        json={"name": name, "email": email, "password": "supersecret1"},
    )
    assert res.status_code == 200, res.text
    return {"Authorization": f"Bearer {res.json()['data']['token']}"}


async def _create_project(client, headers, name="demo-project"):
    res = await client.post("/api/v1/projects", json={"name": name}, headers=headers)
    assert res.status_code == 200, res.text
    return res.json()["data"]["id"]


# ---------- Waitlist (intentionally public) ----------


@pytest.mark.asyncio
async def test_waitlist_join_and_duplicate(client):
    res = await client.post(
        "/api/v1/waitlist", json={"email": "Early@Example.com", "name": "Early"}
    )
    assert res.status_code == 200, res.text
    assert res.json()["data"]["status"] == "joined"

    again = await client.post("/api/v1/waitlist", json={"email": "early@example.com"})
    assert again.status_code == 200
    assert again.json()["data"]["status"] == "already_registered"


@pytest.mark.asyncio
async def test_waitlist_validation_rejects_bad_email(client):
    res = await client.post("/api/v1/waitlist", json={"email": "not-an-email"})
    assert res.status_code in (400, 422)


# ---------- Contact (intentionally public) ----------


@pytest.mark.asyncio
async def test_contact_submission(client):
    payload = {
        "name": "Dev",
        "email": "dev@example.com",
        "subject": "Hello",
        "message": "This is a test message.",
    }
    res = await client.post("/api/v1/contact", json=payload)
    assert res.status_code == 200, res.text
    assert res.json()["data"]["status"] == "received"


@pytest.mark.asyncio
async def test_contact_honeypot_rejected(client):
    payload = {
        "name": "Bot",
        "email": "bot@example.com",
        "subject": "Spam",
        "message": "Buy things",
        "website": "http://spam",
    }
    res = await client.post("/api/v1/contact", json=payload)
    assert res.status_code == 200  # fake success; nothing persisted


@pytest.mark.asyncio
async def test_contact_rejects_html_and_oversize(client):
    html = await client.post(
        "/api/v1/contact",
        json={
            "name": "Dev",
            "email": "dev@example.com",
            "subject": "<script>alert(1)</script>",
            "message": "hi",
        },
    )
    assert html.status_code in (400, 422)
    big = await client.post(
        "/api/v1/contact",
        json={
            "name": "Dev",
            "email": "dev@example.com",
            "subject": "s",
            "message": "x" * 5000,
        },
    )
    assert big.status_code in (400, 422)


# ---------- File CRUD ----------


@pytest.mark.asyncio
async def test_file_folder_create_read_save_rename_delete(client):
    headers = await _register(client)
    pid = await _create_project(client, headers)

    res = await client.post(
        f"/api/v1/projects/{pid}/files/folder",
        json={"parent_path": "", "name": "src"},
        headers=headers,
    )
    assert res.status_code == 200, res.text

    res = await client.post(
        f"/api/v1/projects/{pid}/files/file",
        json={"parent_path": "src", "name": "app.py", "content": "print(1)"},
        headers=headers,
    )
    assert res.status_code == 200, res.text
    assert res.json()["data"]["content"] == "print(1)"

    res = await client.put(
        f"/api/v1/projects/{pid}/files/src/app.py",
        json={"content": "print(2)"},
        headers=headers,
    )
    assert res.status_code == 200
    res = await client.get(f"/api/v1/projects/{pid}/files/src/app.py", headers=headers)
    assert res.json()["data"]["content"] == "print(2)"

    res = await client.post(
        f"/api/v1/projects/{pid}/files/rename",
        json={"path": "src/app.py", "new_name": "main.py"},
        headers=headers,
    )
    assert res.status_code == 200, res.text
    assert res.json()["data"]["path"] == "src/main.py"

    res = await client.delete(
        f"/api/v1/projects/{pid}/files/src/main.py", headers=headers
    )
    assert res.status_code == 200
    res = await client.get(f"/api/v1/projects/{pid}/files/src/main.py", headers=headers)
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_file_create_rejects_traversal_and_sensitive(client):
    headers = await _register(client)
    pid = await _create_project(client, headers)

    bad = await client.post(
        f"/api/v1/projects/{pid}/files/file",
        json={"parent_path": "../..", "name": "evil.txt"},
        headers=headers,
    )
    assert bad.status_code in (400, 403, 422)

    dot = await client.post(
        f"/api/v1/projects/{pid}/files/file",
        json={"parent_path": "", "name": ".env"},
        headers=headers,
    )
    assert dot.status_code in (400, 403)

    res = await client.post(
        f"/api/v1/projects/{pid}/files/file",
        json={"parent_path": "", "name": "exists.txt"},
        headers=headers,
    )
    assert res.status_code == 200
    dup = await client.post(
        f"/api/v1/projects/{pid}/files/file",
        json={"parent_path": "", "name": "exists.txt"},
        headers=headers,
    )
    assert dup.status_code in (400, 403)


# ---------- Upload ----------


@pytest.mark.asyncio
async def test_upload_files_and_blocked_extension(client):
    headers = await _register(client)
    pid = await _create_project(client, headers)

    files = {"files": ("hello.txt", io.BytesIO(b"hello world"), "text/plain")}
    res = await client.post(
        f"/api/v1/projects/{pid}/files/upload", files=files, headers=headers
    )
    assert res.status_code == 200, res.text
    assert res.json()["data"]["uploaded"] == ["hello.txt"]

    content = await client.get(
        f"/api/v1/projects/{pid}/files/hello.txt", headers=headers
    )
    assert content.json()["data"]["content"] == "hello world"

    bad = await client.post(
        f"/api/v1/projects/{pid}/files/upload",
        files={"files": ("evil.exe", io.BytesIO(b"MZ"), "application/octet-stream")},
        headers=headers,
    )
    assert bad.status_code == 200
    assert bad.json()["success"] is False
    assert bad.json()["data"]["errors"]


@pytest.mark.asyncio
async def test_upload_rejects_oversized(client):
    headers = await _register(client)
    pid = await _create_project(client, headers)
    big = io.BytesIO(b"x" * (11 * 1024 * 1024))
    res = await client.post(
        f"/api/v1/projects/{pid}/files/upload",
        files={"files": ("big.bin", big, "application/octet-stream")},
        headers=headers,
    )
    assert res.status_code == 200
    assert res.json()["success"] is False


# ---------- Cross-user file isolation ----------


@pytest.mark.asyncio
async def test_files_cross_user_denied(client):
    owner = await _register(client)
    other = await _register(client, email="other@example.com", name="Other")
    pid = await _create_project(client, owner)
    await client.post(
        f"/api/v1/projects/{pid}/files/file",
        json={"parent_path": "", "name": "secret-note.txt", "content": "mine"},
        headers=owner,
    )

    for method, url, kwargs in [
        ("get", f"/api/v1/projects/{pid}/files", {}),
        (
            "post",
            f"/api/v1/projects/{pid}/files/file",
            {"json": {"parent_path": "", "name": "x.txt"}},
        ),
        ("delete", f"/api/v1/projects/{pid}/files/secret-note.txt", {}),
        (
            "post",
            f"/api/v1/projects/{pid}/files/upload",
            {"files": {"files": ("y.txt", io.BytesIO(b"y"), "text/plain")}},
        ),
    ]:
        res = await getattr(client, method)(url, headers=other, **kwargs)
        assert res.status_code in (403, 404), f"{method} {url} -> {res.status_code}"


# ---------- Rate limiting enforcement ----------


@pytest.mark.asyncio
async def test_waitlist_rate_limit_enforced(client):
    last = None
    for i in range(7):
        last = await client.post(
            "/api/v1/waitlist", json={"email": f"bulk{i}@example.com"}
        )
        if last.status_code == 429:
            break
    assert last is not None, "Expected a response"  
    assert last.status_code == 429, "waitlist rate limit was not enforced"


@pytest.mark.asyncio
async def test_login_rate_limit_enforced(client):
    last = None
    for _ in range(12):
        last = await client.post(
            "/api/v1/auth/login", json={"email": "nope@example.com", "password": "bad"}
        )
        if last.status_code == 429:
            break
    assert last is not None, "Expected a response"
    assert last.status_code == 429, "login rate limit was not enforced"
