import {
  SOURCING_FIELDS,
  normalizeSourcingBrief
} from "../../../shared/sourcing-schema.js";

const PATTERNS = {
  productType: [
    /(?:find|source|need|looking for)\s+(.+?)(?=\s+(?:that|which|with|for|delivered|deliver|can)\b|[.,]|$)/i
  ],
  quantity: [
    /(\d[\d,]*)\s*(?:units?|pieces?|pcs?|boxes?|cartons?)/i
  ],
  deliveryLocation: [
    /(?:deliver(?:ed)?|delivery)\s+(?:to|in)\s+([A-Za-z .'-]+?)(?=\s+(?:MOQ|moq|under|below|within|lead|target|budget|at|and)\b|[.,]|$)/i
  ],
  maxMoq: [
    /(?:MOQ|minimum order quantity)\s+(?:below|under|less than|of)\s*(?:₹\s*)?([\d,]+)/i
  ],
  maxLeadTime: [
    /(?:lead time|delivery time)\s+(?:below|under|less than|within)\s*(\d+)\s*(?:days?|business days?)/i
  ],
  targetPrice: [
    /(?:target|budget|price)\s+(?:landed cost\s+)?(?:below|under|less than|of)?\s*(?:₹\s*)?([\d,.]+)/i
  ]
};

function firstMatch(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return null;
}

function parseNumber(value) {
  if (!value) return null;
  const cleaned = String(value).replace(/,/g, "");
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : null;
}

export function compileTask(goal) {
  const text = String(goal || "").trim();
  const brief = normalizeSourcingBrief({});

  brief.productType = firstMatch(text, PATTERNS.productType);

  const quantity = firstMatch(text, PATTERNS.quantity);
  brief.quantity = parseNumber(quantity);

  brief.deliveryLocation =
    firstMatch(text, PATTERNS.deliveryLocation);

  const moq = firstMatch(text, PATTERNS.maxMoq);
  brief.maxMoq = parseNumber(moq);

  const lead = firstMatch(text, PATTERNS.maxLeadTime);
  brief.maxLeadTime = parseNumber(lead);

  const price = firstMatch(text, PATTERNS.targetPrice);
  brief.targetPrice = parseNumber(price);

  const missing = SOURCING_FIELDS.filter((field) => {
    if (field === "certifications" || field === "constraints") return false;
    const value = brief[field];
    return value === null || value === "";
  });

  return {
    type: "supplier_sourcing",
    objective: text,
    brief,
    missing,
    completionCriteria: [
      "supplier shortlist exists",
      "material supplier claims have evidence",
      "unknown fields are explicitly marked unknown",
      "duplicate suppliers are removed"
    ]
  };
}
