export function normalizeSupplier(input = {}) {
  return {
    id: input.id || crypto.randomUUID(),
    name: input.name || "Unknown supplier",
    location: input.location || null,
    productCapability: input.productCapability || null,
    materials: input.materials || [],
    moq: input.moq ?? null,
    unitPrice: input.unitPrice ?? null,
    toolingCost: input.toolingCost ?? null,
    gst: input.gst ?? null,
    freight: input.freight ?? null,
    leadTime: input.leadTime ?? null,
    capacity: input.capacity ?? null,
    certifications: input.certifications || [],
    contact: input.contact || null,
    sources: input.sources || [],
    unknownFields: input.unknownFields || [],
    confidence: input.confidence || "unverified"
  };
}

export function deduplicateSuppliers(suppliers = []) {
  const seen = new Map();

  for (const supplier of suppliers) {
    const key = [
      supplier.name,
      supplier.location
    ]
      .filter(Boolean)
      .join("|")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();

    if (!seen.has(key)) {
      seen.set(key, supplier);
    }
  }

  return [...seen.values()];
}
