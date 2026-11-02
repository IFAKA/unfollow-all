(() => {
  if (window.__unfollowAll?.running) {
    window.__unfollowAll.stop = true;
    return;
  }

  const state = {
    clicked: 0,
    skipped: 0,
    scanned: 0,
    running: true,
    stop: false
  };

  window.__unfollowAll = state;

  const skippedAccounts = new Set();
  const keepKeywords = [
    "ai",
    "artificial intelligence",
    "agent",
    "agents",
    "llm",
    "openai",
    "anthropic",
    "claude",
    "gemini",
    "deepmind",
    "machine learning",
    "ml",
    "deep learning",
    "neural",
    "transformer",
    "model",
    "models",
    "math",
    "mathematics",
    "algebra",
    "calculus",
    "geometry",
    "theorem",
    "proof",
    "vercel",
    "next.js",
    "nextjs",
    "react",
    "frontend",
    "front-end",
    "web developer",
    "webdev",
    "javascript",
    "typescript",
    "tailwind",
    "css",
    "html",
    "design",
    "designer",
    "product design",
    "ui",
    "ux",
    "interface",
    "motion design",
    "hardware",
    "chip",
    "chips",
    "semiconductor",
    "silicon",
    "gpu",
    "cpu",
    "nvidia",
    "amd",
    "quant",
    "quantitative",
    "finance",
    "hedge fund",
    "alpha"
  ];
  const unfollowKeywords = [
    "saas",
    "b2b",
    "crm",
    "sales",
    "marketing",
    "cyber",
    "cybersecurity",
    "security",
    "infosec",
    "malware",
    "exploit",
    "pwn",
    "bug bounty",
    "trading",
    "trader",
    "market",
    "markets"
  ];

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const normalize = (text) => (text || "").replace(/\s+/g, " ").trim().toLowerCase();

  const isVisible = (element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);

    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.visibility !== "hidden" &&
      style.display !== "none" &&
      style.pointerEvents !== "none"
    );
  };

  const textOf = (element) => {
    if (element.tagName === "INPUT") {
      return normalize(element.value || element.getAttribute("aria-label"));
    }

    return normalize(
      element.innerText ||
        element.textContent ||
        element.getAttribute("aria-label") ||
        element.getAttribute("title")
    );
  };

  const interactiveElements = () =>
    Array.from(
      document.querySelectorAll(
        [
          "button",
          "a",
          "input[type='button']",
          "input[type='submit']",
          "[role='button']",
          "[tabindex='0']"
        ].join(",")
      )
    ).filter((element) => !element.closest("#unfollow-all-status") && isVisible(element));

  const isFollowingButton = (element) => {
    const testId = element.getAttribute("data-testid") || "";
    const label = normalize(element.getAttribute("aria-label"));

    if (/-unfollow$/.test(testId) && label.startsWith("following @")) {
      return true;
    }

    const text = textOf(element);
    return /^(following|subscribed|friend|friends)$/.test(text);
  };

  const isConfirmButton = (element) => {
    const testId = element.getAttribute("data-testid") || "";
    if (testId === "confirmationSheetConfirm") {
      return true;
    }

    const text = textOf(element);
    return /^(unfollow|unsubscribe|remove|yes|confirm|ok)$/.test(text);
  };

  const findButton = (predicate) => interactiveElements().find(predicate);

  const inViewport = (element) => {
    const rect = element.getBoundingClientRect();
    return rect.bottom > 120 && rect.top < window.innerHeight - 80;
  };

  const visibleCells = () =>
    Array.from(document.querySelectorAll('[data-testid="cellInnerDiv"]'))
      .filter((cell) => isVisible(cell) && inViewport(cell))
      .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);

  const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const matchesKeyword = (text, keyword) => {
    if (/^[a-z0-9+#.]+$/i.test(keyword)) {
      return new RegExp(`(^|[^a-z0-9])${escapeRegExp(keyword)}([^a-z0-9]|$)`, "i").test(text);
    }

    return text.includes(keyword);
  };

  const accountKey = (cell, button) => {
    const label = normalize(button.getAttribute("aria-label"));
    const handle = normalize(cell.querySelector('a[href^="/"] span')?.textContent);
    return label || handle || normalize(cell.textContent).slice(0, 120);
  };

  const classifyCell = (cell) => {
    const text = normalize(cell.innerText || cell.textContent);

    if (cell.querySelector('[data-testid="userFollowIndicator"]') || text.includes("follows you")) {
      return { shouldUnfollow: false, reason: "follows you" };
    }

    const unfollowMatch = unfollowKeywords.find((keyword) => matchesKeyword(text, keyword));
    if (unfollowMatch) {
      return { shouldUnfollow: true, reason: `unfollow: ${unfollowMatch}` };
    }

    const keepMatch = keepKeywords.find((keyword) => matchesKeyword(text, keyword));
    if (keepMatch) {
      return { shouldUnfollow: false, reason: `kept: ${keepMatch}` };
    }

    return { shouldUnfollow: true, reason: "not kept topic" };
  };

  const findFollowingButtonInCell = (cell) => {
    const xButton = Array.from(cell.querySelectorAll('button[data-testid$="-unfollow"]')).find(
      (element) => {
        const label = normalize(element.getAttribute("aria-label"));
        return label.startsWith("following @") && isVisible(element) && inViewport(element);
      }
    );

    return xButton || Array.from(cell.querySelectorAll("button, [role='button']")).find(isFollowingButton);
  };

  const findEligibleVisibleFollowingButton = () => {
    for (const cell of visibleCells()) {
      const button = findFollowingButtonInCell(cell);
      if (!button) continue;

      state.scanned += 1;
      const key = accountKey(cell, button);
      const decision = classifyCell(cell);

      if (decision.shouldUnfollow) {
        return { button, decision };
      }

      if (!skippedAccounts.has(key)) {
        skippedAccounts.add(key);
        state.skipped += 1;
      }

      update(`Skipped: ${decision.reason}`);
    }

    return null;
  };

  const dispatchMouse = (element, type, x, y) => {
    const pressed = type === "mousedown";

    element.dispatchEvent(
      new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        composed: true,
        view: window,
        clientX: x,
        clientY: y,
        button: 0,
        buttons: pressed ? 1 : 0
      })
    );
  };

  const dispatchPointer = (element, type, x, y) => {
    if (!window.PointerEvent) return;

    const pressed = type === "pointerdown";

    element.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        composed: true,
        view: window,
        pointerId: 1,
        pointerType: "mouse",
        isPrimary: true,
        clientX: x,
        clientY: y,
        button: 0,
        buttons: pressed ? 1 : 0
      })
    );
  };

  const dispatchClickSequence = async (element, x, y) => {
    dispatchPointer(element, "pointerover", x, y);
    dispatchPointer(element, "pointerenter", x, y);
    dispatchMouse(element, "mouseover", x, y);
    dispatchMouse(element, "mouseenter", x, y);
    await wait(120);

    dispatchPointer(element, "pointerdown", x, y);
    dispatchMouse(element, "mousedown", x, y);
    await wait(80);

    dispatchPointer(element, "pointerup", x, y);
    dispatchMouse(element, "mouseup", x, y);
    dispatchMouse(element, "click", x, y);
  };

  const clickElement = async (element) => {
    element.scrollIntoView({ behavior: "instant", block: "center", inline: "center" });
    await wait(120);

    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const target = document.elementFromPoint(x, y) || element;

    await dispatchClickSequence(target, x, y);
    if (target !== element) {
      await dispatchClickSequence(element, x, y);
    }
    element.click();
  };

  const waitForChange = async (element, timeout = 3000) => {
    const start = Date.now();

    while (Date.now() - start < timeout) {
      if (!document.contains(element) || !isFollowingButton(element)) {
        return true;
      }

      await wait(150);
    }

    return false;
  };

  const status = document.createElement("div");
  status.id = "unfollow-all-status";
  status.innerHTML = `
    <div class="unfollow-title">Unfollow All</div>
    <div class="unfollow-line">Unfollowed: <strong data-count>0</strong></div>
    <div class="unfollow-line">Skipped: <strong data-skipped>0</strong></div>
    <div class="unfollow-line" data-message>Starting...</div>
    <button type="button">Stop</button>
  `;
  status.querySelector("button").addEventListener("click", () => {
    state.stop = true;
  });

  const style = document.createElement("style");
  style.textContent = `
    #unfollow-all-status {
      position: fixed;
      z-index: 2147483647;
      right: 16px;
      bottom: 16px;
      width: 190px;
      box-sizing: border-box;
      padding: 12px;
      border: 1px solid rgba(0, 0, 0, 0.16);
      border-radius: 8px;
      background: #111;
      color: #fff;
      font: 13px/1.35 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.26);
    }

    #unfollow-all-status .unfollow-title {
      margin-bottom: 8px;
      font-weight: 700;
    }

    #unfollow-all-status .unfollow-line {
      margin: 5px 0;
      color: #e8e8e8;
    }

    #unfollow-all-status button {
      width: 100%;
      min-height: 32px;
      margin-top: 8px;
      border: 0;
      border-radius: 6px;
      background: #fff;
      color: #111;
      font: inherit;
      font-weight: 700;
      cursor: pointer;
    }
  `;

  document.documentElement.append(style, status);

  const count = status.querySelector("[data-count]");
  const skipped = status.querySelector("[data-skipped]");
  const message = status.querySelector("[data-message]");
  const update = (text) => {
    count.textContent = String(state.clicked);
    skipped.textContent = String(state.skipped);
    message.textContent = text;
  };

  const run = async () => {
    let idleRounds = 0;
    let lastScrollY = -1;

    while (!state.stop) {
      const candidate = findEligibleVisibleFollowingButton();

      if (candidate) {
        const { button, decision } = candidate;
        idleRounds = 0;
        update(`Unfollowing: ${decision.reason}`);
        await clickElement(button);
        await wait(450);

        const confirmButton = findButton(isConfirmButton);
        if (confirmButton) {
          update("Confirming...");
          await clickElement(confirmButton);
          await wait(900);
        }

        const changed = await waitForChange(button);
        if (changed) {
          state.clicked += 1;
          await wait(700);
        } else {
          update("Click did not register; retrying...");
          await wait(900);
        }

        update("Continuing...");
        continue;
      }

      update("Viewport done. Scrolling...");
      window.scrollBy({ top: Math.floor(window.innerHeight * 0.7), behavior: "smooth" });
      await wait(1600);

      if (window.scrollY === lastScrollY) {
        idleRounds += 1;
      } else {
        idleRounds = 0;
        lastScrollY = window.scrollY;
      }

      if (idleRounds >= 3) break;
    }

    state.running = false;
    update(state.stop ? "Stopped." : "Done.");
  };

  run().catch((error) => {
    state.running = false;
    update(`Error: ${error.message}`);
  });
})();
