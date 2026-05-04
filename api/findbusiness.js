// api/findbusiness.js
// Vercel Serverless Function — gebruikt Claude's getrainde kennis
// van Nederlandse MKB-bedrijven in West-/Midden-Brabant.
//
// Geen web search (te fragiel voor een productie-tool). Claude heeft uit
// zijn training ruime kennis van bekende bedrijven in deze regio en kan
// die combineren met de KDD om realistische matches en outreach te genereren.
 
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
 
  const sectorTekst = {
    "logistiek": "Logistiek & Magazijn",
    "horeca": "Horeca",
    "retail": "Retail",
    "productie": "Productie / Maakindustrie",
    "callcenter": "Callcenter / Klantenservice",
    "zakelijk": "Zakelijke dienstverlening",
    "it": "IT & Tech",
    "marketing": "Marketing & Sales",
    "bouw": "Bouw",
    "zorg": "Zorg & Welzijn",
    "finance": "Finance / Accounting",
    "techniek": "Techniek",
    "breed": "Breed inzetbaar"
  }[k.voorkeur] || k.voorkeur;
 
  const prompt = `Je bent een sales-strateeg voor YoungCapital ${vestiging}, een uitzend- en werving & selectiebureau gespecialiseerd in young professionals (MBO-WO starters). YoungCapital Breda en Tilburg bedienen lokale MKB-bedrijven (25-250 medewerkers) in West-Brabant en Midden-Brabant.
 
Je hebt uit je training-kennis een rijk beeld van bekende, echt bestaande MKB-bedrijven in deze regio (Breda, Tilburg, Etten-Leur, Oosterhout, Roosendaal, Bergen op Zoom, Waalwijk, Oisterwijk, Goirle, Moerdijk, Dongen, etc.). Gebruik die kennis om de KDD te matchen.
 
KANDIDAAT (KDD)
- Voornaam: ${k.naam}
- Niveau: ${k.niveau}
- Opleiding: ${k.studie || "(onbekend)"}
- Voorkeurssector: ${sectorTekst}
- Beschikbaarheid: ${k.uren}
- Werkervaring: ${k.ervaring}
- Regio-voorkeur: ${k.regio || "geen specifieke voorkeur, heel West-/Midden-Brabant"}
- Profiel/sterktes: ${k.sterk || "(niet ingevuld)"}
 
JE TAAK
Selecteer ${aantal} ECHTE MKB-bedrijven uit West-/Midden-Brabant die je kent en die passen bij deze KDD. Per bedrijf:
1. Bedenk 1-2 plausibele openstaande vacatures op basis van wat zo'n bedrijf typisch zoekt op het niveau van de kandidaat.
2. Formuleer 1-2 realistische bedrijfsontwikkelingen op basis van wat je weet over het bedrijf, hun sector, of algemene branche-trends.
3. Genereer een matchscore (1.0-10.0), onderbouwing, gepersonaliseerde belopening (gebruik het bedrijfsnieuws als haakje), volledige outreach-mail en een vervolgstap.
 
LET OP
- De bedrijven moeten ECHT bestaan (niet verzonnen) en in West-/Midden-Brabant gevestigd zijn.
- Vacatures en nieuws zijn plausibele inschattingen op basis van branchekennis — vermeld dat in de bron als 'branchekennis' of 'algemene sectorkennis'. Wees daar transparant over.
- Mix verschillende soorten bedrijven (verschillende steden, verschillende grootte binnen MKB) voor diversiteit.
- Sorteer matches op score; hoogste eerst.
 
OUTPUT
Geef ALLEEN geldige JSON terug. Geen markdown, geen \`\`\` codeblokken, geen tekst eromheen, geen verontschuldigingen.
 
Format:
{
  "topMatches": [
    {
      "bedrijfsnaam": "Echte naam",
      "sector": "logistiek|horeca|retail|productie|callcenter|zakelijk|it|marketing|bouw|zorg|finance|techniek|anders",
      "locatie": "Stad in West-/Midden-Brabant",
      "omvang": "klein|mkb|middelgroot|groot",
      "matchscore": 8.5,
      "vacatures": [
        {
          "titel": "Plausibele functietitel",
          "niveau": "MBO|HBO|WO",
          "urgentie": "urgent|hoog|midden|laag",
          "sinds": "indicatie hoe lang open"
        }
      ],
      "recenteOntwikkelingen": [
        {
          "tekst": "Korte beschrijving van het signaal/nieuws",
          "type": "groei|investering|product|event",
          "bron": "branchekennis | algemene sectorkennis | specifiek bekend"
        }
      ],
      "onderbouwing": "2-4 zinnen waarom dit bedrijf past bij ${k.naam} voor YoungCapital ${vestiging}.",
      "belopening": "Volledige openingszin voor cold call. Begin met: 'Goedemorgen, u spreekt met [JOUW NAAM] van YoungCapital ${vestiging}.' Gebruik het recente nieuws als ijsbreker en koppel het aan ${k.naam}'s profiel en de vacature.",
      "outreachMail": "Volledige zakelijke e-mail in het Nederlands. Begin met 'Onderwerp: ...' op de eerste regel, daarna een lege regel, daarna 'Beste relatiemanager,'. Gebruik [JOUW NAAM] en [telefoonnummer] | [e-mail] als placeholders. Body 4-6 zinnen die expliciet het recente nieuws EN de gevonden vacature noemen.",
      "vervolgstap": "1-2 zinnen concrete actie voor de salesmedewerker."
    }
  ],
  "samenvatting": "Eén zin: hoeveel bedrijven, regio-spreiding, type matches."
}
 
OUTPUT-DISCIPLINE — UITERST BELANGRIJK
- LEVER ALTIJD JSON. Nooit excuses, nooit uitleg, nooit markdown.
- Eerste karakter MOET een { zijn. Laatste karakter MOET een } zijn.
- Geen trailing comma's.
- Lever exact ${aantal} bedrijven.`;
 
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
 
    const message = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 6000,
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
      return res.status(502).json({
        error: "Leeg antwoord van Claude. Probeer het opnieuw."
      });
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
    } catch (parseErr) {
      const sample = textContent.slice(0, 400).replace(/\s+/g, " ");
      return res.status(502).json({
        error: "Kon Claude's antwoord niet als JSON lezen. (Antwoord begon met: " + sample + "...)"
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
      userMessage = "API-key ongeldig. Controleer de ANTHROPIC_API_KEY in Vercel.";
    } else if (status === 429) {
      userMessage = "Te veel verzoeken of credits op. Top up bij console.anthropic.com.";
    } else if (status >= 500) {
      userMessage = "Anthropic-server tijdelijk niet bereikbaar. Probeer over een minuut opnieuw.";
    }
 
    return res.status(status).json({ error: userMessage });
  }
}
 
