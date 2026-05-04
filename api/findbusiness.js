// api/findbusiness.js
// Vercel Serverless Function — draait op de server, niet in de browser.
// De ANTHROPIC_API_KEY blijft veilig in Vercel's environment variables.
//
// Deze endpoint gebruikt Claude met de web search tool om ECHTE MKB-bedrijven
// in West-/Midden-Brabant te vinden die passen bij een ingevoerde KDD.
 
import Anthropic from "@anthropic-ai/sdk";
 
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Methode niet toegestaan. Gebruik POST." });
  }
 
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({
      error: "Configuratiefout: ANTHROPIC_API_KEY ontbreekt. Voeg deze toe in Vercel → Settings → Environment Variables."
    });
  }
 
  const k = req.body || {};
 
  if (!k.naam || !k.voorkeur || !k.niveau) {
    return res.status(400).json({
      error: "Vul minimaal naam, opleidingsniveau en voorkeurssector in voor de kandidaat."
    });
  }
 
  const aantal = Math.max(3, Math.min(10, parseInt(k.aantal, 10) || 5));
  const vestiging = k.regio === "tilburg" ? "Tilburg"
                  : k.regio === "breda" ? "Breda"
                  : "Breda/Tilburg";
 
  const prompt = `Je bent een sales-strateeg voor YoungCapital ${vestiging}, een uitzend- en werving & selectiebureau gespecialiseerd in young professionals (MBO-WO starters). YoungCapital Breda en Tilburg bedienen lokale MKB-bedrijven in West-Brabant en Midden-Brabant.
 
JE TAAK
Identificeer ${aantal} ECHTE MKB-bedrijven in West-/Midden-Brabant die passen bij de kandidaat hieronder. Combineer twee kennisbronnen:
1. **Web search** (2-4 zoekopdrachten) om recente vacatures, bedrijfsnieuws of groeisignalen te vinden
2. **Je eigen training-kennis** over bekende MKB-bedrijven in West-Brabant en Midden-Brabant
 
KANDIDAAT (KDD)
- Voornaam: ${k.naam}
- Niveau: ${k.niveau}
- Opleiding: ${k.studie || "(onbekend)"}
- Voorkeurssector: ${k.voorkeur}
- Beschikbaarheid: ${k.uren}
- Werkervaring: ${k.ervaring}
- Regio-voorkeur: ${k.regio || "geen specifieke voorkeur, heel West-/Midden-Brabant"}
- Profiel/sterktes: ${k.sterk || "(niet ingevuld)"}
 
WERKWIJZE
1. Doe 2-4 gerichte web searches om bedrijven en sectorinfo in deze regio te vinden (bijv. "MKB ${k.voorkeur} Breda Tilburg", "${k.voorkeur} bedrijven West-Brabant vacatures", "${k.voorkeur} vacature ${k.niveau}").
2. Combineer met je kennis van bestaande, bekende MKB-bedrijven in deze regio en sector. Echte voorbeelden uit West-/Midden-Brabant zijn er genoeg — denk aan namen die je kent van bedrijfslijsten, KvK, branche-organisaties.
3. Selecteer ${aantal} bedrijven die echt bestaan en in West-/Midden-Brabant gevestigd zijn (Breda, Tilburg, Etten-Leur, Oosterhout, Roosendaal, Bergen op Zoom, Waalwijk, Oisterwijk, Goirle, Moerdijk e.d.).
4. Per bedrijf: formuleer 1-2 plausibele openstaande vacatures op basis van wat zo'n bedrijf typisch zoekt, en 1-2 recente bedrijfsontwikkelingen op basis van wat je weet of hebt gevonden. Wees realistisch — geen fantasie, wel pragmatische inschatting.
5. Sorteer de matches op score; hoogste eerst.
 
PRINCIPE
Voor de outreach-content geldt: een plausibele, realistische inschatting is waardevoller dan een lege output. Wees transparant in de bron-vermelding (bijv. "op basis van branchekennis" of "volgens recente LinkedIn-post" naar gelang).
 
OUTPUT
Geef ALLEEN geldige JSON terug, GEEN markdown, GEEN uitleg eromheen, GEEN \`\`\` codeblokken.
 
Format:
{
  "topMatches": [
    {
      "bedrijfsnaam": "Echte naam van het bedrijf",
      "sector": "logistiek|horeca|retail|productie|callcenter|zakelijk|it|marketing|bouw|zorg|finance|techniek|anders",
      "locatie": "Stadnaam in West-/Midden-Brabant",
      "omvang": "klein|mkb|middelgroot|groot",
      "matchscore": 8.5,
      "vacatures": [
        {
          "titel": "Concrete functietitel die je hebt gevonden",
          "niveau": "MBO|HBO|WO",
          "urgentie": "urgent|hoog|midden|laag",
          "sinds": "indicatie hoe lang open, bijv. '2 weken' of 'recent'"
        }
      ],
      "recenteOntwikkelingen": [
        {
          "tekst": "Korte beschrijving van het signaal/nieuws (zonder de bedrijfsnaam te herhalen aan het begin)",
          "type": "groei|investering|product|event",
          "bron": "Korte verwijzing naar bron, bijv. 'LinkedIn-post' of 'persbericht via bedrijfssite'"
        }
      ],
      "onderbouwing": "2-4 zinnen waarom dit bedrijf past bij ${k.naam} voor YoungCapital ${vestiging}.",
      "belopening": "Volledige openingszin voor cold call in het Nederlands. Begin met: 'Goedemorgen, u spreekt met [JOUW NAAM] van YoungCapital ${vestiging}.' Gebruik het recente nieuws als ijsbreker en koppel het aan ${k.naam}'s profiel en de vacature.",
      "outreachMail": "Volledige zakelijke e-mail in het Nederlands. Begin met 'Onderwerp: ...' op de eerste regel, daarna een lege regel, daarna 'Beste relatiemanager,'. Gebruik [JOUW NAAM] en [telefoonnummer] | [e-mail] als placeholders. Body 4-6 zinnen die expliciet het recente nieuws EN de gevonden vacature noemen.",
      "vervolgstap": "1-2 zinnen concrete actie voor de salesmedewerker, met duidelijke urgentie afhankelijk van de score en vacature-status."
    }
  ],
  "samenvatting": "Eén zin: hoeveel bedrijven gevonden, hoeveel acute vacatures, regio-spreiding."
}
 
BELANGRIJK
- Alle teksten in het Nederlands.
- Bedrijven MOETEN echt bestaan en in West-/Midden-Brabant gevestigd zijn.
- Vacatures: gebruik concrete info indien gevonden, anders een plausibele rol die past bij het bedrijfstype + niveau van de kandidaat. Zet urgentie op 'midden' of 'laag' als je het niet zeker weet.
- Recent nieuws: gebruik wat je hebt gevonden, of een plausibele observatie over de sector/regio met bron-aanduiding "branchekennis" of "sectortrend".
- Wees realistisch en zakelijk in de outreach — geen overdreven taal.
 
OUTPUT-DISCIPLINE — UITERST BELANGRIJK
- LEVER ALTIJD JSON, ook als de zoekresultaten niet ideaal zijn. NOOIT excuses of uitleg in plaats van JSON.
- Je eerste karakter MOET een { zijn.
- Je laatste karakter MOET een } zijn.
- Geen tekst vóór de {. Geen tekst na de }. Geen \`\`\`json. Geen markdown. Geen verontschuldigingen.
- Geen trailing comma's.
- Als je twijfelt over een veld, gebruik dan een lege string "" of lege array [], maar lever altijd het complete object.
- Lever minimaal ${aantal} bedrijven; vul aan met je training-kennis als web search te weinig oplevert.`;
 
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
 
    const message = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 8000,
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
          max_uses: 4
        }
      ],
      messages: [{ role: "user", content: prompt }]
    });
 
    // Verzamel alle tekstcontent uit het antwoord
    let textContent = "";
    if (Array.isArray(message.content)) {
      for (const block of message.content) {
        if (block.type === "text" && typeof block.text === "string") {
          textContent += block.text;
        }
      }
    }
 
    if (!textContent.trim()) {
      return res.status(502).json({
        error: "Leeg antwoord van Claude. Probeer het opnieuw."
      });
    }
 
    // Probeer JSON-blok te isoleren — robuuster
    let jsonString = textContent.trim();
 
    // Verwijder eventuele markdown-codeblokken: ```json ... ``` of ``` ... ```
    jsonString = jsonString.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "");
 
    // Pak het grootste {...}-blok
    const firstBrace = jsonString.indexOf("{");
    const lastBrace = jsonString.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      jsonString = jsonString.slice(firstBrace, lastBrace + 1);
    }
 
    // Verwijder trailing commas (komen voor in LLM JSON-output)
    jsonString = jsonString.replace(/,(\s*[}\]])/g, "$1");
 
    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch (parseErr) {
      // Stuur een korte sample mee zodat we kunnen zien wat Claude deed
      const sample = textContent.slice(0, 600).replace(/\s+/g, " ");
      return res.status(502).json({
        error: "Kon Claude's antwoord niet als JSON lezen. Probeer het opnieuw, of pas de zoekopdracht aan. (Antwoord begon met: " + sample + "...)"
      });
    }
 
    return res.status(200).json({
      ok: true,
      kandidaat: { naam: k.naam, niveau: k.niveau, voorkeur: k.voorkeur, regio: k.regio || "" },
      vestiging,
      topMatches: parsed.topMatches || [],
      samenvatting: parsed.samenvatting || ""
    });
  } catch (error) {
    console.error("Anthropic API error:", error);
    const status = error.status || error.statusCode || 500;
    let userMessage = "API-aanroep mislukt: " + (error.message || "onbekende fout");
 
    if (status === 401) {
      userMessage = "API-key ongeldig. Controleer de ANTHROPIC_API_KEY in Vercel → Settings → Environment Variables.";
    } else if (status === 429) {
      userMessage = "Te veel verzoeken of credits op. Top up bij https://console.anthropic.com → Plans & Billing.";
    } else if (status >= 500) {
      userMessage = "Anthropic-server tijdelijk niet bereikbaar. Probeer over een minuut opnieuw.";
    }
 
    return res.status(status).json({ error: userMessage });
  }
}
 
