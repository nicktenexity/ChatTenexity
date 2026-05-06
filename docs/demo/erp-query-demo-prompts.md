# ERP Query Demo Prompts

Use these prompts with the `ERP Database Analyst` mode after the Tenexity ERP MCP service is connected.

## Orientation

```text
Inspect the ERP connection profile and schema map. Tell me what operational objects appear to be available, what tables look most relevant for inventory, sales orders, purchase orders, shipments, and manufacturing work orders, and what is missing before we build dashboards.
```

## Inventory

```text
Show current inventory position by SKU and location for the top at-risk items. Explain which fields you used, what the row limit was, and what follow-up query should come next.
```

## Order Risk

```text
Find open sales orders that appear late or at risk. Summarize by customer, promised date, order value, and likely operational cause. Turn the result into a dashboard spec.
```

## Executive Artifact

```text
Create a client-ready operations brief from the ERP data: inventory health, fulfillment risk, purchasing pressure, data-quality gaps, and the next three decisions leadership needs to make.
```
