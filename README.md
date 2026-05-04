# YC MatchRadar v2 — afstudeerprototype + live new business

Een Nederlandstalige sales-tool voor **YoungCapital Breda / Tilburg** met **twee modi**:

1. **Demo-database** (gratis) — scant een ingebouwde set van 30+ representatieve MKB-bedrijven in West-/Midden-Brabant. Perfect voor presentatie en ontwikkeling. Geen API nodig.
2. **Live new business** (API) — gebruikt Anthropic's Claude met web search om écht bestaande MKB-bedrijven (Breda/Tilburg) te vinden met openstaande vacatures, recente nieuws-updates en gepersonaliseerde outreach.

## Bestanden

```
yc-matchradar-demo/
├── index.html            Frontend met modus-schakelaar
├── api/
│   └── findbusiness.js   Backend (Vercel serverless function) voor live mode
├── package.json          Dependencies (Anthropic SDK)
├── vercel.json           Vercel config
└── README.md             Dit bestand
```

## Hoe de demo-modus werkt

Zelfde als v1: een gewogen scoringsmodel met 8 factoren (sector, locatie, omvang, kandidaatfit, vacature-urgentie, niveau, recente activiteit, beschikbaarheid) tegen een ingebouwde fictieve database. Geen kosten, voorspelbaar, geschikt voor demo's.

## Hoe de live-modus werkt

1. Je vult de KDD in en kiest "Live new business" als modus.
2. Frontend stuurt het kandidaatprofiel naar `/api/findbusiness` (Vercel serverless function).
3. Die backend gebruikt jouw `ANTHROPIC_API_KEY` (veilig in Vercel's env vars) en roept Claude aan met de **web search tool**.
4. Claude doet 4–8 web searches (LinkedIn, vacaturesites, bedrijfssites, nieuwsbronnen) om echte MKB-bedrijven te vinden met openstaande vacatures in West-/Midden-Brabant.
5. Claude scoort de matches en genereert per bedrijf: onderbouwing, belopening, mail en vervolgstap, met verwijzing naar concrete vacatures en recent nieuws.
6. Frontend toont de resultaten in dezelfde card-UI als demo-modus.

**Kostenindicatie:** ~$0,10 – $0,30 per zoekopdracht. Met $5 aan credits doe je 15-50 zoekopdrachten.

## Vereisten voor live-modus

- Anthropic-account met betaalmiddel (creditcard of debetkaart, bijv. via Revolut / bunq werkt prima)
- Minimaal $5 prepaid credits opgeladen via console.anthropic.com → Plans & Billing
- API-key uit console.anthropic.com → API Keys
- API-key in Vercel als environment variable: `ANTHROPIC_API_KEY`

## Verantwoording (voor je scriptie)

Het prototype is in twee versies gebouwd om beide kanten van het concept te illustreren:

- **Demo-modus** simuleert een werkende AI-tool met een rule-based matchingmodel en gegenereerde outreach via templates. Voorspelbaar, transparant, geschikt voor concept-validatie.
- **Live-modus** toont de productieversie waarin Claude (Anthropic's LLM) met web search live data ophaalt om echte bedrijven en vacatures te identificeren. Bewijst dat de architectuur schaalbaar is naar daadwerkelijk gebruik.

In de scriptie kun je de scoringslogica uit demo-modus uitleggen en met live-modus laten zien hoe het in productie zou werken voor échte sales op echte prospects.

## Aanpassen

- `BEDRIJVEN_DATABASE` in `index.html`: pas de fictieve demo-bedrijven aan.
- `prompt` in `api/findbusiness.js`: verfijn wat Claude moet zoeken in live-modus.
- `tools[].max_uses` in `api/findbusiness.js`: lager = sneller en goedkoper, hoger = grondiger maar duurder.
- Scoringsfactoren in `berekenMatch()`: stel weegfactoren bij naar jouw bevindingen.

## Tips voor je presentatie

- Begin in demo-modus om de score-berekening en outputs te tonen.
- Switch dan naar live-modus om in real-time echte bedrijven op te zoeken — sterke "wow"-moment voor je verdediging.
- Op live-modus: wacht ongeveer 30-60 seconden terwijl Claude het web doorzoekt. De loading-animatie laat de stappen zien.
- De "Print"-knop maakt een nette PDF van het resultaat voor je scriptie-bijlage.
