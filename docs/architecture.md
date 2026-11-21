# SpareTrellis — planned AWS architecture

SpareTrellis connects inconsistent spare-part records across warehouses for maintenance and inventory teams. It must read catalogues and purchase documents, compare technical attributes carefully and forecast demand for parts that move rarely. Designing on AWS lets it run matching and extraction at catalogue scale, host forecasting models and keep an auditable record of every approval.

This is a proposed design; the demo runs in the browser with simulated AI and fictional data.

## Stages


## Services

| Service | Role |
|---|---|
| Amazon S3 | Amazon Textract |
| Amazon Bedrock | AWS Lambda |
| Amazon Cognito | handles sign-in and roles |
| AWS Lambda | runs parsing and matching |
| AWS KMS | encrypts customer data |
| Amazon CloudWatch | monitors services |

## Principles

- The browser never holds AWS credentials; all calls go through the API with Cognito-issued tokens.
- AI output is labelled and reviewed by people before it changes any decision or record.
- Data is encrypted at rest with KMS and access is logged.
