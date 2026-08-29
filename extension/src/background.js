const AGENT_VERSION = "0.1.0";

const ALLOWED_ACTIONS = new Set([
  "navigate",
  "back",
  "click",
  "type",
  "scroll",
  "extract"
]);

function sendResponseSafe(sendResponse, payload) {
  try {
    sendResponse(payload);
  } catch (_) {}
}

function isValidUrl(url) {
  try {
    const parsed = new URL(url);

    return (
      parsed.protocol === "http:" ||
      parsed.protocol === "https:"
    );
  } catch {
    return false;
  }
}

async function getActiveTab() {
  const tabs =
    await chrome.tabs.query({
      active: true,
      lastFocusedWindow: true
    });

  return tabs[0] || null;
}

async function executeInTab(tabId, fn, args = []) {
  const result =
    await chrome.scripting.executeScript({
      target: {
        tabId
      },
      func: fn,
      args
    });

  return result?.[0]?.result ?? null;
}

async function navigate(url) {
  if (!isValidUrl(url)) {
    throw new Error(
      "Only http and https URLs are allowed."
    );
  }

  const tab =
    await getActiveTab();

  if (!tab?.id) {
    throw new Error(
      "No active browser tab."
    );
  }

  await chrome.tabs.update(
    tab.id,
    { url }
  );

  return {
    ok: true,
    tabId: tab.id,
    url
  };
}

async function goBack() {
  const tab =
    await getActiveTab();

  if (!tab?.id) {
    throw new Error(
      "No active browser tab."
    );
  }

  await chrome.tabs.goBack(
    tab.id
  );

  return {
    ok: true,
    tabId: tab.id
  };
}

async function clickTarget(target) {
  const tab =
    await getActiveTab();

  if (!tab?.id) {
    throw new Error(
      "No active browser tab."
    );
  }

  return executeInTab(
    tab.id,

    (target) => {

      function normalize(value) {
        return String(value || "")
          .replace(/\s+/g, " ")
          .trim()
          .toLowerCase();
      }

      const wanted =
        normalize(target);

      const elements =
        Array.from(
          document.querySelectorAll(
            "button, a, input, textarea, [role='button'], [role='link']"
          )
        );

      const match =
        elements.find((element) => {

          const text =
            normalize(
              element.innerText ||
              element.textContent ||
              element.getAttribute("aria-label") ||
              element.getAttribute("placeholder") ||
              ""
            );

          return (
            text === wanted ||
            text.includes(wanted)
          );
        });

      if (!match) {
        return {
          ok: false,
          error:
            `Could not find clickable target: ${target}`
        };
      }

      match.scrollIntoView({
        behavior: "instant",
        block: "center"
      });

      match.click();

      return {
        ok: true,
        target
      };
    },

    [target]
  );
}

async function typeTarget(target, text) {
  const tab =
    await getActiveTab();

  if (!tab?.id) {
    throw new Error(
      "No active browser tab."
    );
  }

  return executeInTab(
    tab.id,

    (target, text) => {

      function normalize(value) {
        return String(value || "")
          .replace(/\s+/g, " ")
          .trim()
          .toLowerCase();
      }

      const wanted =
        normalize(target);

      const elements =
        Array.from(
          document.querySelectorAll(
            "input, textarea, [contenteditable='true']"
          )
        );

      const match =
        elements.find((element) => {

          const values = [
            element.getAttribute("aria-label"),
            element.getAttribute("placeholder"),
            element.getAttribute("name"),
            element.getAttribute("id")
          ]
            .filter(Boolean)
            .map(normalize);

          return values.some(
            value =>
              value === wanted ||
              value.includes(wanted)
          );
        });

      if (!match) {
        return {
          ok: false,
          error:
            `Could not find input: ${target}`
        };
      }

      match.focus();

      if (
        match instanceof HTMLInputElement ||
        match instanceof HTMLTextAreaElement
      ) {
        const prototype =
          Object.getPrototypeOf(match);

        const setter =
          Object.getOwnPropertyDescriptor(
            prototype,
            "value"
          )?.set;

        if (setter) {
          setter.call(
            match,
            text
          );
        } else {
          match.value = text;
        }

      } else {
        match.textContent = text;
      }

      match.dispatchEvent(
        new InputEvent(
          "input",
          {
            bubbles: true,
            inputType:
              "insertText",
            data: text
          }
        )
      );

      match.dispatchEvent(
        new Event(
          "change",
          {
            bubbles: true
          }
        )
      );

      return {
        ok: true,
        target
      };
    },

    [target, text]
  );
}

