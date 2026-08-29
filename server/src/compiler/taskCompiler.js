const SOURCING_HINTS = [
  "supplier",
  "suppliers",
  "source",
  "sourcing",
  "manufacturer",
  "manufacturers",
  "wholesaler",
  "wholesalers",
  "procure",
  "procurement",
  "vendor",
  "vendors",
  "moq",
  "minimum order",
  "lead time",
  "delivered to",
  "bulk order"
];

const BROWSER_HINTS = [
  "search",
  "google",
  "open",
  "visit",
  "go to",
  "navigate",
  "click",
  "find",
  "look up",
  "website",
  "webpage",
  "browse",
  "read",
  "extract",
  "download",
  "fill",
  "type",
  "send",
  "email"
];

function includesAny(text, hints) {
  const lower = text.toLowerCase();
  return hints.some((hint) => lower.includes(hint));
}

function compileSourcingTask(text) {
  const quantityMatch =
    text.match(/(\d[\d,]*)\s*(?:units?|pieces?|pcs?|boxes?|cartons?)/i);

  const deliveryMatch =
    text.match(
      /(?:deliver(?:ed)?|delivery)\s+(?:to|in)\s+([A-Za-z .'-]+?)(?=\s+(?:MOQ|moq|under|below|within|lead|target|budget|at|and)\b|[.,]|$)/i
    );

  const moqMatch =
    text.match(
      /(?:MOQ|minimum order quantity)\s+(?:below|under|less than|of)\s*([\d,]+)/i
    );

  const leadMatch =
    text.match(
      /(?:lead time|delivery time)\s+(?:below|under|less than|within)\s*(\d+)\s*(?:days?|business\s*days?)/i
    );

  const brief = {
    productType: null,
    dimensions: null,
    material: null,
    printing: null,
    quantity: quantityMatch
      ? Number(quantityMatch[1].replace(/,/g, ""))
      : null,
    frequency: null,
    deliveryLocation: deliveryMatch
      ? deliveryMatch[1].trim()
      : null,
    maxMoq: moqMatch
      ? Number(moqMatch[1].replace(/,/g, ""))
      : null,
    targetPrice: null,
    maxLeadTime: leadMatch
      ? Number(leadMatch[1])
      : null,
    certifications: [],
    constraints: []
  };

  const productMatch = text.match(
    /(?:find|source|need|looking for)\s+(.+?)(?=\s+(?:that|which|with|for|delivered|deliver|can)\b|[.,]|$)/i
  );

  if (productMatch) {
    brief.productType = productMatch[1].trim();
  }

  return {
    type: "supplier_sourcing",
    objective: text,
    brief,
    missing: [
      "dimensions",
      "material",
      "printing",
      "frequency",
      "targetPrice"
    ],
    completionCriteria: [
      "supplier shortlist exists",
      "supplier claims have evidence",
      "unknown fields are explicitly marked unknown",
      "duplicate suppliers are removed"
    ]
  };
}

function compileBrowserTask(text) {
  return {
    type: "browser_task",
    objective: text,
    brief: {
      goal: text
    },
    missing: [],
    completionCriteria: [
      "requested browser task is completed",
      "important actions are observable",
      "result is explicitly reported"
    ]
  };
}

export function compileTask(goal) {
  const text = String(goal || "").trim();

  if (!text) {
    throw new Error("Goal is required.");
  }

  /*
   * Procurement/sourcing wins when the request explicitly
   * contains procurement concepts.
   *
   * Otherwise a browser/computer task is the default.
   */
  if (includesAny(text, SOURCING_HINTS)) {
    return compileSourcingTask(text);
  }

  if (includesAny(text, BROWSER_HINTS)) {
    return compileBrowserTask(text);
  }

  // General natural-language computer tasks default to browser_task.
  return compileBrowserTask(text);
}
