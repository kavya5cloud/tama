const http = require('http');

const PORT = 8787;

function json(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST,GET,OPTIONS'
  });
  res.end(data);
}

function inferVariables(events = []) {
  return events.filter(e => e.type === 'input' && e.value).map((e, i) => ({
    name: `input_${i + 1}`,
    source: e.target?.label || 'demonstrated input',
    type: 'string'
  }));
}

function compile(goal, events) {
  const steps = [];
  for (const e of events) {
    if (!['navigate','click','input','submit'].includes(e.type)) continue;
    const operation = e.type === 'navigate' ? 'browser.navigate' : e.type === 'click' ? 'browser.click' : e.type === 'input' ? 'browser.fill' : 'browser.submit';
    const label = e.type === 'navigate'
      ? `Open ${e.url}`
      : e.type === 'click'
        ? `Click ${e.target?.label || 'element'}`
        : e.type === 'input'
          ? `Enter text into ${e.target?.label || 'field'}`
          : 'Submit form';
    steps.push({ type: e.type, operation, label, target: e.target || null });
  }
  return {
    version: 1,
    name: goal,
    variables: inferVariables(events),
    steps,
    assertions: ['Final browser state is reachable after the demonstrated actions.']
  };
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') return json(res, 204, {});
  if (req.method === 'GET' && req.url === '/health') return json(res, 200, { ok: true, service: 'tama' });
  if (req.method === 'POST' && req.url === '/compile') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const input = JSON.parse(body || '{}');
        json(res, 200, { workflow: compile(input.goal || 'Untitled workflow', input.events || []) });
      } catch (error) {
        json(res, 400, { error: error.message });
      }
    });
    return;
  }
  json(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => console.log(`Tama server listening on http://localhost:${PORT}`));
