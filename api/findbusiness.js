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
Vind ${aantal} ECHTE MKB-bedrijven in West-/Midden-Brabant met passende openstaande vacatures voor de kandidaat hieronder. Gebruik de web_search tool actief om actuele bedrijfs- en vacature-informatie te vinden.

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
1. Doe 4-6 web searches om bedrijven en vacatures in deze regio en sector te identificeren. Bijvoorbeeld:
   - vacatures van type X in Breda OF Tilburg OF West-Brabant
   - LinkedIn-bedrijfspagina's of Indeed-vacatures voor specifieke sectoren
   - bedrijfsnieuws over groei/contracten/uitbreiding
2. Filter op MKB (25-250 medewerkers); geen multinationals, geen ZZP'ers, geen fictieve bedrijven.
3. Per geselecteerd bedrijf: zoek 1-2 recente bedrijfsontwikkelingen die als haakje kunnen dienen voor outreach (groei, nieuwe contracten, uitbreiding, lancering, etc.).
4. Sorteer de top matches op score; hoogste eerst.

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
- Verzin geen vacatures die je niet hebt gevonden; als je geen exacte vacature hebt gevonden, vermeld dan een algemene rol die past bij het bedrijf en zet urgentie op 'laag'.
- Wees realistisch en zakelijk in de outreach — geen overdreven taal, geen marketing-fluff.`;

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 8000,
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
          max_uses: 8
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

    // Probeer JSON-blok te isoleren
    let jsonString = textContent.trim();
    const firstBrace = jsonString.indexOf("{");
    const lastBrace = jsonString.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      jsonString = jsonString.slice(firstBrace, lastBrace + 1);
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch (parseErr) {
      return res.status(502).json({
        error: "Kon het antwoord van Claude niet als JSON lezen. Probeer het opnieuw.",
        ruwAntwoord: textContent.slice(0, 500)
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
