/**
 * XML-derived layout map for the current property export template.
 * This file intentionally contains no property model or exporter behavior.
 */
export type PropertyExportTemplateField = {
  status: "present" | "missing";
  labelCell?: string;
  valueCell?: string;
  valueRange?: string;
  mergedRange?: string;
  cellType?: string;
  style?: number;
  notes?: string;
};

export const propertyExportTemplateMap = {
  listingType: {
    general: { status: "present", labelCell: "A6", valueCell: "A6", mergedRange: "A6:D6", cellType: "s", style: 137, notes: "Checkbox text is embedded in the label cell." },
    exclusive: { status: "present", labelCell: "A7", valueCell: "A7", cellType: "s", style: 33, notes: "Template label is 專簽; business field is 專任." },
    verbal: { status: "present", labelCell: "A8", valueCell: "A8", cellType: "s", style: 33, notes: "A8 carries □口頭約; it is not a standalone checkbox cell." },
  },
  contractNo: { status: "present", labelCell: "A11", valueCell: "C11", valueRange: "C11:F11", mergedRange: "C11:F11", cellType: "numberOrStyle", style: 48 },
  signedDate: { status: "missing", labelCell: "L11", valueCell: "L11", notes: "L11 is a single inline label/value string (簽約日:...), not a separately merged value cell." },
  contractPeriod: { status: "present", labelCell: "G11", valueCell: "H11", valueRange: "H11:K11", mergedRange: "H11:K11", cellType: "s", style: 135 },
  saleMotivation: { status: "present", labelCell: "G12", valueCell: "H12", valueRange: "H12:L12", mergedRange: "H12:L12", cellType: "s", style: 106 },
  currentKind: { status: "present", labelCell: "G16", valueCell: "H16", valueRange: "H16:L16", mergedRange: "H16:L16", cellType: "s", style: 106, notes: "Label is 現況; choices are embedded in H16." },
  currentUse: { status: "present", labelCell: "A19", valueCell: "C19", valueRange: "C19:L19", mergedRange: "C19:L19", cellType: "s", style: 64 },
  propertyType: { status: "present", labelCell: "A20", valueCell: "C20", valueRange: "C20:L20", mergedRange: "C20:L20", cellType: "s", style: 67 },
  parking: { status: "present", labelCell: "A21", valueCell: "C21", valueRange: "C21:F22", mergedRange: "C21:F22", cellType: "s", style: 77 },
  roadWidth: { status: "present", labelCell: "A29", valueCell: "B29", valueRange: "B29:C29", mergedRange: "B29:C29", cellType: "numberOrStyle", style: 125 },
  frontage: { status: "present", labelCell: "G21", valueCell: "H21", valueRange: "H21:L22", mergedRange: "H21:L22", cellType: "numberOrStyle", style: 70 },
  depth: { status: "present", labelCell: "G23", valueCell: "H23", valueRange: "H23:L23", mergedRange: "H23:L23", cellType: "numberOrStyle", style: 70 },
  landArea: { status: "present", labelCell: "A23", valueCell: "C23", valueRange: "C23:F23", mergedRange: "C23:F23", cellType: "numberOrStyle", style: 40 },
  buildingArea: { status: "present", labelCell: "A24", valueCell: "C24", valueRange: "C24:F24", mergedRange: "C24:F24", cellType: "numberOrStyle", style: 40 },
  floor: { status: "present", labelCell: "A25", valueCell: "C25", valueRange: "C25:F25", mergedRange: "C25:F25", cellType: "s", style: 61 },
  layout: { status: "present", labelCell: "A26", valueCell: "C26", valueRange: "C26:F26", mergedRange: "C26:F26", cellType: "s", style: 61 },
  completionDate: { status: "present", labelCell: "A27", valueCell: "C27", valueRange: "C27:F27", mergedRange: "C27:F27", cellType: "s", style: 86 },
  age: { status: "missing", notes: "No 屋齡 label/value cell exists in the parsed sheet; H27:L27 belongs to the 加建 row." },
  extension: { status: "present", labelCell: "G27", valueCell: "H27", valueRange: "H27:L27", mergedRange: "H27:L27", cellType: "numberOrStyle", style: 70 },
  primarySchool: { status: "missing", labelCell: "D29", mergedRange: "D29:E29", cellType: "s", style: 125, notes: "Label exists but no adjacent writable value range is defined." },
  middleSchool: { status: "missing", labelCell: "D30", mergedRange: "D30:E30", cellType: "s", style: 125, notes: "Label is 國中學區; no adjacent writable value range is defined." },
  showingLocation: { status: "present", labelCell: "A43", valueCell: "B43", valueRange: "B43:F45", mergedRange: "B43:F45", cellType: "numberOrStyle", style: 96 },
  address: { status: "present", labelCell: "A15", valueCell: "C15", valueRange: "C15:F15", mergedRange: "C15:F15", cellType: "numberOrStyle", style: 42 },
  highlights: { status: "present", labelCell: "G28", valueCell: "G29", valueRange: "G29:L33", mergedRange: "G29:L33", cellType: "numberOrStyle", style: 125 },
  listingName: { status: "present", labelCell: "A12", valueCell: "C12", valueRange: "C12:F12", mergedRange: "C12:F12", cellType: "numberOrStyle", style: 48 },
  totalPrice: { status: "present", labelCell: "A13", valueCell: "C13", valueRange: "C13:F13", mergedRange: "C13:F13", cellType: "numberOrStyle", style: 48 },
  objectType: { status: "present", labelCell: "A20", valueCell: "B29", valueRange: "B29:C29", mergedRange: "B29:C29", cellType: "numberOrStyle", style: 125, notes: "Existing exporter writes property_type here, colliding with 路寬." },
} as const;
