export const SOURCING_FIELDS = [
  "productType",
  "dimensions",
  "material",
  "printing",
  "quantity",
  "frequency",
  "deliveryLocation",
  "maxMoq",
  "targetPrice",
  "maxLeadTime",
  "certifications",
  "constraints"
];

export function emptySourcingBrief() {
  return {
    productType: null,
    dimensions: null,
    material: null,
    printing: null,
    quantity: null,
    frequency: null,
    deliveryLocation: null,
    maxMoq: null,
    targetPrice: null,
    maxLeadTime: null,
    certifications: [],
    constraints: []
  };
}

export function normalizeSourcingBrief(input = {}) {
  const brief = emptySourcingBrief();

  for (const field of SOURCING_FIELDS) {
    if (input[field] !== undefined && input[field] !== null) {
      brief[field] = input[field];
    }
  }

  return brief;
}
