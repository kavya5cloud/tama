export function createEvidence({
  sourceUrl,
  sourceTitle = null,
  field,
  value,
  capturedAt = new Date().toISOString(),
  confidence = "medium"
}) {
  return {
    sourceUrl,
    sourceTitle,
    field,
    value,
    capturedAt,
    confidence
  };
}

export function unknownField(field) {
  return {
    field,
    value: null,
    status: "unknown",
    evidence: []
  };
}