async function scrollPage(direction) {
  const tab =
    await getActiveTab();

  if (!tab?.id) {
    throw new Error(
      "No active browser tab."
    );
  }

  const amount =
    direction === "up"
      ? -700
      : 700;

  return executeInTab(
    tab.id,

    (amount) => {

      window.scrollBy({
        top: amount,
        behavior: "smooth"
      });

      return {
        ok: true,
        scrollY: window.scrollY
      };
    },

    [amount]
  );
}

async function extractPage() {
  const tab =
    await getActiveTab();

  if (!tab?.id) {
    throw new Error(
      "No active browser tab."
    );
  }

  return executeInTab(
    tab.id,

    () => {

      function clean(value) {
        return String(value || "")
          .replace(/\s+/g, " ")
          .trim();
      }

      const links =
        Array.from(
          document.querySelectorAll("a[href]")
        )
        .map((a) => ({
          text: clean(
            a.innerText ||
            a.textContent
          ),
          href:
            a.href
        }))
        .filter(
          item =>
            item.text &&
            item.href
        )
        .slice(0, 50);

      const headings =
        Array.from(
          document.querySelectorAll(
            "h1, h2, h3"
          )
        )
        .map(
          element =>
            clean(element.innerText)
        )
        .filter(Boolean)
        .slice(0, 30);

      const body =
        clean(
          document.body?.innerText
        ).slice(0, 15000);

      return {
        ok: true,

        page: {
          title:
            document.title,

          url:
            location.href,

          headings,

          links,

          text: body
        }
      };
    }
  );
}

async function performAction(action) {

  if (!action?.type) {
    throw new Error(
      "Action type is required."
    );
  }

  if (
    !ALLOWED_ACTIONS.has(
      action.type
    )
  ) {
    throw new Error(
      `Action not allowed: ${action.type}`
    );
  }

  switch (action.type) {

    case "navigate":
      return navigate(
        action.url
      );

    case "back":
      return goBack();

    case "click":
      return clickTarget(
        action.target
      );

    case "type":
      return typeTarget(
        action.target,
        action.text
      );

    case "scroll":
      return scrollPage(
        action.direction
      );

    case "extract":
      return extractPage();

    default:
      throw new Error(
        "Unsupported action."
      );
  }
}


chrome.action.onClicked.addListener(async (tab) => {
  try {
    if (!tab?.id) {
      return;
    }

    try {
      await chrome.tabs.sendMessage(tab.id, {
        type: "TOGGLE_TAMA_UI"
      });

      return;
    } catch (_) {
      // Content script may not exist in this tab yet.
    }

    await chrome.scripting.executeScript({
      target: {
        tabId: tab.id
      },
      files: ["src/content.js"]
    });

    await new Promise(resolve =>
      setTimeout(resolve, 100)
    );

    await chrome.tabs.sendMessage(tab.id, {
      type: "TOGGLE_TAMA_UI"
    });

  } catch (error) {
    console.error(
      "Tama icon failed:",
      error
    );
  }
});

