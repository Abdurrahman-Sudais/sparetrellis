// Site facts used by the marketing kit (forms, AWS section, progress, motion). A proposed product:
// AWS services and integrations are planned until implemented and verified.
type Stage = readonly [string, readonly string[], string];
type Pair = readonly [string, string];
type Stat = readonly [number, string, string?, string?];
export type Site = {
  name: string; email: string; founder: string;
  orgLabel: string; orgTypes: readonly string[]; useCases: readonly string[]; topics: readonly string[];
  detailLabel: string; detailProp: string; detailPlaceholder: string;
  demoTitle: string; demoIntro: string;
  progress: readonly (readonly [string, string, string])[];
  cycle: readonly string[]; marquee: readonly string[]; stats: readonly Stat[];
  aws: { why: string; stages: readonly Stage[]; across: readonly Pair[]; services: readonly Pair[] };
};

export const SITE: Site = {
  name: "SpareTrellis", email: "hello@sparetrellis.com", founder: "Damilare Akinyemi",
  orgLabel: "Organisation type", orgTypes: ["Manufacturing plant", "Process industry", "Utilities and energy", "Mining and heavy industry", "Other"],
  useCases: ["Catalogue clean-up", "Duplicate part matching", "Stock discovery across warehouses", "Spare-part demand forecasting", "Reports", "Other"],
  topics: ["Pilot programme", "Pricing", "Technical / AWS deployment", "Data import and integrations", "Partnership", "Other"],
  detailLabel: "Catalogue and sites", detailProp: "catalogue_detail", detailPlaceholder: "e.g. ~15,000 part records · 5 warehouses · SAP export",
  demoTitle: "See the spares you already own.", demoIntro: "SpareTrellis is a proposed product in its building stage. A demo walks through import, matching, stock discovery and forecasting on a fictional plant's catalogue.",
  progress: [["2026", "Company founded", "By Damilare Akinyemi, to help maintenance teams find spare parts already in stock."], ["Done", "Matching method defined", "Matches are suggestions; approval links records and never merges them; equivalents need engineering evidence."], ["Done", "Working product demo", "Import, matching, discovery, forecasting, normalisation and reports on fictional data."], ["Done", "AWS reference architecture", "Matching, document extraction, forecasting, storage and monitoring designed."], ["Next", "First pilots", "One site's catalogue and warehouses, with planners approving every match and reorder."]],
  cycle: ["maintenance teams", "inventory planners", "reliability engineers"],
  marquee: ["Bearings", "Seals", "Contactors", "Valves", "Motors", "Duplicate records", "Part matching", "Cross-warehouse search", "Intermittent demand", "Reorder suggestions", "Normalisation", "Audit trail"],
  stats: [[8, "warehouses searched at once"], [230, "spare-part types in the demo catalogue"], [4, "steps from messy records to decisions"], [0, "records merged without a person approving"]],
  aws: {
    why: "SpareTrellis connects inconsistent spare-part records across warehouses for maintenance and inventory teams. It must read catalogues and purchase documents, compare technical attributes carefully and forecast demand for parts that move rarely. Designing on AWS lets it run matching and extraction at catalogue scale, host forecasting models and keep an auditable record of every approval.",
    stages: [["Import", ["Amazon S3", "Amazon Textract"], "Catalogues, spreadsheets and purchase records are uploaded and extracted."], ["Match", ["Amazon Bedrock", "AWS Lambda"], "Specifications are extracted and likely duplicates suggested with matching and conflicting attributes."], ["Forecast", ["Amazon SageMaker AI"], "Intermittent-demand models suggest reorder quantities for planner approval."], ["Records", ["Amazon DynamoDB"], "Parts, links, approvals and audit history are stored as structured records."], ["Monitor", ["Amazon CloudWatch"], "Pipelines and models are monitored."]],
    across: [["Amazon Cognito", "handles sign-in and roles"], ["AWS Lambda", "runs parsing and matching"], ["AWS KMS", "encrypts customer data"], ["Amazon CloudWatch", "monitors services"]],
    services: [["Amazon Bedrock", "Extracts specifications and suggests part matches."], ["Amazon Textract", "Extracts data from catalogues and purchase documents."], ["Amazon SageMaker AI", "Forecasts intermittent spare-part demand."], ["Amazon S3", "Stores uploaded files and datasets."], ["Amazon DynamoDB", "Stores parts, links, approvals and audit history."], ["AWS Lambda", "Runs parsing and matching workflows."], ["Amazon Cognito", "Authenticates users."], ["Amazon CloudWatch", "Monitors pipelines and models."], ["AWS KMS", "Encrypts customer data."]],
  },
};
