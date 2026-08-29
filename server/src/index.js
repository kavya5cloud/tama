import http from "node:http";
import { createTask } from "./orchestrator/orchestrator.js";
import { evaluateAction } from "./policy/policyEngine.js";

const PORT = Number(process.env.PORT || 8787);

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
  });

  res.end(JSON.stringify(data));
}

async function readJson(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (!chunks.length) return {};

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
    });
    return res.end();
  }

  try {
    if (req.method === "GET" && req.url === "/health") {
      return sendJson(res, 200, {
        ok: true,
        service: "tama-server",
        version: "0.3.0"
      });
    }

    if (req.method === "POST" && req.url === "/tasks") {
      const body = await readJson(req);

      if (!body.goal?.trim()) {
        return sendJson(res, 400, {
          error: "goal is required"
        });
      }

      const task = createTask(body.goal);

      return sendJson(res, 200, {
        ok: true,
        task
      });
    }

    if (req.method === "POST" && req.url === "/policy/check") {
      const body = await readJson(req);

      return sendJson(res, 200, {
        ok: true,
        ...evaluateAction(body)
      });
    }

    return sendJson(res, 404, {
      error: "Not found"
    });
  } catch (error) {
    console.error(error);

    return sendJson(res, 500, {
      error: error.message
    });
  }
});

server.listen(PORT, () => {
  console.log(`Tama server running on http://localhost:${PORT}`);
});
