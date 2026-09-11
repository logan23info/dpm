import { NextRequest, NextResponse } from "next/server"

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
const MODEL = "openai/gpt-oss-20b"

// GDPR Authoritative Article Mapping (EUR-Lex source of truth)
const GDPR_ARTICLES: Record<string, { article: string; title: string; url: string }> = {
  "GDPR-1":  { article: "Art. 5",     title: "Principles relating to processing of personal data",     url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32016R0679#d1e1888-1-1" },
  "GDPR-2":  { article: "Art. 6",     title: "Lawfulness of processing",                               url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32016R0679#d1e1888-1-1" },
  "GDPR-3":  { article: "Art. 7",     title: "Conditions for consent",                                 url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32016R0679#d1e1888-1-1" },
  "GDPR-4":  { article: "Art. 13-14", title: "Information to be provided",                             url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32016R0679#d1e2269-1-1" },
  "GDPR-5":  { article: "Art. 15-22", title: "Rights of the data subject",                             url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32016R0679#d1e2369-1-1" },
  "GDPR-6":  { article: "Art. 25",    title: "Data protection by design and by default",               url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32016R0679#d1e3063-1-1" },
  "GDPR-7":  { article: "Art. 28",    title: "Processor obligations",                                   url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32016R0679#d1e3163-1-1" },
  "GDPR-8":  { article: "Art. 30",    title: "Records of processing activities (RoPA)",                url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32016R0679#d1e3209-1-1" },
  "GDPR-9":  { article: "Art. 32",    title: "Security of processing",                                  url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32016R0679#d1e3265-1-1" },
  "GDPR-10": { article: "Art. 33-34", title: "Personal data breach notification",                      url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32016R0679#d1e3313-1-1" },
  "GDPR-11": { article: "Art. 35",    title: "Data Protection Impact Assessment (DPIA)",               url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32016R0679#d1e3383-1-1" },
  "GDPR-12": { article: "Art. 37-39", title: "Data Protection Officer (DPO)",                          url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32016R0679#d1e3451-1-1" },
  "GDPR-13": { article: "Art. 44-49", title: "Transfers to third countries",                           url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32016R0679#d1e3611-1-1" },
  "GDPR-14": { article: "Art. 83",    title: "General conditions for imposing administrative fines",   url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32016R0679#d1e5402-1-1" },
}

function buildSystemPrompt(mode: "advisory" | "assurance"): string {
  if (mode === "advisory") {
    return `You are a Data Protection Officer (DPO) and privacy compliance expert. 
Your role is ADVISORY — you provide practical guidance, recommendations, and best practices.
You help organisations understand what they SHOULD DO to comply with GDPR.
Always cite the specific GDPR article, recital, and EDPB guidance where relevant.
Be constructive, practical, and actionable. Use clear headings for TOD, TOE, TOI sections.
Format your response with clear sections: ## Test of Design (TOD), ## Test of Effectiveness (TOE), ## Test of Implementation (TOI).
Each section should have: **Objective**, **Key Questions**, **Recommendations**, **Red Flags**.`
  }

  return `You are a senior IT Auditor conducting formal assurance work under professional audit standards.
Your role is ASSURANCE — you provide independent, objective audit opinions and conclusions.
You assess whether controls ARE designed, operating, and implemented effectively.
Always cite specific GDPR articles, EDPB guidelines, and audit evidence requirements.
Be objective, evidence-based, and conclusive. Use formal audit language.
Format your response with clear sections: ## Test of Design (TOD), ## Test of Effectiveness (TOE), ## Test of Implementation (TOI).
Each section must include: **Audit Objective**, **Evidence Required**, **Testing Procedure**, **Possible Findings**, **Audit Conclusion**.`
}

function buildUserPrompt(
  controlId: string,
  controlName: string,
  gdprRef: { article: string; title: string; url: string } | undefined,
  testResult: string,
  implementationStatus: string,
  exceptions: string,
  mode: "advisory" | "assurance"
): string {
  const gdprContext = gdprRef
    ? `GDPR Reference: ${gdprRef.article} — ${gdprRef.title}\nAuthoritative Source: ${gdprRef.url}`
    : "GDPR Reference: General data protection principles"

  return `Analyse the following control for GDPR compliance:

**Control ID**: ${controlId}
**Control Name**: ${controlName}
**${gdprContext}**

**Current Assessment:**
- Implementation Status: ${implementationStatus || "Not assessed"}
- Test Result: ${testResult || "Not tested"}
- Exceptions/Issues Noted: ${exceptions || "None noted"}

${mode === "advisory"
  ? "Provide advisory guidance with TOD, TOE, and TOI analysis. Focus on what this organisation should do to achieve and demonstrate compliance."
  : "Provide formal assurance analysis with TOD, TOE, and TOI. Assess whether this control provides reasonable assurance of GDPR compliance. State clear audit conclusions."
}

Be specific to GDPR ${gdprRef?.article || "requirements"} and cite EDPB guidelines where applicable.`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { controlId, controlName, testResult, implementationStatus, exceptions, mode } = body

    if (!controlId || !mode) {
      return NextResponse.json({ error: "controlId and mode are required" }, { status: 400 })
    }

    if (!["advisory", "assurance"].includes(mode)) {
      return NextResponse.json({ error: "mode must be 'advisory' or 'assurance'" }, { status: 400 })
    }

    const apiKey = process.env.DPM_Key
    if (!apiKey) {
      return NextResponse.json({ error: "Groq API key not configured" }, { status: 500 })
    }

    const gdprRef = GDPR_ARTICLES[controlId]

    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: "system",
            content: buildSystemPrompt(mode as "advisory" | "assurance"),
          },
          {
            role: "user",
            content: buildUserPrompt(
              controlId,
              controlName || controlId,
              gdprRef,
              testResult || "",
              implementationStatus || "",
              exceptions || "",
              mode as "advisory" | "assurance"
            ),
          },
        ],
        temperature: 0.3,
        max_tokens: 2048,
        stream: false,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error("Groq API error:", error)
      return NextResponse.json({ error: "AI analysis failed" }, { status: 500 })
    }

    const data = await response.json()
    const analysis = data.choices?.[0]?.message?.content || ""

    return NextResponse.json({
      analysis,
      gdprRef: gdprRef || null,
      model: MODEL,
      mode,
      controlId,
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    console.error("Analysis error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
