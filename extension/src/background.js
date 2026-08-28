const STORAGE_KEY = 'tama.currentDemo';
const UI_STATE_KEY = 'tama.uiOpen';
const SERVER_ORIGIN = 'http://localhost:8787';

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ [UI_STATE_KEY]: false }).catch(() => {});
});

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.id) return;
  chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_TAMA_UI' }).catch(async () => {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['src/content.js']
      });
      setTimeout(() => chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_TAMA_UI' }).catch(() => {}), 60);
    } catch (_) {}
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'START_TEACHING') {
    const demo = {
      phase: 'teaching',
      goal: String(message.goal || '').trim(),
      demoId: message.demoId || crypto.randomUUID(),
      events: [],
      workflow: null
    };
    chrome.storage.local.set({ [STORAGE_KEY]: demo, [UI_STATE_KEY]: true }).then(() => {
      broadcast({ type: 'SET_TEACHING', enabled: true });
      sendResponse({ ok: true, demo });
    }).catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.type === 'STOP_TEACHING') {
    chrome.storage.local.get(STORAGE_KEY).then(async (data) => {
      const demo = data[STORAGE_KEY] || { phase: 'welcome', goal: '', demoId: null, events: [], workflow: null };
      demo.phase = 'review';
      let workflow = null;
      try {
        const response = await fetch(`${SERVER_ORIGIN}/compile`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ goal: demo.goal, events: demo.events })
        });
        if (response.ok) workflow = (await response.json())?.workflow || null;
      } catch (_) {}
      demo.workflow = workflow || compileLocally(demo.goal, demo.events);
      await chrome.storage.local.set({ [STORAGE_KEY]: demo, [UI_STATE_KEY]: true });
      await broadcast({ type: 'SET_TEACHING', enabled: false });
      sendResponse({ ok: true, demo });
    }).catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.type === 'CAPTURED_EVENT') {
    chrome.storage.local.get(STORAGE_KEY).then(async (data) => {
      const demo = data[STORAGE_KEY];
      if (!demo || demo.phase !== 'teaching') return sendResponse({ ok: false });
      demo.events = [...(demo.events || []), message.event];
      await chrome.storage.local.set({ [STORAGE_KEY]: demo });
      sendResponse({ ok: true, eventCount: demo.events.length });
    }).catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.type === 'GET_STATE') {
    chrome.storage.local.get(STORAGE_KEY).then((data) => {
      sendResponse({ ok: true, demo: data[STORAGE_KEY] || null });
    });
    return true;
  }

  if (message.type === 'CLEAR_STATE') {
    Promise.all([
      chrome.storage.local.remove(STORAGE_KEY),
      chrome.storage.local.set({ [UI_STATE_KEY]: false }),
      broadcast({ type: 'SET_TEACHING', enabled: false })
    ]).then(() => sendResponse({ ok: true })).catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.type === 'SET_UI_OPEN') {
    chrome.storage.local.set({ [UI_STATE_KEY]: Boolean(message.open) }).then(() => sendResponse({ ok: true }));
    return true;
  }

  if (message.type === 'REPLAY_WORKFLOW') {
    replayWorkflow(message.workflow, message.events).then(sendResponse);
    return true;
  }
});

async function broadcast(message) {
  const tabs = await chrome.tabs.query({});
  await Promise.all(tabs.filter((tab) => tab.id).map(tab => chrome.tabs.sendMessage(tab.id, message).catch(() => {})));
}

async function replayWorkflow(workflow, events) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return { ok: false, error: 'No active browser tab.' };

  let stepsRun = 0;
  for (const event of events || []) {
    if (!['click', 'input', 'submit', 'navigate'].includes(event.type)) continue;
    const result = await chrome.tabs.sendMessage(tab.id, { type: 'REPLAY_EVENT', event }).catch(() => null);
    if (!result?.ok) return { ok: false, error: result?.error || `Replay stopped at step ${stepsRun + 1}.`, stepsRun };
    stepsRun += 1;
  }
  return { ok: true, stepsRun };
}

function compileLocally(goal, events) {
  const steps = (events || []).filter(e => ['navigate', 'click', 'input', 'submit'].includes(e.type)).map((e) => ({
    type: e.type,
    operation: e.type === 'click' ? 'browser.click' : e.type === 'input' ? 'browser.fill' : e.type === 'navigate' ? 'browser.navigate' : 'browser.submit',
    label: e.type === 'navigate' ? `Open ${e.url}` : e.type === 'click' ? `Click ${e.target?.label || 'element'}` : e.type === 'input' ? `Enter text into ${e.target?.label || 'field'}` : 'Submit form',
    target: e.target || null
  }));
  return {
    version: 1,
    name: goal || 'Untitled workflow',
    variables: (events || []).filter(e => e.type === 'input' && e.value).map((e, i) => ({ name: `input_${i + 1}`, source: e.target?.label || 'demonstrated input', type: 'string' })),
    steps,
    assertions: ['Final browser state is reachable after the demonstrated actions.']
  };
}
