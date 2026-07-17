"""Shared helpers for MRV E2E scripts."""
from __future__ import annotations
import json, os
from pathlib import Path
from playwright.async_api import BrowserContext, Page

ROOT = "http://localhost:8080"
SCREENSHOT_ROOT = Path("/tmp/browser/mrv")
SCREENSHOT_ROOT.mkdir(parents=True, exist_ok=True)

FIXTURES = Path(__file__).parent.parent / "fixtures"


async def restore_session(context: BrowserContext, page: Page) -> bool:
    """Restore the injected Supabase session if present. Returns True if signed in."""
    status = os.environ.get("LOVABLE_BROWSER_AUTH_STATUS")
    if status != "injected":
        return False
    storage_key = os.environ.get("LOVABLE_BROWSER_SUPABASE_STORAGE_KEY")
    session_json = os.environ.get("LOVABLE_BROWSER_SUPABASE_SESSION_JSON")
    cookies_json = os.environ.get("LOVABLE_BROWSER_SUPABASE_COOKIES_JSON")
    if cookies_json:
        cookies = json.loads(cookies_json)
        for c in cookies:
            c["url"] = ROOT
        await context.add_cookies(cookies)
    await page.goto(ROOT)
    if storage_key and session_json:
        await page.evaluate(
            f"window.localStorage.setItem({json.dumps(storage_key)}, {json.dumps(session_json)})"
        )
    return True


def screenshot_dir(name: str) -> Path:
    d = SCREENSHOT_ROOT / name
    d.mkdir(parents=True, exist_ok=True)
    return d
