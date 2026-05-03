# YC MatchRadar — afstudeerprototype

Een Nederlandstalig, frontend-only prototype voor **YoungCapital Breda / Tilburg** dat per kandidaat-bedrijf-combinatie een matchscore en outreach-content genereert. Volledig in de browser; geen API-key, geen backend, geen kosten.

Ontworpen voor afstudeeronderzoek en live demo's: stabiel, voorspelbaar en professioneel ogend.

## Wat de tool doet

Op basis van een ingevuld **kandidaatprofiel** en **bedrijfsprofiel** genereert de tool:

1. **Matchscore** (1.0 – 10.0) op basis van een gewogen scoringsmodel.
2. **Onderbouwing** — waarom deze match wel/niet werkt voor YoungCapital Breda/Tilburg.
3. **Persoonlijke belopening** — kant-en-klare openingszin voor een koud telefoongesprek.
4. **Outreach-mail** — volledige zakelijke e-mail met onderwerpregel, klaar om te kopiëren.
5. **Vervolgstap-advies** — concrete actie afhankelijk van de score.

## Hoe het scoringmodel werkt (handig voor de scriptie)

De score (max 10) wordt opgebouwd uit zes weegfactoren:

| Factor | Max punten | Wat wordt beoordeeld |
|---|---|---|
| Sector-potentieel YC | 25 | Hoe goed past de sector bij YoungCapital's portfolio (logistiek/callcenter scoren hoog, zorg lager). |
| Locatie | 20 | Ligt het bedrijf in West-Brabant (Breda) of Midden-Brabant (Tilburg)? |
| Bedrijfsomvang | 15 | MKB (25-100 medewerkers) is de sweet spot. |
| Kandidaat-sectorfit | 20 | Sluit de voorkeur van de kandidaat aan op de bedrijfssector? |
| Niveau-fit | 10 | Past het opleidingsniveau bij het type werk in deze sector? |
| Beschikbaarheid + ervaring | 10 | Hoe inzetbaar is de kandidaat (uren + ervaringsniveau)? |

Totaal van max 100 punten wordt gedeeld door 10 om op een 1-10 schaal te komen, met een minimum van 2.5 en maximum van 9.8 om realistische score-ranges te garanderen.

De tekstuele outputs (onderbouwing, belopening, mail, vervolgstap) worden gegenereerd uit dynamische templates die de specifieke input personaliseren — denk aan: bedrijfsnaam, kandidaatnaam, sector, locatie, regio en YC-vestiging worden allemaal doorgegeven aan de tekstgeneratie zodat elke output uniek voelt.

## Lokaal uitproberen

Open simpelweg `index.html` in een browser. Geen build-stap, geen install. Dubbelklik op het bestand en je bent er.

## Online zetten via Vercel (gratis, 5 minuten)

### Optie A: drag-and-drop (simpelst, geen account-setup)

1. Ga naar https://vercel.com/new
2. Maak een gratis account aan (kan met GitHub of e-mail)
3. Klik op het tabje **"Deploy"** of zoek naar **"Drop your project files here"**
4. Sleep de hele map `yc-matchradar-demo` (of alleen `index.html`) erin
5. Klik op **Deploy**
6. Klaar — je krijgt een URL zoals `https://yc-matchradar-demo.vercel.app`

### Optie B: via GitHub (handig als je wijzigingen wilt blijven maken)

1. Maak een GitHub-account op https://github.com/signup (gratis)
2. Maak een nieuwe lege repository aan, bijvoorbeeld `yc-matchradar-demo`
3. Klik op **"uploading an existing file"** en sleep `index.html` (en eventueel `README.md`) erin
4. Klik op **"Commit changes"**
5. Ga naar https://vercel.com → **"Add New" → "Project"** → kies je nieuwe repo
6. Laat alle instellingen op standaard staan en klik op **Deploy**

## Tips voor je presentatie

- Gebruik de **drie voorbeeld-knoppen** bovenaan om snel realistische scenario's te demonstreren zonder live te hoeven typen.
- De **Print/PDF-knop** rechtsonder maakt een nette PDF van het resultaat — handig voor je scriptie-bijlage.
- De loading-animatie (~1.6 sec) maakt het bewust voelt als een AI-tool, zonder echt iets externs aan te roepen.
- Je kunt elk veld aanpassen om edge cases te laten zien (bijv. een bedrijf in Eindhoven krijgt een lagere locatie-score).

## Aanpassen

Alle logica zit in de `<script>` aan het einde van `index.html`. De interessante plekken om iets te tweaken:

- `SECTOREN`, `LOCATIES`, `OMVANG_SCORE`: stel de scoring-tabellen bij naar jouw bevindingen.
- `VOORBEELDEN`: pas de drie demo-scenario's aan met cases die voor jouw scriptie relevanter zijn.
- `genereerOnderbouwing`, `genereerBelopening`, `genereerMail`, `genereerVervolgstap`: hier verander je de tekstuele templates.

## Verantwoording (voor je scriptie)

Dit prototype simuleert een AI-tool zonder daadwerkelijk een large language model aan te roepen. De keuze is bewust:

- **Voorspelbaarheid:** identieke input geeft identieke output, cruciaal voor demonstraties en validatie van het concept.
- **Geen externe afhankelijkheden:** geen API-keys, geen kosten, geen risico op service-uitval tijdens de presentatie.
- **Transparante scoring:** de wegingsfactoren zijn expliciet en uitlegbaar — een belangrijk voordeel boven een black-box AI als het gaat om reproduceerbaarheid.

Voor een productieversie zou de tekstgeneratie eventueel ondersteund kunnen worden door een large language model (zoals Anthropic's Claude of OpenAI's GPT), met de huidige scoringslogica als input/grounding. Dat valt buiten de scope van dit prototype.
