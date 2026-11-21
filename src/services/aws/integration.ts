/**
 * AWS integration descriptors.
 *
 * The demo runs entirely in the browser with mock services. This module
 * documents the intended production wiring and exposes typed configuration
 * so each mock can be swapped for a real client without UI changes.
 */
export type AwsServiceStatus = "mock" | "planned" | "configured";

export interface AwsServiceDescriptor {
  id: string;
  service: string;
  role: string;
  usage: string[];
  status: AwsServiceStatus;
  mockModule?: string;
  envVar?: string;
}

export const AWS_SERVICES: AwsServiceDescriptor[] = [
  {
    id: "bedrock",
    service: "Amazon Bedrock",
    role: "Semantic catalogue matching",
    usage: [
      "Embeddings for part descriptions to find candidate pairs",
      "LLM attribute extraction (dimensions, ratings, materials)",
      "Explanations of matching and conflicting attributes",
    ],
    status: "mock",
    mockModule: "services/ai/matching.ts → MockBedrockMatcher",
    envVar: "VITE_BEDROCK_MATCHING_API",
  },
  {
    id: "textract",
    service: "Amazon Textract",
    role: "Purchase record & catalogue extraction",
    usage: ["Extract line items from scanned purchase orders and invoices", "Parse tables from supplier PDF catalogues"],
    status: "mock",
    mockModule: "services/importService.ts → mockTextractExtract",
    envVar: "VITE_TEXTRACT_API",
  },
  {
    id: "sagemaker",
    service: "Amazon SageMaker AI",
    role: "Intermittent-demand forecasting",
    usage: ["Hosted forecasting endpoint for intermittent and lumpy spare-part demand", "Batch transform for monthly re-forecasts"],
    status: "planned",
    mockModule: "services/ai/forecasting.ts → SimulatedForecastProvider / SageMakerForecastProvider",
    envVar: "VITE_SAGEMAKER_ENDPOINT",
  },
  {
    id: "s3",
    service: "Amazon S3",
    role: "Imported files & documents",
    usage: ["Raw uploads (CSV, XLSX, PDF) with versioning", "Generated report exports"],
    status: "planned",
    envVar: "VITE_UPLOAD_BUCKET",
  },
  {
    id: "dynamodb",
    service: "Amazon DynamoDB",
    role: "Inventory & reviewed part relationships",
    usage: ["Inventory records and catalogue master", "Human-reviewed match decisions and audit trail"],
    status: "mock",
    mockModule: "hooks/useAppStore.tsx (browser localStorage)",
  },
  {
    id: "lambda",
    service: "AWS Lambda",
    role: "Matching & processing workflows",
    usage: ["Import validation and normalization pipeline", "Candidate generation and scoring jobs", "Report generation"],
    status: "planned",
  },
  {
    id: "cognito",
    service: "Amazon Cognito",
    role: "Authentication",
    usage: ["User pools with SSO federation", "Role-based access: specialist, planner, approver, admin"],
    status: "mock",
    mockModule: "hooks/useAuth.tsx",
    envVar: "VITE_COGNITO_USER_POOL_ID",
  },
  {
    id: "cloudwatch",
    service: "Amazon CloudWatch",
    role: "Monitoring",
    usage: ["Pipeline metrics, match throughput and model latency", "Alarms on failed imports and forecast drift"],
    status: "planned",
  },
];