chrome.runtime.onMessage.addListener(
  (message, sender, sendResponse) => {

    if (
      message?.type ===
      "AGENT_ACTION"
    ) {

      performAction(
        message.action
      )
        .then((result) => {

          sendResponseSafe(
            sendResponse,
            {
              ok: true,
              result
            }
          );

        })
        .catch((error) => {

          sendResponseSafe(
            sendResponse,
            {
              ok: false,
              error:
                error.message
            }
          );

        });

      return true;
    }

    if (
      message?.type ===
      "RUN_BROWSER_AGENT"
    ) {

      runBrowserAgent(
        message.objective
      )
        .then((result) => {

          sendResponseSafe(
            sendResponse,
            {
              ok: true,
              result
            }
          );

        })
        .catch((error) => {

          sendResponseSafe(
            sendResponse,
            {
              ok: false,
              error:
                error.message
            }
          );

        });

      return true;
    }


    if (
      message?.type ===
      "AGENT_INFO"
    ) {

      sendResponse({
        ok: true,
        version:
          AGENT_VERSION,
        actions:
          Array.from(
            ALLOWED_ACTIONS
          )
      });

      return false;
    }

    return false;
  }
);

console.log(
  `Tama browser agent ${AGENT_VERSION} ready.`
);


/*
 * ============================================================
 * TAMA COMPUTER AGENT
 * ============================================================
 */

function wait(ms) {
  return new Promise(resolve =>
    setTimeout(resolve, ms)
  );
}

