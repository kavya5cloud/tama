import { compileTask } from "../compiler/taskCompiler.js";

export function createTask(goal) {
  const compiled = compileTask(goal);

  return {
    id: crypto.randomUUID(),
    state: "ready",
    createdAt: new Date().toISOString(),
    ...compiled
  };
}

export function nextState(task, event) {
  if (!task) {
    throw new Error("Task is required.");
  }

  switch (event?.type) {
    case "start":
      return { ...task, state: "researching" };

    case "pause":
      return { ...task, state: "paused" };

    case "stop":
      return { ...task, state: "stopped" };

    case "research_complete":
      return { ...task, state: "review" };

    default:
      return task;
  }
}
