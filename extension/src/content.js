(() => {
  if (window.__tamaLoaded) return;
  window.__tamaLoaded = true;

  const HOST_ID = "__tama_host__";

  let host = null;
  let shadow = null;
  let currentTask = null;
  let researchTimer = null;

  function safeSendMessage(message) {
    try {
      if (
        !globalThis.chrome ||
        !chrome.runtime ||
        !chrome.runtime.id
      ) {
        return Promise.reject(
          new Error("Tama extension context is unavailable.")
        );
      }

      return chrome.runtime.sendMessage(message);

    } catch (error) {
      return Promise.reject(error);
    }
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/[&<>'"]/g, (c) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;"
      }[c]));
  }

  function formatFieldName(field) {
    return String(field)
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (c) => c.toUpperCase());
  }

  const UI_HTML = `
    <style>
      * {
        box-sizing: border-box;
      }

      :host {
        font-family:
          Inter,
          ui-sans-serif,
          -apple-system,
          BlinkMacSystemFont,
          "Segoe UI",
          sans-serif;
      }

      .panel {
        width: 360px;
        background: #f5f2ed;
        color: #191a17;
        border: 1px solid #ded9d0;
        border-radius: 28px;
        padding: 18px;
        box-shadow: 0 18px 60px rgba(0,0,0,.16);
        display: none;
      }

      .panel.open {
        display: block;
      }

      .top {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .brand {
        display: flex;
        align-items: center;
        gap: 9px;
      }

      .cat {
        width: 28px;
        height: 28px;
      }

      .cat svg {
        width: 100%;
        height: 100%;
      }

      .name {
        font-size: 13px;
        font-weight: 500;
        letter-spacing: .08em;
      }

      .tag {
        font-size: 9px;
        color: #77736b;
        margin-top: 2px;
      }

      .close {
        border: 0;
        background: transparent;
        font-size: 22px;
        color: #77736b;
        cursor: pointer;
      }

      .rule {
        height: 1px;
        background: #ded9d0;
        margin: 15px 0 20px;
      }

      [data-view] {
        display: none;
      }

      [data-view].active {
        display: block;
      }

      .prompt {
        font-size: 20px;
        font-weight: 450;
        letter-spacing: -.025em;
        margin-bottom: 13px;
      }

      textarea {
        width: 100%;
        min-height: 105px;
        resize: none;
        border: 1px solid #d7d1c8;
        border-radius: 17px;
        background: #fffdf9;
        padding: 13px;
        font: inherit;
        font-size: 13px;
        line-height: 1.5;
        outline: none;
      }

      textarea:focus {
        border-color: #aaa49b;
      }

      .fieldrow {
        display: flex;
        gap: 8px;
        align-items: flex-end;
      }

      .fieldrow > div {
        flex: 1;
      }

      .count {
        color: #99938a;
        font-size: 9px;
        margin: 5px 3px 0;
      }

      button {
        font: inherit;
        cursor: pointer;
      }

      .primary,
      .ghost {
        border-radius: 13px;
        padding: 10px 15px;
        font-size: 11px;
      }

      .primary {
        background: #191a17;
        color: #fff;
        border: 0;
      }

      .ghost {
        background: transparent;
        border: 1px solid #d4cec5;
        color: #4e4a44;
      }

      .primary:disabled {
        opacity: .5;
        cursor: wait;
      }

      .minimalcopy {
        color: #77736b;
        font-size: 10px;
        margin-top: 10px;
      }

      .live {
        display: flex;
        align-items: center;
        gap: 7px;
        color: #656159;
        font-size: 10px;
      }

      .live i {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #191a17;
        display: inline-block;
      }

      .clarify-title {
        font-size: 19px;
        font-weight: 450;
        letter-spacing: -.025em;
        margin-top: 12px;
      }

      .clarify-goal {
        color: #77736b;
        font-size: 11px;
        line-height: 1.45;
        margin-top: 6px;
      }

      .task-card {
        background: #fffdf9;
        border: 1px solid #e1dcd4;
        border-radius: 17px;
        padding: 13px;
        margin-top: 10px;
      }

      .section-label {
        font-size: 8px;
        letter-spacing: .13em;
        color: #99938a;
        margin-bottom: 7px;
      }

      .task-row {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        padding: 5px 0;
        font-size: 11px;
      }

      .task-row span {
        color: #858078;
      }

      .task-row strong {
        font-weight: 450;
        text-align: right;
        max-width: 210px;
      }

      .missing-item {
        display: flex;
        align-items: center;
        gap: 7px;
        padding: 4px 0;
        font-size: 11px;
      }

      .missing-item > span {
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: #aaa49b;
        flex: 0 0 auto;
      }

      .footrow {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 15px;
      }

      .research-title {
        font-size: 18px;
        font-weight: 450;
        margin-top: 12px;
      }

      .research-progress {
        height: 4px;
        background: #ded9d0;
        border-radius: 99px;
        overflow: hidden;
        margin-top: 20px;
      }

      .research-progress div {
        width: 5%;
        height: 100%;
        background: #191a17;
        transition: width .5s ease;
      }

      .research-status {
        color: #77736b;
        font-size: 10px;
        margin-top: 9px;
      }

      .result {
        font-size: 10px;
        color: #77736b;
        margin-top: 10px;
      }

      .result.warning {
        color: #8a5b2d;
      }
    
    
    /* ============================================================
       TAMA TEXT COLOR FIX
       Explicit colors prevent the host webpage from affecting
       text inside the Tama shadow UI.
       ============================================================ */

    :host {
      color: #292824 !important;
    }

    .panel,
    .panel * {
      color: #292824;
    }

    textarea,
    input,
    select {
      color: #292824 !important;
      -webkit-text-fill-color: #292824 !important;
      caret-color: #292824 !important;
    }

    textarea::placeholder,
    input::placeholder {
      color: #8d877e !important;
      -webkit-text-fill-color: #8d877e !important;
      opacity: 1 !important;
    }

    button {
      color: #292824;
    }

    button.primary {
      color: #ffffff !important;
      -webkit-text-fill-color: #ffffff !important;
    }

    button.ghost {
      color: #5f5a53 !important;
      -webkit-text-fill-color: #5f5a53 !important;
    }

    .goal,
    .reviewgoal,
    .watch-copy,
    .reviewtitle,
    .reviewtitle *,
    .request,
    .request *,
    .vars,
    .vars *,
    .steps,
    .steps *,
    .result,
    .result *,
    .progress,
    .progress *,
    .minimalcopy,
    .count,
    .live,
    .live *,
    .footrow,
    .footrow * {
      color: #292824;
    }

    .live {
      color: #536d59 !important;
    }

    .live i {
      background: #6b9474 !important;
    }

    .error {
      color: #8b3f3f !important;
      -webkit-text-fill-color: #8b3f3f !important;
    }

</style>

    <section class="panel">

      <div class="top">

        <div class="brand">

          <div class="cat">
            <svg viewBox="0 0 4848 4848">
              <path
                d="M9 19 11 8l9 7c3-1 6-1 9 0l9-7 2 11c2 3 3 7 3 11 0 10-8 16-20 16S3 40 3 30c0-4 2-8 6-11Z"
                fill="#191A17"
              />
              <ellipse cx="18" cy="28" rx="4" ry="6" fill="#F5F2ED"/>
              <ellipse cx="30" cy="28" rx="4" ry="6" fill="#F5F2ED"/>
              <circle cx="18" cy="28" r="1.6" fill="#191A17"/>
              <circle cx="30" cy="28" r="1.6" fill="#191A17"/>
            </svg>
          </div>

          <div>
            <div class="name">TAMA</div>
            <div class="tag">
              you ask. tama handles it.
            </div>
          </div>

        </div>

        <button
          class="close"
          id="close"
          aria-label="Close"
        >×</button>

      </div>

      <div class="rule"></div>

      <!-- WELCOME -->

      <div data-view="welcome" class="active">

        <div class="prompt">
          What do you need?
        </div>

        <div class="fieldrow">

          <div>

            <textarea
              id="goal"
              maxlength="300"
              placeholder="Tell Tama what you want done..."
            ></textarea>

            <div class="count" id="count">
              0/300
            </div>

          </div>

          <button
            class="primary"
            id="start"
            type="button"
          >
            Start
          </button>

        </div>

        <div class="minimalcopy">
          Tama will understand the request and handle the work.
        </div>

        <div
          id="result"
          class="result"
        ></div>

      </div>

      <!-- CLARIFY -->

      <div data-view="clarify">

        <div class="live">
          <i></i>
          Tama understood
        </div>

        <div class="clarify-title">
          I understand the request.
        </div>

        <div
          class="clarify-goal"
          id="clarifyGoal"
        ></div>

        <div class="task-card">

          <div class="section-label">
            REQUEST
          </div>

          <div id="taskSummary"></div>

        </div>

        <div class="task-card">

          <div class="section-label">
            I STILL NEED
          </div>

          <div id="missingFields"></div>

        </div>

        <div class="footrow">

          <button
            class="ghost"
            id="reset"
            type="button"
          >
            Cancel
          </button>

          <button
            class="primary"
            id="continueResearch"
            type="button"
          >
            Continue
          </button>

        </div>

      </div>

      <!-- RESEARCH -->

      <div data-view="research">

        <div class="live">
          <i></i>
          Tama is researching
        </div>

        <div class="research-title">
          Finding and comparing suppliers...
        </div>

        <div class="research-progress">
          <div id="researchBar"></div>
        </div>

        <div
          class="research-status"
          id="researchStatus"
        >
          Starting research
        </div>

        <div class="footrow">

          <button
            class="ghost"
            id="stopResearch"
            type="button"
          >
            Stop
          </button>

        </div>

      </div>

    </section>
  `;

  function ensureUI() {
    if (
      host &&
      document.documentElement.contains(host)
    ) {
      return;
    }

    host =
      document.createElement("div");

    host.id = HOST_ID;

    host.style.position = "fixed";
    host.style.top = "16px";
    host.style.right = "16px";
    host.style.zIndex = "2147483647";

    document.documentElement.appendChild(host);

    shadow =
      host.attachShadow({
        mode: "closed"
      });

    shadow.innerHTML = UI_HTML;

    bindUI();
  }

  function setView(name) {
  
  chrome.runtime.onMessage.addListener(
    (message) => {
      if (message?.type === "TOGGLE_TAMA_UI") {
        try {
          toggleUI();
        } catch (error) {
          console.log(
            "Tama UI toggle failed:",
            error.message
          );
        }
      }
    }
  );

  ensureUI();

    shadow
      .querySelectorAll("[data-view]")
      .forEach((element) => {
        element.classList.toggle(
          "active",
          element.dataset.view === name
        );
      });
  }

  function toggleUI() {
    ensureUI();

    const panel =
      shadow.querySelector(".panel");

    const open =
      panel.classList.contains("open");

    panel.classList.toggle(
      "open",
      !open
    );
  }

  function bindUI() {

    shadow
      .querySelector("#start")
      .addEventListener(
        "click",
        startTask
      );

    shadow
      .querySelector("#reset")
      .addEventListener(
        "click",
        reset
      );

    shadow
      .querySelector("#continueResearch")
      .addEventListener(
        "click",
        startResearch
      );

    shadow
      .querySelector("#stopResearch")
      .addEventListener(
        "click",
        stopResearch
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

          shadow
            .querySelector("#count")
            .textContent =
              `${event.target.value.length}/300`;

        }
      );
  }

  async function startTask() {

    const input =
      shadow.querySelector("#goal");

    const goal =
      input.value.trim();

    if (!goal) {
      input.focus();
      return;
    }

    const button =
      shadow.querySelector("#start");

    const result =
      shadow.querySelector("#result");

    button.disabled = true;
    button.textContent = "Thinking...";

    if (result) {
      result.textContent = "";
      result.className = "result";
    }

    try {

      const response =
        await fetch(
          "http://localhost:8787/tasks",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({
              goal
            })
          }
        );

      if (!response.ok) {
        throw new Error(
          `Server returned ${response.status}`
        );
      }

      const data =
        await response.json();

      if (
        !data?.ok ||
        !data.task
      ) {
        throw new Error(
          "Tama could not understand the request."
        );
      }

      currentTask =
        data.task;

      renderTask(
        currentTask
      );

      setView("clarify");

    } catch (error) {

      console.error(
        "Tama:",
        error
      );

      if (result) {
        result.textContent =
          "Tama could not connect to its server.";
        result.className =
          "result warning";
      }

    } finally {

      button.disabled = false;
      button.textContent = "Start";

    }
  }

  function renderTask(task) {

    const brief =
      task.brief || {};

    const summary =
      shadow.querySelector(
        "#taskSummary"
      );

    const missing =
      shadow.querySelector(
        "#missingFields"
      );

    const goal =
      shadow.querySelector(
        "#clarifyGoal"
      );

    if (goal) {
      goal.textContent =
        task.objective || "";
    }

    if (summary) {

      const rows = [
        ["Product", brief.productType],
        ["Quantity", brief.quantity],
        ["Delivery", brief.deliveryLocation],
        [
          "MOQ",
          brief.maxMoq != null
            ? `< ${brief.maxMoq}`
            : null
        ],
        [
          "Lead time",
          brief.maxLeadTime != null
            ? `< ${brief.maxLeadTime} days`
            : null
        ],
        [
          "Target price",
          brief.targetPrice != null
            ? `₹${brief.targetPrice}`
            : null
        ]
      ];

      summary.innerHTML =
        rows
          .filter(([, value]) =>
            value !== null &&
            value !== undefined &&
            value !== ""
          )
          .map(([label, value]) => `
            <div class="task-row">
              <span>
                ${escapeHtml(label)}
              </span>

              <strong>
                ${escapeHtml(value)}
              </strong>
            </div>
          `)
          .join("");
    }

    if (missing) {

      const fields =
        task.missing || [];

      missing.innerHTML =
        fields.length
          ? fields
              .map((field) => `
                <div class="missing-item">
                  <span></span>
                  ${escapeHtml(
                    formatFieldName(field)
                  )}
                </div>
              `)
              .join("")
          : `
              <div class="missing-item">
                Tama has everything it needs.
              </div>
            `;
    }
  }

    async function startResearch() {
      setView("research");

      const status =
        shadow.querySelector("#researchStatus");

      const bar =
        shadow.querySelector("#researchBar");

      if (!currentTask) {
        if (status) {
          status.textContent = "No task found.";
        }
        return;
      }

      if (status) {
        status.textContent = "Tama is starting...";
      }

      if (bar) {
        bar.style.width = "20%";
      }

      try {
        const response =
          await safeSendMessage({
            type: "RUN_BROWSER_AGENT",
            objective: currentTask.objective
          });

        console.log(
          "Tama browser agent:",
          response
        );

        if (!response?.ok) {
          throw new Error(
            response?.error ||
            "Browser agent failed."
          );
        }

        if (bar) {
          bar.style.width = "100%";
        }

        if (status) {
          status.textContent =
            response.result?.message ||
            "Task completed.";
        }

        setTimeout(() => {
          setView("review");
        }, 800);

      } catch (error) {
        console.error(
          "Tama browser agent failed:",
          error
        );

        if (bar) {
          bar.style.width = "100%";
        }

        if (status) {
          status.textContent =
            error.message ||
            "Tama could not complete the task.";
        }
      }
    }
  function stopResearch() {

    clearInterval(
      researchTimer
    );

    setView("clarify");
  }

  async function reset() {

    clearInterval(
      researchTimer
    );

    currentTask = null;

    const input =
      shadow.querySelector("#goal");

    input.value = "";

    shadow
      .querySelector("#count")
      .textContent = "0/300";

    setView("welcome");
  }

  /*
   * The browser recorder is intentionally disabled
   * in Tama Sourcing V0.1.
   *
   * We will reintroduce computer-use capabilities
   * behind an agent controller rather than exposing
   * raw "watching" mode to the user.
   */

  ensureUI();

  chrome.runtime.onMessage.addListener(
    (message, sender, sendResponse) => {

      if (
        message?.type ===
        "TOGGLE_TAMA_UI"
      ) {
        toggleUI();

        sendResponse({
          ok: true
        });

        return true;
      }

      return false;
    }
  );

})();
