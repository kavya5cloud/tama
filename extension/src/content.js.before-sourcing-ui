(() => {
  if (window.__tamaLoaded) return;
  window.__tamaLoaded = true;

  const HOST_ID = "__tama_host__";

  let teaching = false;
  let host = null;
  let shadow = null;
  const inputTimers = new WeakMap();
  
  // Prevent Chrome extension reloads from producing uncaught
  // "Extension context invalidated" errors in the webpage.
  function safeSendMessage(message) {
    try {
      if (!globalThis.chrome || !chrome.runtime || !chrome.runtime.id) {
        return Promise.resolve(null);
      }

      return chrome.runtime.sendMessage(message).catch(() => null);
    } catch (_) {
      return Promise.resolve(null);
    }
  }


  /*
   * --------------------------------------------------------------------------
   * TAMA UI
   * --------------------------------------------------------------------------
   */

  const UI_HTML = `
    <style>
      :host {
        all: initial;
        font-family:
          "Outfit",
          "Avenir Next",
          system-ui,
          -apple-system,
          BlinkMacSystemFont,
          sans-serif;
      }

      .panel {
        position: fixed;
        top: 18px;
        right: 18px;
        width: 360px;
        box-sizing: border-box;

        padding: 18px 18px 17px;

        background: #F5F2ED;
        color: #171815;

        border: 1px solid rgba(23, 24, 21, 0.06);
        border-radius: 32px 38px 30px 36px;

        box-shadow:
          0 22px 55px rgba(20, 20, 17, 0.14),
          0 4px 14px rgba(20, 20, 17, 0.05);

        opacity: 0;
        transform: translateY(-10px) scale(.97);
        transform-origin: top right;

        pointer-events: none;

        transition:
          opacity 180ms ease,
          transform 300ms cubic-bezier(.2,.8,.2,1);

        overflow: hidden;
        z-index: 2147483647;
      }

      .panel.open {
        opacity: 1;
        transform: translateY(0) scale(1);
        pointer-events: auto;
      }

      .panel.open {
        opacity: 1;
        transform: translateY(0) scale(1);
        pointer-events: auto;
      }

      /*
       * Compact "Dynamic Island" state.
       */
      .panel.compact {
        width: 238px;
        padding: 10px 13px;
        border-radius: 22px 25px 21px 24px;
      }

      .panel.compact .divider {
        height: 1px;
        background: rgba(23, 24, 21, 0.075);
        margin: 10px 0 13px;
      }

      .panel.compact [data-view="welcome"],
      .panel.compact [data-view="review"] {
        display: none;
      }

      .panel.compact [data-view="teaching"] {
        display: block;
      }

      .panel.compact .top {
        min-height: 25px;
      }

      .panel.compact .brand-image {
        display: block;
        width: 185px;
        height: auto;
        object-fit: contain;
        object-position: left center;
      }

      .panel.compact .close {
        font-size: 17px;
      }

      .panel.compact .watch-copy {
        display: none;
      }

      .panel.compact .live {
        justify-content: flex-end;
      }

      .top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }

      .brand-image {
        display: block;
        width: 210px;
        height: auto;
        object-fit: contain;
        object-position: left center;
      }

      .close {
        border: 0;
        background: transparent;
        color: #77736B;
        font:
          400 19px/1
          "Outfit",
          "Avenir Next",
          system-ui,
          sans-serif;
        cursor: pointer;
        padding: 2px 4px;
      }

      .divider {
        height: 1px;
        background: rgba(23, 24, 21, 0.075);
        margin: 12px 0 14px;
      }

      [data-view] {
        display: none;
      }

      [data-view].active {
        display: block;
      }

      /*
       * Main prompt:
       * intentionally small and light.
       */
      .prompt {
        margin: 0 0 10px;

        font-family:
          "Bradley Hand",
          "Chalkboard SE",
          cursive;

        font-size: 21px;
        font-weight: 400;
        line-height: 1.15;
        letter-spacing: 0;

        color: #39362f;

        -webkit-font-smoothing: antialiased;
        text-rendering: optimizeLegibility;
      }

      .fieldrow {
        display: grid;
        grid-template-columns: 1fr 70px;
        gap: 8px;
        align-items: stretch;
      }

      .fieldwrap {
        position: relative;
        min-width: 0;
      }

      textarea {
        display: block;
        width: 100%;
        height: 58px;
        box-sizing: border-box;
        resize: none;

        border: 1px solid #D8D2C8;
        border-radius: 18px;

        background: #FCFAF7;
        color: #5B564E;

        outline: none;
        padding: 13px 14px;

        font-family:
          "Bradley Hand",
          "Chalkboard SE",
          cursive;

        font-size: 15px;
        font-weight: 400;
        line-height: 1.2;
        letter-spacing: 0;

        -webkit-font-smoothing: antialiased;
      }

      textarea::placeholder {
        font-family:
          "Bradley Hand",
          "Chalkboard SE",
          cursive;

        font-size: 15px;
        font-weight: 400;
        color: #9D978D;
        opacity: 1;
      }

      textarea:focus {
        border-color: #B8B0A5;
        box-shadow: 0 0 0 2px rgba(23, 24, 21, 0.025);
      }

      textarea.error {
        border-color: #A46B60;
      }

      .count,
      .minimalcopy {
        display: none;
      }

      .primary {
        min-height: 58px;
        border: 0;
        border-radius: 18px;

        background: #171815;
        color: #FFFFFF;

        cursor: pointer;

        font-family:
          "Bradley Hand",
          "Chalkboard SE",
          cursive;

        font-size: 16px;
        font-weight: 400;
        font-synthesis: none;

        line-height: 1;
        letter-spacing: 0;

        transition:
          transform 140ms ease,
          background 140ms ease;
      }

      .primary:hover {
        background: #282923;
      }

      .primary:active {
        transform: scale(0.985);
      }

      .live {
        display: flex;
        align-items: center;
        gap: 7px;

        color: #4D6552;

        font:
          600 11px/1
          "Outfit",
          "Avenir Next",
          system-ui,
          sans-serif;
      }

      .live i {
        width: 6px;
        height: 6px;
        border-radius: 999px;
        background: #5D7B63;
      }

      .watch-copy {
        margin-top: 9px;
      }

      .watchtitle {
        margin-top: 9px;

        font-family:
          "Bradley Hand",
          "Segoe Print",
          "Chalkboard SE",
          cursive;

        font-size: 19px;
        font-weight: 400;
        line-height: 1.05;
        letter-spacing: 0;

        color: #4A463E;
      }

      .goal {
        margin-top: 5px;

        max-width: 320px;

        color: #77736B;

        font:
          400 11px/1.35
          "Outfit",
          "Avenir Next",
          system-ui,
          sans-serif;
      }

      .progress {
        margin-top: 11px;
        padding: 10px 11px;

        border-radius: 15px;
        background: #FCFAF7;
        border: 1px solid #D8D2C8;
      }

      .progress strong {
        display: block;

        font:
          600 11px/1.2
          "Outfit",
          "Avenir Next",
          system-ui,
          sans-serif;
      }

      .progress span {
        display: block;

        margin-top: 3px;

        color: #77736B;

        font:
          400 10px/1.2
          "Outfit",
          "Avenir Next",
          system-ui,
          sans-serif;

        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }

      .footrow,
      .row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
        margin-top: 10px;
      }

      .ghost {
        border: 1px solid #D8D2C8;
        background: transparent;
        color: #171815;

        border-radius: 15px;
        padding: 10px 13px;

        font:
          400 12px
          "Bradley Hand",
          "Segoe Print",
          "Chalkboard SE",
          cursive;

        cursor: pointer;
      }

      .reviewtitle {
        font-family:
          "Bradley Hand",
          "Segoe Print",
          "Chalkboard SE",
          cursive;

        font-size: 20px;
        font-weight: 400;
        line-height: 1.05;
        letter-spacing: 0;

        color: #4A463E;
      }

      .reviewgoal {
        margin-top: 5px;

        color: #77736B;

        font:
          400 11px/1.3
          "Outfit",
          "Avenir Next",
          system-ui,
          sans-serif;
      }

      .steps {
        margin-top: 10px;
        padding: 9px 11px;

        border: 1px solid #D8D2C8;
        border-radius: 15px;

        background: #FCFAF7;

        max-height: 110px;
        overflow: auto;
      }

      .step {
        display: flex;
        align-items: center;
        gap: 8px;

        padding: 5px 0;

        font:
          400 10px/1.2
          "Outfit",
          "Avenir Next",
          system-ui,
          sans-serif;
      }

      .step span {
        width: 18px;
        height: 18px;

        flex: 0 0 auto;

        display: grid;
        place-items: center;

        border-radius: 50%;
        background: #E8E3DA;

        font-size: 8px;
        font-weight: 700;
      }

      .vars {
        margin-top: 8px;

        color: #77736B;

        font:
          400 9px/1.3
          "Outfit",
          "Avenir Next",
          system-ui,
          sans-serif;
      }

      .result {
        min-height: 14px;
        margin-top: 7px;

        color: #77736B;

        font:
          400 9px/1.2
          "Outfit",
          "Avenir Next",
          system-ui,
          sans-serif;
      }

      .result.success {
        color: #45624C;
      }

      .result.warning {
        color: #8A5C48;
      }
    </style>

    <section class="panel">

      <div class="top">
        <img
          class="brand-image"
          alt="Tama"
          src="${chrome.runtime.getURL("assets/tama-brand.png")}"
        />

        <button
          class="close"
          id="close"
          aria-label="Close"
          type="button"
        >×</button>
      </div>

      <div class="divider"></div>

      <!-- WELCOME -->
      <div data-view="welcome" class="active">

        <div class="prompt">
          What should I learn?
        </div>

        <div class="fieldrow">

          <div class="fieldwrap">
            <textarea
              id="goal"
              maxlength="300"
              placeholder="Describe the task..."
              spellcheck="true"
            ></textarea>

            <div class="count" id="count">
              0/300
            </div>
          </div>

          <button
            class="primary"
            id="start"
            type="button"
          >Start</button>

        </div>

        <div class="minimalcopy">
          Tell me the outcome. Then do the task once.
        </div>

      </div>

      <!-- TEACHING -->
      <div data-view="teaching">

        <div class="live">
          <i></i>
          Tama is watching
        </div>

        <div class="watch-copy">

          <div class="watchtitle">
            Do the task normally.
          </div>

          <div class="goal" id="teachGoal"></div>

          <div class="progress">
            <strong id="eventCount">
              0 actions captured
            </strong>

            <span id="lastAction">
              Do the task normally.
            </span>
          </div>

          <div class="footrow">
            <button class="ghost" id="reset" type="button">
              Cancel
            </button>

            <button class="primary" id="finish" type="button">
              Finish
            </button>
          </div>

        </div>

      </div>

      <!-- REVIEW -->
      <div data-view="review">

        <div class="reviewtitle">
          Tama learned this.
        </div>

        <div class="reviewgoal" id="reviewGoal"></div>

        <div class="steps" id="steps"></div>

        <div class="vars" id="variables"></div>

        <div class="result" id="result"></div>

        <div class="row">

          <button class="ghost" id="edit" type="button">
            Edit
          </button>

          <button class="primary" id="replay" type="button">
            Run again
          </button>

        </div>

      </div>

    </section>
  `;

  /*
   * --------------------------------------------------------------------------
   * DOM TARGET IDENTIFICATION
   * --------------------------------------------------------------------------
   */

  function labelFor(el) {
    if (!el) return "element";

    const aria = el.getAttribute?.("aria-label");
    if (aria) return aria.trim();

    const text = (el.innerText || el.textContent || "")
      .trim()
      .replace(/\s+/g, " ");

    if (text && text.length < 80) {
      return text;
    }

    const placeholder = el.getAttribute?.("placeholder");
    if (placeholder) {
      return placeholder.trim();
    }

    const name = el.getAttribute?.("name");
    if (name) {
      return name;
    }

    return el.tagName?.toLowerCase() || "element";
  }

  function stableSelector(el) {
    if (!el || el.nodeType !== 1) {
      return null;
    }

    if (el.id) {
      return `#${CSS.escape(el.id)}`;
    }

    const testId = el.getAttribute("data-testid");

    if (testId) {
      return `[data-testid="${CSS.escape(testId)}"]`;
    }

    const name = el.getAttribute("name");

    if (name) {
      return `${el.tagName.toLowerCase()}[name="${CSS.escape(name)}"]`;
    }

    return null;
  }

  function fingerprint(el) {
    return {
      role:
        el.getAttribute?.("role") ||
        el.tagName?.toLowerCase(),

      label: labelFor(el),

      id: el.id || null,

      name:
        el.getAttribute?.("name") ||
        null,

      placeholder:
        el.getAttribute?.("placeholder") ||
        null,

      type:
        el.getAttribute?.("type") ||
        null,

      testId:
        el.getAttribute?.("data-testid") ||
        null,

      selector: stableSelector(el)
    };
  }

  /*
   * --------------------------------------------------------------------------
   * EVENT CAPTURE
   * --------------------------------------------------------------------------
   */

  function emit(event) {
    if (!teaching) {
      return;
    }

    chrome.runtime
      .sendMessage({
        type: "CAPTURED_EVENT",
        event: {
          ...event,
          url: location.href,
          timestamp: Date.now()
        }
      })
      .catch(() => {});
  }

  document.addEventListener(
    "click",
    (event) => {
      if (!teaching) return;

      if (host?.contains(event.target)) {
        return;
      }

      const target = event
        .composedPath()
        .find(
          (node) =>
            node instanceof HTMLElement &&
            node !== document.documentElement &&
            node !== document.body
        );

      if (!target) {
        return;
      }

      emit({
        type: "click",
        target: fingerprint(target)
      });
    },
    true
  );

  document.addEventListener(
    "input",
    (event) => {
      if (!teaching) return;

      if (host?.contains(event.target)) {
        return;
      }

      const target = event.target;

      if (
        !(
          target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          target instanceof HTMLSelectElement
        )
      ) {
        return;
      }

      if (inputTimers.has(target)) {
        clearTimeout(inputTimers.get(target));
      }

      const timer = setTimeout(() => {
        const type =
          target instanceof HTMLSelectElement
            ? "select"
            : "input";

        emit({
          type,
          target: fingerprint(target),
          value: target.value
        });

        inputTimers.delete(target);
      }, 350);

      inputTimers.set(target, timer);
    },
    true
  );

  document.addEventListener(
    "submit",
    (event) => {
      if (!teaching) return;

      if (host?.contains(event.target)) {
        return;
      }

      if (event.target instanceof HTMLFormElement) {
        emit({
          type: "submit",
          target: fingerprint(
            event.submitter || event.target
          )
        });
      }
    },
    true
  );

  let lastUrl = location.href;

  setInterval(() => {
    if (!teaching) {
      lastUrl = location.href;
      return;
    }

    if (location.href !== lastUrl) {
      lastUrl = location.href;

      emit({
        type: "navigate",
        url: location.href
      });
    }
  }, 500);

  /*
   * --------------------------------------------------------------------------
   * BACKGROUND MESSAGES
   * --------------------------------------------------------------------------
   */

  chrome.runtime.onMessage.addListener(
    (message, sender, sendResponse) => {
      if (message.type === "TOGGLE_TAMA_UI") {
        toggleUI();

        sendResponse({ ok: true });
        return true;
      }

      if (message.type === "SET_TEACHING") {
        teaching = Boolean(message.enabled);

        setTeachingVisual(teaching);

        sendResponse({ ok: true });
        return true;
      }

      if (message.type === "REPLAY_EVENT") {
        replayEvent(message.event).then(sendResponse);
        return true;
      }

      return false;
    }
  );

  /*
   * --------------------------------------------------------------------------
   * UI LIFECYCLE
   * --------------------------------------------------------------------------
   */

  function ensureUI() {
    if (
      host &&
      document.documentElement.contains(host)
    ) {
      return;
    }

    host = document.createElement("div");
    host.id = HOST_ID;

    /*
     * Keep host itself invisible.
     * The actual panel lives in the shadow root.
     */
    host.style.position = "fixed";
    host.style.top = "0";
    host.style.right = "0";
    host.style.width = "0";
    host.style.height = "0";
    host.style.zIndex = "2147483647";

    document.documentElement.appendChild(host);

    shadow = host.attachShadow({
      mode: "closed"
    });

    shadow.innerHTML = UI_HTML;

    bindUI();
  }

  function toggleUI() {
    ensureUI();

    const panel = shadow.querySelector(".panel");

    if (!panel) {
      return;
    }

    const isOpen = panel.classList.contains("open");

    panel.classList.toggle("open", !isOpen);

    if (!isOpen) {
      hydrateUI();
    }

    chrome.runtime
      .sendMessage({
        type: "SET_UI_OPEN",
        open: !isOpen
      })
      .catch(() => {});
  }

  async function hydrateUI() {
    const response = await chrome.runtime
      .sendMessage({
        type: "GET_STATE"
      })
      .catch(() => null);

    const demo = response?.demo;

    if (!demo) {
      setView("welcome");
      return;
    }

    if (demo.phase === "teaching") {
      teaching = true;

      setView("teaching");

      updateTeachingUI(demo);

      return;
    }

    if (
      demo.phase === "review" &&
      demo.workflow
    ) {
      teaching = false;

      setView("review");

      renderWorkflow(demo);

      return;
    }

    setView("welcome");
  }

  function bindUI() {
    shadow
      .querySelector("#start")
      .addEventListener(
        "click",
        startTeaching
      );

    shadow
      .querySelector("#finish")
      .addEventListener(
        "click",
        finishTeaching
      );

    shadow
      .querySelector("#reset")
      .addEventListener(
        "click",
        reset
      );

    shadow
      .querySelector("#replay")
      .addEventListener(
        "click",
        replay
      );

    shadow
      .querySelector("#edit")
      .addEventListener(
        "click",
        () => setView("teaching")
      );

    shadow
      .querySelector("#close")
      .addEventListener(
        "click",
        toggleUI
      );

    shadow
      .querySelector("#goal")
      .addEventListener(
        "input",
        (event) => {
          const count =
            shadow.querySelector("#count");

          count.textContent =
            `${event.target.value.length}/300`;
        }
      );
  }

  /*
   * --------------------------------------------------------------------------
   * TEACHING
   * --------------------------------------------------------------------------
   */

  async function startTeaching() {
    const input =
      shadow.querySelector("#goal");

    const goal =
      input.value.trim();

    if (!goal) {
      input.focus();
      input.classList.add("error");

      setTimeout(() => {
        input.classList.remove("error");
      }, 700);

      return;
    }

    const demoId =
      crypto.randomUUID();

    const result =
      await safeSendMessage({
        type: "START_TEACHING",
        demoId,
        goal
      });

    if (!result?.ok) {
      return;
    }

    teaching = true;

    setView("teaching");

    updateTeachingUI({
      goal,
      events: []
    });
  }

  async function finishTeaching() {
    teaching = false;

    const result =
      await safeSendMessage({
        type: "STOP_TEACHING"
      });

    if (!result?.ok) {
      return;
    }

    renderWorkflow(result.demo);

    setView("review");
  }

  async function reset() {
    teaching = false;

    await safeSendMessage({
      type: "CLEAR_STATE"
    });

    shadow.querySelector("#goal").value = "";

    shadow.querySelector("#count").textContent =
      "0/300";

    setView("welcome");
  }

  /*
   * --------------------------------------------------------------------------
   * WORKFLOW REVIEW / REPLAY
   * --------------------------------------------------------------------------
   */

  async function replay() {
    const response =
      await chrome.runtime
        .sendMessage({
          type: "GET_STATE"
        })
        .catch(() => null);

    if (!response?.demo) {
      return;
    }

    const run =
      await safeSendMessage({
        type: "REPLAY_WORKFLOW",
        workflow: response.demo.workflow,
        events: response.demo.events
      });

    const result =
      shadow.querySelector("#result");

    result.textContent =
      run?.ok
        ? `Completed · ${run.stepsRun} steps`
        : (
            run?.error ||
            "Needs review"
          );

    result.className =
      `result ${
        run?.ok
          ? "success"
          : "warning"
      }`;
  }

  function updateTeachingUI(demo) {
    shadow.querySelector("#teachGoal")
      .textContent =
      demo.goal || "";

    const events =
      demo.events || [];

    shadow.querySelector("#eventCount")
      .textContent =
      `${events.length} actions captured`;

    const last =
      events[events.length - 1];

    shadow.querySelector("#lastAction")
      .textContent =
      last
        ? describeEvent(last)
        : "Do the task normally.";
  }

  function renderWorkflow(demo) {
    const workflow =
      demo.workflow || {
        steps: [],
        variables: []
      };

    shadow.querySelector("#reviewGoal")
      .textContent =
      demo.goal ||
      "Untitled workflow";

    shadow.querySelector("#steps")
      .innerHTML =
      (workflow.steps || [])
        .map(
          (step, index) => `
            <div class="step">
              <span>${index + 1}</span>
              <div>
                ${escapeHtml(
                  step.label ||
                  step.operation ||
                  step.type
                )}
              </div>
            </div>
          `
        )
        .join("") ||
      `
        <div class="empty">
          No meaningful steps captured.
        </div>
      `;

    shadow.querySelector("#variables")
      .textContent =
      (workflow.variables || []).length
        ? workflow.variables
            .map(
              (variable) =>
                `${variable.name} ← ${
                  variable.source || "input"
                }`
            )
            .join(" · ")
        : "No variables inferred yet";

    shadow.querySelector("#result")
      .textContent = "";

    shadow.querySelector("#result")
      .className = "result";
  }

  function setView(name) {
    ensureUI();

    const panel =
      shadow.querySelector(".panel");

    panel?.classList.toggle(
      "teaching",
      name === "teaching"
    );

    shadow
      .querySelectorAll("[data-view]")
      .forEach((element) => {
        element.classList.toggle(
          "active",
          element.dataset.view === name
        );
      });
  }

  function setTeachingVisual(active) {
    ensureUI();

    shadow
      .querySelector(".panel")
      ?.classList.toggle(
        "teaching",
        active
      );
  }

  function describeEvent(event) {
    if (event.type === "navigate") {
      return `Opened ${event.url}`;
    }

    if (event.type === "click") {
      return `Clicked ${
        event.target?.label ||
        "an element"
      }`;
    }

    if (event.type === "input") {
      return `Entered text into ${
        event.target?.label ||
        "a field"
      }`;
    }

    if (event.type === "select") {
      return `Selected ${
        event.target?.label ||
        "an option"
      }`;
    }

    if (event.type === "submit") {
      return "Submitted a form";
    }

    return "Captured an action";
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(
        /[&<>'"]/g,
        (character) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            "'": "&#39;",
            '"': "&quot;"
          })[character]
      );
  }

  /*
   * --------------------------------------------------------------------------
   * DETERMINISTIC REPLAY
   * --------------------------------------------------------------------------
   */

  async function replayEvent(event) {
    try {
      if (event.type === "navigate") {
        location.href = event.url;

        return {
          ok: true
        };
      }

      const target =
        resolveTarget(event.target);

      if (!target) {
        return {
          ok: false,
          error:
            `Could not resolve ${
              event.target?.label ||
              event.type
            }.`
        };
      }

      if (event.type === "click") {
        target.scrollIntoView({
          behavior: "instant",
          block: "center"
        });

        target.click();
      }

      else if (event.type === "input") {
        target.focus();

        setNativeValue(
          target,
          event.value ?? ""
        );

        target.dispatchEvent(
          new Event("input", {
            bubbles: true
          })
        );

        target.dispatchEvent(
          new Event("change", {
            bubbles: true
          })
        );
      }

      else if (event.type === "select") {
        setNativeValue(
          target,
          event.value ?? ""
        );

        target.dispatchEvent(
          new Event("change", {
            bubbles: true
          })
        );
      }

      else if (event.type === "submit") {
        if (target.click) {
          target.click();
        }
        else if (target.requestSubmit) {
          target.requestSubmit();
        }
      }

      return {
        ok: true
      };

    } catch (error) {
      return {
        ok: false,
        error: error.message
      };
    }
  }

  function resolveTarget(fp) {
    if (!fp) {
      return null;
    }

    const candidates = [];

    if (fp.testId) {
      candidates.push(
        document.querySelector(
          `[data-testid="${CSS.escape(fp.testId)}"]`
        )
      );
    }

    if (fp.selector) {
      try {
        candidates.push(
          document.querySelector(fp.selector)
        );
      } catch {
        // Ignore invalid historical selector.
      }
    }

    if (fp.id) {
      candidates.push(
        document.getElementById(fp.id)
      );
    }

    if (fp.name) {
      candidates.push(
        document.querySelector(
          `[name="${CSS.escape(fp.name)}"]`
        )
      );
    }

    if (fp.placeholder) {
      candidates.push(
        [
          ...document.querySelectorAll(
            "input,textarea"
          )
        ].find(
          (element) =>
            element.getAttribute(
              "placeholder"
            ) === fp.placeholder
        )
      );
    }

    if (fp.label) {
      candidates.push(
        [
          ...document.querySelectorAll(
            'button,a,input,textarea,select,[role="button"]'
          )
        ].find(
          (element) =>
            labelFor(element)
              .toLowerCase() ===
            fp.label.toLowerCase()
        )
      );
    }

    return (
      candidates.find(Boolean) ||
      null
    );
  }

  function setNativeValue(element, value) {
    const proto =
      element instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;

    const descriptor =
      Object.getOwnPropertyDescriptor(
        proto,
        "value"
      );

    if (descriptor?.set) {
      descriptor.set.call(
        element,
        value
      );
    }
    else {
      element.value = value;
    }
  }

  /*
   * We intentionally do NOT call ensureUI() here.
   * The background worker injects the UI only when the user clicks Tama.
   */
})();