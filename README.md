# Zuteiler

Gruppen-Ziehung für Wichtel, Secret Santa & Co. Jemand erstellt einen Raum, alle melden sich mit Name und Passwort an, der Host drückt auf **Kreis ziehen**, und jede Person erfährt genau **einen** Namen. Niemand sonst sieht ihn.

Deutsch und Englisch umschaltbar, dunkles Design standard, helles per Klick. Mobile first, auf dem PC responsive. Ein kleiner Punkt zeigt, wer gerade online ist (grün) und wer nicht (grau).

## So funktioniert es

1. **Raum erstellen:** Name und Passwort (mind. 4 Zeichen). Du wirst Host. Es entsteht ein 6-stelliger Raum-Code.
2. **Beitreten:** Code, Name und Passwort. Existiert der Name schon, wird das Passwort geprüft und man ist wieder drin (Login). Neue Namen können nur beitreten, solange der Raum noch nicht gezogen ist.
3. **Ziehen:** Ab 3 Personen kann der Host ziehen. Die Personen werden zufällig zu einem einzigen Kreis verbunden: jede Person beschenkt genau eine, wird von genau einer beschenkt, und niemand zieht sich selbst.
4. **Aufdecken:** Jede Person sieht nur ihren eigenen Pfeil und tippt die Karte auf, um den Namen zu sehen. Die Zuteilungen der anderen verlassen den Server nie.
5. **Online-Status:** Der Browser meldet sich alle paar Sekunden. Wer in den letzten 40 Sekunden aktiv war, zählt als online.

### Sicherheit (kurz)

- Passwörter werden nur gehasht gespeichert (PBKDF2-SHA256, 100 000 Iterationen, eigenes Salt pro Person).
- Session-Tokens liegen nur als SHA-256-Hash in der Datenbank.
- Nach 8 falschen Passwörtern wird ein Name 5 Minuten gesperrt.
- Der Server gibt einer Person nur ihr eigenes Ziel zurück.

## Projektstruktur

```
zuteiler/
  public/            Frontend (HTML, CSS, JS, kein Build-Schritt)
  src/worker.js      API auf Cloudflare Workers
  migrations/        Datenbankschema für Cloudflare D1 (0001 Grundschema, 0002 Online-Status)
  wrangler.jsonc     Cloudflare-Konfiguration
  package.json
```

## Veröffentlichen (kostenlos)

Ziel ist **Cloudflare Workers**. Frontend und API laufen zusammen, inklusive Datenbank D1 (Free-Plan).

### 1. Datenbank anlegen und ID eintragen

```bash
npx wrangler d1 create zuteiler
```

Die Ausgabe enthält eine `database_id`. Sie steht in `wrangler.jsonc` anstelle von `REPLACE_WITH_D1_DATABASE_ID`. Die ID ist kein Geheimnis und darf ins Repo. Ohne diese Änderung schlägt der Build mit Fehler 10021 fehl.

### 2. Migrationen auf die echte Datenbank spielen

Der Cloudflare-Build (Git-Integration) führt die Migrationen **nicht** aus. Das machst du einmal lokal, und bei jedem neuen Migrationsfile wiederholen:

```bash
npm install
npx wrangler login
npm run db:migrate
```

### 3. Veröffentlichen

Zwei Wege:

- **Mit GitHub (empfohlen):** Repo pushen, im Cloudflare-Dashboard unter *Workers & Pages > zuteiler > Settings > Build* das Repo verbinden. Jeder Push deployt automatisch.
- **Direkt vom PC:** `npm run deploy`

Die URL steht danach im Dashboard, etwa `https://zuteiler.<dein-name>.workers.dev`.

### Lokal testen (optional)

```bash
npm run db:migrate:local
npm run dev
```

Dann http://localhost:8787 öffnen.

## Was noch fehlt / was du entscheiden solltest

**Pflicht, damit es läuft**

- [ ] Cloudflare-Account
- [ ] `database_id` in `wrangler.jsonc` eintragen und committen
- [ ] `npm run db:migrate` einmal ausführen (und nach jeder neuen Migration erneut)

**Empfohlen**

- [ ] **Datenschutz:** Gespeichert werden Namen, gehashte Passwörter und der letzte Aktivitätszeitpunkt. Für eine öffentliche Seite in DE/EU brauchst du eine kurze Datenschutzerklärung. Ein Impressum ist für rein private Seiten nicht Pflicht, empfohlen wird es aber.
- [ ] **Passwort vergessen:** Es gibt keinen Reset. Wer sein Passwort vergisst, kommt nicht mehr rein. Der Host sollte das im Hinterkopf haben.
- [ ] **Alte Räume aufräumen:** Räume werden nie automatisch gelöscht. Später kannst du per Cron-Trigger (`triggers.crons` in `wrangler.jsonc`) alles löschen, was älter als z. B. 30 Tage ist.
- [ ] **Spam-Schutz:** Die Sperre gilt pro Name. Gegen massenhaftes Raum-Erstellen hilft eine kostenlose Rate-Limit-Regel im Cloudflare-Dashboard (Security, Rate limiting) oder Turnstile.
- [ ] **Eigene Domain (optional):** Im Dashboard unter *Workers > zuteiler > Settings > Domains & Routes*.

**Verhalten, das du wissen solltest**

- Wer sich mit demselben Namen auf einem zweiten Gerät anmeldet, wird auf dem ersten abgemeldet (ein aktives Gerät pro Name).
- Der Host kann die Ziehung zurücksetzen und neu ziehen.
- Mindestens 3 Personen für eine Ziehung. Das lässt sich über `MIN_PLAYERS` in `src/worker.js` ändern.
- Der Online-Punkt ist eine Näherung: Ein Tab im Hintergrund zählt nach ca. 40 Sekunden als offline.
