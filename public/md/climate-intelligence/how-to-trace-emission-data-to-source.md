# How can we trace every emission number back to raw sensor or invoice data?

Canonical: https://senseible.earth/climate-intelligence/how-to-trace-emission-data-to-source

Traceability requires a structured data management system that logs every emission calculation to its source document or measurement. Start by establishing a data hierarchy: raw inputs like fuel invoices, electricity bills, or IoT sensor readings form the base layer. Each data point should carry metadata including timestamp, source identifier, collection method, and responsible person or system.

Use unique transaction IDs to link calculated emissions back through the calculation chain to the original input. For example, if Scope 1 emissions from a diesel generator are 500 kg CO2e, the system should reference the specific fuel purchase invoice number, date, quantity in liters, the emission factor used, and the calculation standard applied.

Implement version control so that if an invoice is corrected or a sensor recalibrated, the change is logged and previous calculations can be retraced. Digital platforms with audit trail capabilities and blockchain-based systems can automate this linkage.

Manual systems require disciplined documentation protocols with clear file naming conventions and centralized storage. Regular internal audits should test traceability by randomly selecting final emission figures and working backward to source documents.

This approach satisfies third-party verification requirements under ISO 14064, CDP, and regulatory frameworks like BRSR in India or CSRD in the EU.

## Related guides

- [What is Senseible and How is It Different from Sensibull?](https://senseible.earth/climate-intelligence/what-is-senseible-different-from-sensibull)
- [What Documents Do I Need for Carbon Verification?](https://senseible.earth/climate-intelligence/documents-needed-carbon-verification)
- [Why Every Invoice Needs a Trust Score — Not Just Pass/Fail](https://senseible.earth/climate-intelligence/why-every-invoice-needs-trust-score)
