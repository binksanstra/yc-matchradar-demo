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

  const prompt = `Je bent een sales-strateeg voor YoungCapital ${vestiging}, een uitzend- en werving & selectiebureau gespecialiseerd in young professionals (MBO-WO starters). YoungCapital Breda en Tilburg bedienen lokale MKB-bedrijven in West-Brabant en Midden-Brabant.

KANDIDAAT (KDD)
- Voornaam: ${k.naam}
- Niveau: ${k.niveau}
- Opleiding: ${k.studie || "(onbekend)"}
- Voorkeurssector: ${sectorTekst}
- Beschikbaarheid: ${k.uren}
- Werkervaring: ${k.ervaring}
- Regio-voorkeur: ${k.regio || "geen specifieke voorkeur, heel West-/Midden-Brabant"}
- Profiel/sterktes: ${k.sterk || "(niet ingevuld)"}

WERKGEBIED — STRIKT BEPERKT TOT YC BREDA/TILBURG
Het werkgebied van YoungCapital Breda en Tilburg is **uitsluitend West-Brabant en Midden-Brabant**. Andere YC-vestigingen pakken andere regio's op:
- **Eindhoven en omgeving** (Helmond, Veldhoven, Best, Geldrop) → YC Eindhoven, NIET deze tool
- **Den Bosch en alles oostelijk daarvan** → YC Nijmegen / andere vestigingen, NIET deze tool

GELDIGE GEMEENTEN (alleen deze 26 gemeenten)
West-Brabant: Breda, Bergen op Zoom, Roosendaal, Etten-Leur, Oosterhout, Moerdijk, Steenbergen, Halderberge, Rucphen, Woensdrecht, Zundert, Drimmelen, Geertruidenberg, Werkendam, Woudrichem, Aalburg, Heusden.
Midden-Brabant: Tilburg, Waalwijk, Loon op Zand, Dongen, Gilze en Rijen, Goirle, Oisterwijk, Hilvarenbeek, Alphen-Chaam, Baarle-Nassau.

ABSOLUUT VERBODEN GEMEENTEN (kies geen bedrijf met HQ daar — andere YC-vestiging pakt op)
- Eindhoven, Helmond, Veldhoven, Best, Nuenen, Geldrop, Valkenswaard, Bergeijk
- 's-Hertogenbosch (Den Bosch), Vught, Boxtel, Sint-Michielsgestel, Oss, Uden, Veghel
- Tilburg-grens-overschrijdend richting Oost-Brabant

KRITIEKE CRITERIA — ALLEEN ECHTE LOKALE MKB
Een geldig bedrijf voor deze tool voldoet aan ALLE volgende voorwaarden:
1. **Hoofdkantoor staat in een van de 26 toegestane gemeenten** hierboven (geen filialen van bedrijven elders).
2. **Bedrijfsgrootte: 25-250 medewerkers totaal** (echt MKB; niet ZZP/microbedrijf en niet corporate).
3. **Geen multinational, geen beursgenoteerd, geen bekende landelijke keten/franchise**.
4. **Geen filiaal of vestiging** van een bedrijf met hoofdkantoor elders (bijv. niet Coolblue Tilburg-vestiging — hun HQ is in Rotterdam).
5. Bij voorkeur **familie- of regionale MKB-bedrijven** met sterke lokale verankering.

VOORBEELDEN VAN BEDRIJVEN DIE JE WÉL MAG KIEZEN
Lokale familiebedrijven in installatie, bouw, groothandel, transport, maakindustrie, zakelijke dienstverlening, regionale aannemers, lokale productiebedrijven, regionale uitgeverijen, lokale IT-dienstverleners, regionale accountantskantoren, lokale agencies — bedrijven die het MKB-landschap van West-/Midden-Brabant typeren.

VOORBEELDEN OM TE VERMIJDEN
- Elk bedrijf met HQ buiten de 26 toegestane gemeenten (zelfs als ze een vestiging in Breda/Tilburg hebben)
- Bavaria (HQ in Lieshout, dat is gemeente Laarbeek/Oost-Brabant — NIET toegestaan)
- Bedrijven uit Eindhoven, Helmond, Den Bosch, Oss, Veghel, Uden — andere YC-vestiging
- Coolblue, Bol.com (corporate, HQ Rotterdam/Utrecht)
- Jumbo, Albert Heijn, Lidl, McDonalds (landelijke ketens / franchise)
- Royal HaskoningDHV, Fontys, Avans (te groot of onderwijs)
- ASR, Achmea, ING-vestigingen (corporate, HQ elders)
- Internationale logistieke giants (geen MKB)

WERKWIJZE
1. Selecteer ${aantal} bedrijven die je MET ZEKERHEID kent als echt bestaande, lokaal verankerde MKB-bedrijven in deze regio.
2. Als je twijfelt over een bedrijf (grootte, locatie HQ, of het echt bestaat), KIES HET DAN NIET. Liever ${Math.max(2, aantal-2)} sterke matches dan ${aantal} matige.
3. Per bedrijf:
   - Vacatures: formuleer rollen die dit type bedrijf typisch periodiek werft, met label "Typische rol — periodieke werving" (want zonder live data weet je niet of er nu echt iets openstaat)
   - Recente ontwikkelingen: alleen vermelden als je een feit MET REDELIJKE ZEKERHEID kent over dit specifieke bedrijf, of een sectortrend die voor dit bedrijfstype geldt. Bron transparant labelen.
4. Genereer matchscore (1.0-10.0), onderbouwing, belopening, outreach-mail en vervolgstap.

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
          "titel": "Typische rol die dit bedrijf periodiek werft",
          "niveau": "MBO|HBO|WO",
          "urgentie": "midden|laag",
          "sinds": "doorlopende werving"
        }
      ],
      "recenteOntwikkelingen": [
        {
          "tekst": "Korte beschrijving van een sectortrend of bekend feit over dit bedrijf",
          "type": "groei|investering|product|event",
          "bron": "branchekennis | sectortrend | bekend bedrijfsfeit"
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
- Lever 2 tot ${aantal} bedrijven (liever minder maar zekerder).
- In de outreach-mail en belopening: frame vacatures als "ik begreep dat u regelmatig werft voor [rol]" of "voor het type rol waar uw bedrijf in de regel mensen voor zoekt", NIET als "uw openstaande vacature voor X" (want dat kun je niet bewijzen).`;

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
