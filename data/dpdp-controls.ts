// DPDP Act 2023 — Digital Personal Data Protection Act (India)
// Authoritative Source: https://www.meity.gov.in/sites/upload_files/dit/files/The%20Digital%20Personal%20Data%20Protection%20Act%2C%202023.pdf

export const DPDP_CONTROLS = [
  {
    id: "DPDP-1",
    domain: "Lawful Processing",
    control_objective: "Obtain valid consent from Data Principal",
    section: "Section 6",
    description: "Personal data shall be processed only for a lawful purpose with the consent of the Data Principal, or for certain legitimate uses.",
    risk_addressed: "Processing personal data without valid consent or legitimate use, exposing organisation to penalties under Section 33.",
    key: true,
    framework: "DPDP Act 2023",
    tod_questions: [
      "Is the consent mechanism designed to be free, specific, informed, and unambiguous?",
      "Does the consent notice clearly describe the purpose of processing?",
      "Is there a mechanism to withdraw consent as easily as it was given?",
    ],
    toe_questions: [
      "Are consent records being maintained and retrievable?",
      "Is processing limited to the purpose for which consent was obtained?",
      "Are withdrawal requests being honoured within reasonable time?",
    ],
    toi_questions: [
      "Inspect consent collection forms and notices",
      "Review consent database records",
      "Test withdrawal process end-to-end",
    ],
  },
  {
    id: "DPDP-2",
    domain: "Notice & Transparency",
    control_objective: "Provide clear and itemised notice to Data Principals",
    section: "Section 5",
    description: "Data Fiduciary must provide notice at the time of or before seeking consent, describing personal data to be collected and purpose.",
    risk_addressed: "Failure to provide adequate notice resulting in invalid consent and regulatory action.",
    key: true,
    framework: "DPDP Act 2023",
    tod_questions: [
      "Does the notice clearly itemise personal data collected?",
      "Is the notice provided before or at time of consent collection?",
      "Is the notice available in English and scheduled Indian languages?",
    ],
    toe_questions: [
      "Are notices being displayed consistently across all touchpoints?",
      "Are notices updated when processing purposes change?",
    ],
    toi_questions: [
      "Review all customer-facing notices",
      "Test notice display on web, app, and offline channels",
    ],
  },
  {
    id: "DPDP-3",
    domain: "Data Principal Rights",
    control_objective: "Honour rights of Data Principals",
    section: "Sections 11-14",
    description: "Data Principals have rights to: access information, correction & erasure, grievance redressal, and nomination.",
    risk_addressed: "Failure to honour Data Principal rights leading to complaints to Data Protection Board.",
    key: true,
    framework: "DPDP Act 2023",
    tod_questions: [
      "Is there a mechanism for Data Principals to access their personal data?",
      "Is there a process for correction and erasure requests?",
      "Is a grievance redressal mechanism in place with timelines?",
    ],
    toe_questions: [
      "Are requests being actioned within prescribed timelines?",
      "Is there a log of all Data Principal requests?",
    ],
    toi_questions: [
      "Submit test requests for access, correction, and erasure",
      "Review request handling logs and response times",
    ],
  },
  {
    id: "DPDP-4",
    domain: "Data Fiduciary Obligations",
    control_objective: "Implement security safeguards for personal data",
    section: "Section 8",
    description: "Data Fiduciary shall protect personal data using reasonable security safeguards to prevent breach.",
    risk_addressed: "Personal data breach due to inadequate security leading to penalties up to ₹250 crore.",
    key: true,
    framework: "DPDP Act 2023",
    tod_questions: [
      "Are reasonable security safeguards designed and documented?",
      "Is there a data breach detection and response mechanism?",
      "Is personal data erased when purpose is no longer served?",
    ],
    toe_questions: [
      "Are security controls operating effectively?",
      "Are breach incidents being reported to Data Protection Board?",
    ],
    toi_questions: [
      "Review security architecture and controls",
      "Test breach detection and notification procedures",
    ],
  },
  {
    id: "DPDP-5",
    domain: "Data Processor Management",
    control_objective: "Engage Data Processors only under valid contract",
    section: "Section 8(2)",
    description: "Data Fiduciary shall process personal data through Data Processors only under a valid contract.",
    risk_addressed: "Unlawful processing by third-party processors without contractual safeguards.",
    key: true,
    framework: "DPDP Act 2023",
    tod_questions: [
      "Are Data Processing Agreements in place with all processors?",
      "Do agreements specify purposes, obligations, and security requirements?",
    ],
    toe_questions: [
      "Are processor agreements being maintained and renewed?",
      "Are processors being monitored for compliance?",
    ],
    toi_questions: [
      "Review all Data Processing Agreements",
      "Inspect processor due diligence records",
    ],
  },
  {
    id: "DPDP-6",
    domain: "Significant Data Fiduciary",
    control_objective: "Comply with additional SDF obligations if applicable",
    section: "Section 10",
    description: "Significant Data Fiduciaries must appoint DPO, conduct DPAIA, and implement additional safeguards.",
    risk_addressed: "Non-compliance with SDF requirements leading to enhanced penalties.",
    key: false,
    framework: "DPDP Act 2023",
    tod_questions: [
      "Has the organisation been notified as a Significant Data Fiduciary?",
      "Is a Data Protection Officer appointed and accessible?",
      "Is a Data Protection Impact Assessment conducted annually?",
    ],
    toe_questions: [
      "Is the DPO independent and reporting to the Board?",
      "Are DPIAIs being conducted and documented?",
    ],
    toi_questions: [
      "Review DPO appointment documentation",
      "Inspect DPIAI reports",
    ],
  },
  {
    id: "DPDP-7",
    domain: "Cross-Border Transfers",
    control_objective: "Ensure lawful transfer of personal data outside India",
    section: "Section 16",
    description: "Central Government may restrict transfer of personal data to certain countries or territories.",
    risk_addressed: "Unlawful transfer of personal data to restricted jurisdictions.",
    key: true,
    framework: "DPDP Act 2023",
    tod_questions: [
      "Is there an inventory of all cross-border data transfers?",
      "Are transfers restricted to permitted countries only?",
      "Are contractual safeguards in place for all transfers?",
    ],
    toe_questions: [
      "Are restricted country lists being monitored and updated?",
      "Are transfers being logged and reviewed?",
    ],
    toi_questions: [
      "Review data flow maps for cross-border transfers",
      "Inspect transfer agreements and country permit lists",
    ],
  },
]

export default DPDP_CONTROLS
