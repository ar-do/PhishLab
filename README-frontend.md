# Frontend — Phishing-Simulationsplattform

React-Dashboard aus der Architekturskizze. Das Frontend spricht ausschliesslich
REST/HTTP mit der Backend-API und hat keinen direkten Zugriff auf Tracking
Service, Redis, PostgreSQL oder den Mailserver.

```
React Dashboard ──REST/HTTP──▶ Backend API (modularer Monolith)
```

## Starten

```bash
npm install
cp .env.example .env      # VITE_USE_MOCKS=true laesst die App ohne Backend laufen
npm run dev
```

Das Mock-Backend (MSW, `src/mocks/handlers.ts`) bildet die Kampagnenliste,
Vorlagen, Empfaenger und Reports nach. Sobald die API steht, `VITE_USE_MOCKS`
auf `false` setzen — der Vite-Proxy leitet `/api` auf `localhost:8080`.

```bash
npm run typecheck    # tsc, strict
npm run build        # Produktionsbuild
```

## Aufbau

```
src/
  api/          HTTP-Schicht. types.ts ist der Kontrakt zum Backend.
  auth/         Session, RBAC-Matrix, Route-Guards.
  i18n/         DE/EN, deutsche Datei ist Referenz.
  components/   UI-Primitive und Shell inkl. Not-Aus-Leiste.
  features/     Fachliche Seiten, je Modul ein Ordner.
  mocks/        MSW-Handler fuer die Entwicklung ohne Backend.
```

Zwei Dateien lohnen sich zuerst:

- **`src/api/types.ts`** — der vollstaendige API-Kontrakt. Das Backend wird
  dagegen gebaut, Aenderungen hier sind Vertragsaenderungen.
- **`src/auth/permissions.ts`** — die Rollenmatrix an einer Stelle statt
  verstreuter Rollenabfragen, damit sie gegen das Rollenkonzept gegengelesen
  werden kann.

## Anforderungsabdeckung

| ID | Umsetzung |
|---|---|
| FE-01 | `features/auth/LoginPage.tsx`, `auth/AuthProvider.tsx` — zweistufiger Login, Token nur im Speicher |
| FE-02 | `features/campaigns/wizard/CampaignWizard.tsx` — 5 Schritte, endet mit Einreichen zur Freigabe |
| FE-03 | `features/templates/TemplateEditorPage.tsx` — serverseitige Vorschau im Sandbox-iframe, Platzhalter an Cursorposition |
| FE-04 | `features/targets/` — zweistufiger CSV-Import mit Mapping, Suche, Opt-out |
| FE-05 | `features/monitoring/MonitoringPage.tsx`, `api/events.ts` — SSE mit Polling-Fallback |
| FE-06 | `features/reporting/ReportingPage.tsx` — Kennzahlen, Gruppenaggregation, serverseitiger Export |
| FE-07 | `auth/permissions.ts`, `auth/Can.tsx`, `auth/RequireAuth.tsx` |
| FE-08 | `components/layout/LiveCampaignBar.tsx` — aus jeder Ansicht erreichbar |
| FE-09 | Tokens in `index.css`, `Field`-Komponente, `i18n/` |

## Entscheidungen, die Erklaerung brauchen

**Token nur im Arbeitsspeicher.** Kein `localStorage`. Das Access-Token lebt in
einem Modul-Scope in `api/client.ts`, das Refresh-Token in einem
httpOnly-Cookie, das das Frontend nie sieht. Nach einem Reload holt der
`AuthProvider` still eine neue Session. Kostet einen Request beim Seitenaufbau
und ist es wert.

**Der Wizard endet mit „Zur Freigabe einreichen", nicht mit „Starten".** Nach
AUT-03 kann niemand seine eigene Kampagne losschicken. Ein Startknopf am Ende
des Wizards wuerde das Gegenteil suggerieren.

**Vorschau kommt vom Server.** Wenn das Frontend das Mail-HTML selbst
zusammensetzte, waere die Vorschau eine andere Mail als die spaeter versendete
und der Sanitizer (TPL-02) umgehbar. Angezeigt wird in einem iframe mit leerem
`sandbox`-Attribut.

**Der Not-Aus haengt in der Shell, nicht auf einer Seite.** Ein Not-Aus, der
erst gesucht werden muss, ist keiner. Der Bestaetigungsdialog bleibt trotzdem —
der Abbruchgrund muss ins Protokoll (AUT-04).

**Unterdrueckte Gruppen verschwinden nicht aus der Tabelle.** REP-04 blendet zu
kleine Gruppen aus. Die Zeile bleibt aber mit einer Erklaerung stehen, sonst
liesse sich per Differenzbildung doch auf Einzelne schliessen — und niemand
wuesste, ob die Gruppe fehlt oder unterdrueckt wurde.

**Farbe ist fuer Zustand reserviert.** Der Kampagnenstatus entscheidet, ob
gerade echte Mails an echte Kollegen gehen. Deshalb traegt in der Oberflaeche
fast nur er Farbe. Status steht immer zusaetzlich als Text da (WCAG 1.4.1).

## Was das Backend liefern muss

Ueber den Kontrakt in `types.ts` hinaus:

1. **`GET /campaigns/{id}/stream`** als SSE-Endpunkt. Die Architekturskizze
   kennt zwischen FE und API nur REST/HTTP. Ohne diesen Kanal laeuft die
   Live-Ansicht im Polling-Modus — funktioniert, ist aber traeger und erzeugt
   Last. Die Entscheidung gehoert in die Architektur, nicht ins Frontend.
2. **`blockedForCurrentUser`** in `ApprovalState`. Das Frontend kann nicht
   selbst entscheiden, wer freigeben darf.
3. **Mindestgruppengroesse** — steht aktuell doppelt: als `MIN_GROUP_SIZE` in
   `ReportingPage.tsx` (nur fuer den Erklaertext) und serverseitig. Besser als
   Konfigurationswert ueber die API ausliefern.
4. **Einheitliches Fehlerformat** nach `ApiProblem` inkl. `correlationId`
   (NFA-04).

## Noch offen

- **Landingpage/Awareness-Service** ist bewusst *nicht* Teil dieses Frontends.
  Sie ist oeffentlich erreichbar und hat ein voellig anderes Sicherheitsprofil
  als ein Admin-Dashboard hinter MFA. Eigene, minimale Anwendung.
- **Audit-Ansicht** (AUT-04) ist in der Rollenmatrix und im Kontrakt angelegt,
  hat aber noch keine Seite.
- **shadcn/ui**: Die Primitive in `components/ui/` sind handgeschrieben und
  API-kompatibel gehalten. Wer die Originalkomponenten will, kann sie per
  `npx shadcn@latest add …` ersetzen; die Tokens in `index.css` passen.
- **Barrierefreiheit** ist konstruktiv beruecksichtigt (Fokus, `aria-live`,
  Fehlertexte, `lang`, natives `<dialog>`), aber nicht mit Screenreader oder
  axe geprueft. Fuer WCAG 2.1 AA als Abnahmekriterium braucht es einen Testlauf.
- Typecheck und Build laufen; im Browser ist das Gerüst noch nicht durchgeklickt.
