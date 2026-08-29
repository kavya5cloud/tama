import http from "node:http";
import { createTask, nextState } from "./orchestrator/orchestrator.js";
import { evaluateAction } from "./policy/policyEngine.js";

const PORT = Number(process.env.PORT || 8787);

const tasks = new Map();

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

  if (!chunks.length) {
    return {};
  }

  return JSON.parse(
    Buffer.concat(chunks).toString("utf8")
  );
}

function buildResearchPlan(task) {
  if (task.type === "browser_task") {
    return {
      mode: "browser",
      objective: task.objective,
      status: "ready",
      next: {
        type: "observe"
      }
    };
  }

  if (task.type === "supplier_sourcing") {
    return {
      mode: "sourcing",
      objective: task.objective,
      status: "ready",
      next: {
        type: "observe"
      }
    };
  }

  return {
    mode: "browser",
    objective: task.objective,
    status: "ready",
    next: {
      type: "observe"
    }
  };
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
        version: "0.4.0"
      });
    }

    if (req.method === "POST" && req.url === "/tasks") {
      const body = await readJson(req);

      if (!body.goal?.trim()) {
        return sendJson(res, 400, {
          ok: false,
          error: "goal is required"
        });
      }

      const task = createTask(body.goal);

      tasks.set(task.id, task);

      return sendJson(res, 200, {
        ok: true,
        task
      });
    }

    if (req.method === "POST" && req.url === "/research") {
      const body = await readJson(req);

      const task =
        body.task ||
        (body.goal
          ? createTask(body.goal)
          : null);

      if (!task) {
        return sendJson(res, 400, {
          ok: false,
          error: "task or goal is required"
        });
      }

      const researching = nextState(
        task,
        { type: "start" }
      );

      tasks.set(
        researching.id,
        researching
      );

      const plan =
        buildResearchPlan(researching);

      return sendJson(res, 200, {
        ok: true,
        task: researching,
        plan
      });
    }

    if (
      req.method === "POST" &&
      req.url === "/policy/check"
    ) {
      const body = await readJson(req);

      return sendJson(res, 200, {
        ok: true,
        ...evaluateAction(body)
      });
    }

    return sendJson(res, 404, {
      ok: false,
      error: "Not found"
    });
  } catch (error) {
    console.error(error);

    return sendJson(res, 500, {
      ok: false,
      error: error.message
    });
  }
});

server.listen(PORT, () => {
  console.log(
    `Tama server running on http://localhost:${PORT}`
  );
});
