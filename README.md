# Unfollow All

Small Chrome extension that starts an X unfollow loop when you click the toolbar button.

## Install

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this folder: `unfollow-all`.

## Use

1. Open your X following page.
2. Click the extension toolbar button.
3. The extension evaluates only the visible viewport rows.
4. It keeps rows that clearly look related to AI, math, Vercel, design, UI, frontend development, hardware, or quant finance.
5. It unfollows unrelated rows, SaaS/sales/marketing accounts, cyber/security accounts, and trading-focused accounts.
6. After it evaluates the visible rows, it scrolls down and repeats.
7. Click **Stop** in the small bottom-right panel to stop early.

The extension only has `activeTab` access and runs on the page you clicked it from.

## Support

If this project is useful to you, you can support my work:

[![Support me on Ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/zfaka)
