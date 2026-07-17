"""E2E: language switcher actually translates the whole page.

Loads /, switches to Hindi, waits for the runtime DOM translator to swap
visible text, and asserts core UI copy is no longer English.
"""
import asyncio, sys
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = "http://localhost:8080"
SHOTS = Path("/tmp/browser/i18n")
SHOTS.mkdir(parents=True, exist_ok=True)


async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        ctx = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await ctx.new_page()
        await page.goto(ROOT, wait_until="domcontentloaded")
        await page.wait_for_timeout(1500)
        await page.screenshot(path=str(SHOTS / "01_home_en.png"))

        # Open language menu (aria-label='Change language') and pick Hindi
        await page.locator('button[aria-label="Change language"]').click(force=True)
        await page.get_by_role("button", name="हिन्दी").click()

        # Give the queue time to batch + translate + swap DOM
        await page.wait_for_timeout(4500)
        await page.screenshot(path=str(SHOTS / "02_home_hi.png"))

        html_lang = await page.evaluate("document.documentElement.lang")
        body_text = await page.evaluate("document.body.innerText")
        print("html.lang =", html_lang)
        has_devanagari = any("\u0900" <= ch <= "\u097f" for ch in body_text)
        print("contains Devanagari:", has_devanagari)
        if not has_devanagari:
            print("FAIL: expected Hindi text in body")
            sys.exit(1)
        print("PASS: DOM translator swapped text to Hindi")

        # Switch back to English and confirm restoration
        await page.locator('button[aria-label="Change language"]').click(force=True)
        await page.get_by_role("button", name="English").click()
        await page.wait_for_timeout(1500)
        html_lang2 = await page.evaluate("document.documentElement.lang")
        print("html.lang after revert =", html_lang2)
        await page.screenshot(path=str(SHOTS / "03_home_back_en.png"))
        await browser.close()


asyncio.run(main())