async function runBrowserAgent(objective) {
  if (!objective || !String(objective).trim()) {
    throw new Error("Agent objective is required.");
  }

  const goal = String(objective).trim();
  const lower = goal.toLowerCase();

  const trace = [];

  function record(type, data = {}) {
    trace.push({
      type,
      timestamp: new Date().toISOString(),
      ...data
    });
  }

  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  record("agent_start", {
    objective: goal
  });

  /*
   * Tama V0.5
   *
   * Generic deterministic browser researcher.
   *
   * The controller is real:
   *   navigate -> observe -> search -> extract -> inspect pages
   *
   * This intentionally does not use an LLM yet. The next layer can
   * replace the query planner without changing the browser controller.
   */

  const isSupplierTask =
    lower.includes("supplier") ||
    lower.includes("suppliers") ||
    lower.includes("manufacturer") ||
    lower.includes("manufacturers") ||
    lower.includes("corrugated box");

  /*
   * ------------------------------------------------------------
   * SIMPLE BROWSER TASK
   * ------------------------------------------------------------
   *
   * For ordinary browser requests, start from Google and search
   * the user's actual objective rather than hardcoding OpenAI.
   */

  if (!isSupplierTask) {
    record("plan", {
      action: "navigate",
      url: "https://www.google.com"
    });

    const navigation = await navigate("https://www.google.com");

    record("action", {
      action: "navigate",
      result: navigation
    });

    await wait(1800);

    const searchUrl =
      "https://www.google.com/search?q=" +
      encodeURIComponent(goal);

    record("plan", {
      action: "navigate",
      url: searchUrl
    });

    const searchNavigation = await navigate(searchUrl);

    record("action", {
      action: "navigate",
      result: searchNavigation
    });

    await wait(1800);

    const page = await extractPage();

    record("observation", {
      step: "search_results",
      result: page
    });

    return {
      ok: true,
      message: "Search completed.",
      objective: goal,
      page,
      trace
    };
  }

  /*
   * ------------------------------------------------------------
   * SUPPLIER RESEARCH
   * ------------------------------------------------------------
   */

  const queries = [
    goal,
    `${goal} Gurgaon`,
    "corrugated box manufacturer Gurgaon",
    "corrugated packaging supplier Gurgaon",
    "corrugated box supplier Delhi NCR"
  ];

  const suppliers = [];
  const seenDomains = new Set();

  function domainOf(url) {
    try {
      return new URL(url).hostname
        .replace(/^www\./, "")
        .toLowerCase();
    } catch (_) {
      return "";
    }
  }

  function looksLikeSupplierLink(item) {
    if (!item?.href || !item?.text) {
      return false;
    }

    const href = item.href.toLowerCase();
    const text = item.text.toLowerCase();

    if (!href.startsWith("http")) {
      return false;
    }

    const blocked = [
      "google.",
      "youtube.",
      "facebook.",
      "instagram.",
      "linkedin.",
      "amazon.",
      "indiamart.",
      "justdial.",
      "tradeindia.",
      "flipkart."
    ];

    if (blocked.some(domain => href.includes(domain))) {
      return false;
    }

    return (
      text.includes("box") ||
      text.includes("pack") ||
      text.includes("corrugated") ||
      text.includes("carton") ||
      text.includes("manufacturer") ||
      text.includes("supplier")
    );
  }

  /*
   * Search Google using direct URLs.
   * This avoids relying on Google's changing search-box DOM.
   */

  for (const query of queries) {
    if (suppliers.length >= 5) {
      break;
    }

    const searchUrl =
      "https://www.google.com/search?q=" +
      encodeURIComponent(query);

    record("search", {
      query,
      url: searchUrl
    });

    await navigate(searchUrl);
    await wait(1600);

    const searchPage = await extractPage();

    record("observation", {
      step: "search_results",
      query,
      result: searchPage
    });

    const links = searchPage?.links || [];

    for (const item of links) {
      if (suppliers.length >= 5) {
        break;
      }

      if (!looksLikeSupplierLink(item)) {
        continue;
      }

      const domain = domainOf(item.href);

      if (!domain || seenDomains.has(domain)) {
        continue;
      }

      seenDomains.add(domain);

      record("candidate", {
        name: item.text,
        url: item.href,
        domain
      });

      /*
       * Open the supplier site and collect observable evidence.
       */

      try {
        await navigate(item.href);
        await wait(1400);

        const supplierPage = await extractPage();

        const body =
          String(supplierPage?.body || "");

        const bodyLower =
          body.toLowerCase();

        const supplier = {
          name: item.text,
          website: item.href,
          domain,
          title: supplierPage?.title || null,

          /*
           * We deliberately keep unknown fields as null.
           * Tama must never invent MOQ, price, lead time, etc.
           */

          moq: null,
          price: null,
          leadTime: null,
          phone: null,
          email: null,

          evidence: {
            source: item.href,
            pageTitle: supplierPage?.title || null,
            relevantText: body.slice(0, 5000)
          }
        };

        /*
         * Lightweight extraction of obvious phone/email values.
         */

        const emailMatch =
          body.match(
            /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
          );

        const phoneMatch =
          body.match(
            /(?:\+91[\s-]?)?(?:\d[\s-]?){10,12}/
          );

        if (emailMatch) {
          supplier.email = emailMatch[0];
        }

        if (phoneMatch) {
          supplier.phone =
            phoneMatch[0]
              .replace(/\s+/g, " ")
              .trim();
        }

        /*
         * Search visible text for procurement terms.
         * We don't infer values when none are explicitly visible.
         */

        const moqMatch =
          body.match(
            /(?:MOQ|min(?:imum)?\s+(?:order|quantity))[^.\n]{0,120}/i
          );

        const leadMatch =
          body.match(
            /(?:lead\s*time|delivery\s*time|dispatch)[^.\n]{0,120}/i
          );

        const priceMatch =
          body.match(
            /(?:₹|Rs\.?|INR)\s?[\d,]+(?:\.\d+)?(?:\s*(?:per|\/)\s*(?:box|piece|pc|unit))?/i
          );

        if (moqMatch) {
          supplier.moqEvidence = moqMatch[0].trim();
        }

        if (leadMatch) {
          supplier.leadTimeEvidence =
            leadMatch[0].trim();
        }

        if (priceMatch) {
          supplier.priceEvidence =
            priceMatch[0].trim();
        }

        suppliers.push(supplier);

        record("supplier", {
          supplier
        });

      } catch (error) {
        record("supplier_error", {
          url: item.href,
          error: error.message
        });
      }
    }
  }

  /*
   * Return to a stable final state.
   */

  const result = {
    ok: true,
    message:
      suppliers.length
        ? `Research completed. Found ${suppliers.length} supplier candidates.`
        : "Research completed, but no supplier websites were found.",
    objective: goal,
    suppliers,
    counts: {
      discovered: suppliers.length,
      unique: suppliers.length
    },
    queries,
    trace
  };

  record("agent_complete", {
    suppliers: suppliers.length
  });

  return result;
}
