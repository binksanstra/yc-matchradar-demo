// api/rerank.js
// AI-verfijning bovenop de rule-based scoring.
// Claude leest notities, sterktes en ervaring SEMANTISCH en herrangschikt
// op basis van concrete relevante praktijkervaring (bijv. deur-aan-deur sales,
// callcenter ervaring) — niet alleen op niveau/sectorvoorkeur.

import Anthropic from "@anthropic-ai/sdk";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Methode niet toegestaan." });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({
      error: "Configuratiefout: ANTHROPIC_API_KEY ontbreekt in Vercel."
    });
  }

  const { mode, kandidaat, bedrijf, items } = req.body || {};

  if (!mode || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Ongeldige input — mode + items vereist." });
  }

  let prompt;
  if (mode === "kandidaat-bedrijven") {
    if (!kandidaat) {
      return res.status(400).json({ error: "Kandidaat-data ontbreekt." });
    }
    prompt = bouwKandidaatBedrijvenPrompt(kandidaat, items);
  } else if (mode === "bedrijf-kandidaten") {
    if (!bedrijf) {
      return res.status(400).json({ error: "Bedrijf-data ontbreekt." });
    }
    prompt = bouwBedrijfKandidatenPrompt(bedrijf, items);
  } else {
    return res.status(400).json({ error: "Onbekende mode." });
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }]
    });

    let textContent = "";
    if (Array.isArray(message.content)) {
      for (const block of message.content) {
        if (block.type === "text" && typeof block.text === "string") {
          textContent += block.text;
        }
      }
    }

    if (!textContent.trim()) {
      return res.status(502).json({ error: "Leeg AI-antwoord. Probeer opnieuw." });
    }

    let jsonString = textContent.trim();
    jsonString = jsonString.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "");
    const firstBrace = jsonString.indexOf("{");
    const lastBrace = jsonString.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      jsonString = jsonString.slice(firstBrace, lastBrace + 1);
    }
    jsonString = jsonString.replace(/,(\s*[}\]])/g, "$1");

    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch {
      return res.status(502).json({
        error: "Kon AI-antwoord niet lezen. Probeer opnieuw."
      });
    }

    return res.status(200).json({
      ok: true,
      ranked: parsed.ranked || []
    });
  } catch (error) {
    console.error("Rerank API error:", error);
    const status = error.status || error.statusCode || 500;
    let userMessage = "AI-verfijning mislukt: " + (error.message || "onbekend");
    if (status === 401) userMessage = "API-key ongeldig — check Vercel env vars.";
    else if (status === 429) userMessage = "Te veel verzoeken of credits op.";
    else if (status >= 500) userMessage = "Anthropic-server tijdelijk niet bereikbaar.";
    return res.status(status).json({ error: userMessage });
  }
}

function bouwKandidaatBedrijvenPrompt(k, bedrijven) {
  const itemsTxt = bedrijven.map((b, i) => `[${i}] ${JSON.stringify(b)}`).join("\n");
  return `Je bent een sales-strateeg voor YoungCapital Breda/Tilburg. Beoordeel hoe goed elk van de bedrijven hieronder past bij de kandidaat.

KRITIEK: gebruik vooral de NOTITIES, STERKTES, OPLEIDING en CONCRETE PRAKTIJKERVARING van de kandidaat — niet alleen abstracte velden zoals niveau of sectorvoorkeur.
Iemand met concrete relevante ervaring (bijv. "deur-aan-deur sales", "callcenter B2C", "kassawerk", "magazijnervaring") past doorgaans beter bij rollen die op die ervaring leunen, ook als een andere persoon op papier dezelfde opleiding heeft maar geen praktijkervaring.

KANDIDAAT:
${JSON.stringify(k, null, 2)}

BEDRIJVEN (index : data):
${itemsTxt}

Geef voor elk bedrijf:
- Een verfijnde matchscore (0.0–10.0)
- Een onderbouwing van 2–3 zinnen die EXPLICIET ingaat op concrete praktijkervaring, opleiding en match-redenen
- Een korte kernreden (max 1 zin)

Sorteer op score, hoogste eerst. Geef ALLEEN geldige JSON terug, geen markdown, geen tekst eromheen:

{
  "ranked": [
    { "id": <bedrijf-index>, "score": <getal>, "onderbouwing": "<2-3 zinnen>", "kernreden": "<korte zin>" }
  ]
}`;
}

function bouwBedrijfKandidatenPrompt(b, kandidaten) {
  const itemsTxt = kandidaten.map((c, i) => `[${i}] ${JSON.stringify(c)}`).join("\n");
  return `Je bent een sales-strateeg voor YoungCapital Breda/Tilburg. Beoordeel welke kandidaat het beste past bij dit bedrijf voor deze specifieke rol.

KRITIEK: lees de NOTITIES en STERKTES van elke kandidaat zorgvuldig. Identificeer concrete praktijkervaring die relevant is voor de rol bij dit bedrijf. Iemand met concrete relevante ervaring (bijv. "deur-aan-deur verkoop" voor een sales-rol, "kassawerk" voor retail, "magazijnervaring" voor logistiek, "callcenter" voor customer service) past doorgaans beter dan iemand met alleen een passende studie maar zonder relevante praktijkervaring — ook bij hetzelfde opleidingsniveau.

BEDRIJF + ROL:
${JSON.stringify(b, null, 2)}

KANDIDATEN (index : data):
${itemsTxt}

Geef voor elke kandidaat:
- Een verfijnde matchscore (0.0–10.0)
- Een onderbouwing van 2–3 zinnen die EXPLICIET ingaat op concrete praktijkervaring uit hun notities en uitlegt waarom deze persoon wel/niet past bij de specifieke rol
- Een korte kernreden (max 1 zin)

Sorteer op score, hoogste eerst. Geef ALLEEN geldige JSON terug, geen markdown, geen tekst eromheen:

{
  "ranked": [
    { "id": <kandidaat-index>, "score": <getal>, "onderbouwing": "<2-3 zinnen>", "kernreden": "<korte zin>" }
  ]
}`;
}
