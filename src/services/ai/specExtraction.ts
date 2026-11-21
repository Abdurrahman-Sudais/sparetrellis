/**
 * MOCK technical specification extraction.
 * A rule-based stand-in for the attribute extraction that Amazon Bedrock
 * would perform on free-text part descriptions in production.
 */

export type SpecMap = Record<string, string>;

interface Rule {
  key: string;
  re: RegExp;
  value: (m: RegExpMatchArray) => string | null;
}

const RULES: Rule[] = [
  {
    key: "Bearing designation",
    re: /(?:^|[^0-9A-Z])(6[0-3]\d{2})(?=[^0-9]|$)/,
    value: (m) => m[1],
  },
  {
    key: "Seal / shield",
    re: /(2RSH|2RSR|2RS1|2RS|DDU|LLU|SEALED|RUBBER SEAL|2Z|ZZ|SHIELDED|METAL SHIELD)/,
    value: (m) => (/2Z|ZZ|SHIELD/.test(m[1]) ? "ZZ (metal shielded)" : "2RS (rubber sealed)"),
  },
  {
    key: "Dimensions",
    re: /(\d+(?:\.\d+)?)\s*X\s*(\d+(?:\.\d+)?)\s*X\s*(\d+(?:\.\d+)?)/,
    value: (m) => `${m[1]}×${m[2]}×${m[3]} mm`,
  },
  {
    key: "Voltage",
    re: /(\d{2,3})\s*V\s*(AC|DC)\b|(\d{2,3})\s*V(AC|DC)|(\d{3})\s*V\b/,
    value: (m) => (m[1] ? `${m[1]} V ${m[2]}` : m[3] ? `${m[3]} V ${m[4]}` : `${m[5]} V`),
  },
  {
    key: "Current rating",
    re: /(?:^|[^0-9A-Z.])(\d{1,3})\s*(?:A|AMP|AMPS)(?![A-Z0-9])/,
    value: (m) => `${m[1]} A`,
  },
  {
    key: "Power",
    re: /(\d+(?:\.\d+)?)\s*KW/,
    value: (m) => `${m[1]} kW`,
  },
  {
    key: "Poles",
    re: /(?:^|[^0-9A-Z/])(\d)\s*(?:P|POLE)(?![A-Z0-9])/,
    value: (m) => `${m[1]}-pole`,
  },
  {
    key: "Belt section",
    re: /\b(SPA|SPB|SPC|SPZ)\s*-?\s*\d{3,4}\b/,
    value: (m) => m[1],
  },
  {
    key: "Belt length",
    re: /\b(?:SPA|SPB|SPC|SPZ)\s*-?\s*(\d{3,4})\b/,
    value: (m) => `${m[1]} mm`,
  },
  {
    key: "Thread / size",
    re: /\bM(\d{1,2})(?![0-9])/,
    value: (m) => `M${m[1]}`,
  },
  {
    key: "Nominal size",
    re: /(?:^|[^0-9/])(\d\/\d|\d(?:\.\d)?)\s*(?:"|IN\b|INCH)/,
    value: (m) => `${m[1]}"`,
  },
  {
    key: "Filtration",
    re: /(\d{1,3})\s*(?:MICRON|MIC\b|UM\b|µ)/,
    value: (m) => `${m[1]} µm`,
  },
  {
    key: "Pressure class",
    re: /(?:CL|CLASS)\s*(150|300|600)\b|\b(150|300|600)\s*(?:#|LB)/,
    value: (m) => `Class ${m[1] ?? m[2]}`,
  },
  {
    key: "Range",
    re: /0\s*-\s*(\d{1,3})\s*BAR/,
    value: (m) => `0–${m[1]} bar`,
  },
  {
    key: "Material",
    re: /\b(NBR|FKM|VITON|EPDM|PTFE|SS316|SS304|BRASS|NYLON)\b/,
    value: (m) => (m[1] === "VITON" ? "FKM" : m[1]),
  },
  {
    key: "Output",
    re: /\b(PNP|NPN)\b/,
    value: (m) => m[1],
  },
  {
    key: "Coupling size",
    re: /\b(L0\d{2}|L1\d{2})\b/,
    value: (m) => m[1],
  },
  {
    key: "Fuse size",
    re: /\bNH\s*-?\s*(00|0|1|2|3)\b/,
    value: (m) => `NH${m[1]}`,
  },
];

/** Keys where a mismatch means the parts are almost certainly not the same item. */
export const CRITICAL_SPECS = new Set([
  "Bearing designation",
  "Seal / shield",
  "Dimensions",
  "Voltage",
  "Current rating",
  "Power",
  "Belt section",
  "Belt length",
  "Thread / size",
  "Nominal size",
  "Filtration",
  "Pressure class",
  "Range",
  "Material",
  "Output",
  "Coupling size",
  "Fuse size",
  "Poles",
]);

export function extractSpecs(text: string): SpecMap {
  const s = text.toUpperCase().replace(/×/g, "X").replace(/[”″]/g, '"');
  const out: SpecMap = {};
  for (const rule of RULES) {
    const m = s.match(rule.re);
    if (m) {
      const v = rule.value(m);
      if (v) out[rule.key] = v;
    }
  }
  return out;
}
