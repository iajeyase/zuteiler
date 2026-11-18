# Zuteiler

Gruppen-Ziehung für Wichtel, Secret Santa & Co. Jemand erstellt einen Raum, alle melden sich mit Name und Passwort an, der Host drückt auf **Kreis ziehen**, und jede Person erfährt genau **einen** Namen. Niemand sonst sieht ihn.

Deutsch und Englisch umschaltbar, dunkles Design standard, helles per Klick. Mobile first, auf dem PC responsive.

## So funktioniert es

1. **Raum erstellen:** Name + Passwort (mind. 4 Zeichen). Du wirst Host. Es entsteht ein 6-stelliger Raum-Code.
2. **Beitreten:** Code + Name + Passwort. Existiert der Name schon, wird das Passwort geprüft und man ist wieder drin (Login). Neue Namen können nur beitreten, solange der Raum noch nicht gezogen ist.
3. **Admin-Mail:** Bei jedem neuen Teilnehmer (und bei jedem Raum-Start) geht eine Mail an die fest eingetragene Admin-Adresse.
4. **Ziehen:** Ab 3 Personen kann der Host ziehen. Die Personen werden zufällig zu einem einzigen Kreis verbunden: jede Person beschenkt genau eine, wird von genau einer beschenkt, und niemand zieht sich selbst.
5. **Aufdecken:** Jede Person sieht nur ihren eigenen Pfeil und tippt die Karte auf, um den Namen zu sehen. Die Zuteilungen der anderen werden nie an den Browser geschickt.

### Sicherheit (kurz)

- Passwörter werden nur gehasht gespeichert (PBKDF2-SHA256, 100 000 Iterationen, eigenes Salt pro Person).
- Session-Tokens liegen nur als SHA-256-Hash in der Datenbank.
- Nach 8 falschen Passwörtern wird ein Name 5 Minuten gesperrt.
- Der Server gibt einer Person nur ihr eigenes Ziel zurück.

## Projektstruktur

```
zuteiler/
  public/            Frontend (HTML, CSS, JS, kein Build-Schritt)
  src/worker.js      API auf Cloudflare Workers, Admin-Adresse steht hier
  migrations/        Datenbankschema für Cloudflare D1
  wrangler.jsonc     Cloudflare-Konfiguration
  package.json
```

## Veröffentlichen (alles kostenlos)

Ziel ist **Cloudflare Workers** (Frontend und API laufen zusammen, Free-Plan, inkl. Datenbank D1). Keine Server-Miete.

### 1. Accounts anlegen

- **Cloudflare:** https://dash.cloudflare.com/sign-up (kostenlos). Du bekommst automatisch eine Adresse `zuteiler.<dein-name>.workers.dev`.
- **Resend** (für die Admin-Mails): https://resend.com (kostenlos, aktuell 100 Mails/Tag). Dort unter *API Keys* einen Key erstellen (Permission "Sending access" reicht).

### 2. Lokal vorbereiten

Node.js LTS muss installiert sein.

```bash
cd zuteiler
npm install
npx wrangler login
```

### 3. Datenbank anlegen

```bash
npx wrangler d1 create zuteiler
```

Die Ausgabe enthält eine `database_id`. Diese in `wrangler.jsonc` bei `REPLACE_WITH_D1_DATABASE_ID` eintragen.

```bash
npm run db:migrate
```

### 4. Resend-Key als Secret speichern

```bash
npx wrangler secret put RESEND_API_KEY
```

Den Key einfügen. Er landet verschlüsselt bei Cloudflare und nicht im Code.

### 5. Veröffentlichen

```bash
npm run deploy
```

Am Ende zeigt Wrangler die URL an. Die App ist sofort live.

### Lokal testen (optional)

```bash
npm run db:migrate:local
npm run dev
```

Dann http://localhost:8787 öffnen. Ohne `RESEND_API_KEY` läuft alles, es werden nur keine Mails verschickt (Hinweis in der Konsole).

## Was noch fehlt / was du entscheiden solltest

**Pflicht, damit es läuft**

- [ ] Cloudflare-Account und `wrangler login`
- [ ] `database_id` in `wrangler.jsonc` eintragen
- [ ] Resend-Account und `RESEND_API_KEY` als Secret setzen

**Pflicht für Mails an beliebige Adressen**

- [ ] Die Absenderadresse `onboarding@resend.dev` (in `src/worker.js`) liefert nur an die E-Mail-Adresse deines Resend-Accounts. Für die Admin-Mail reicht das. Willst du später auch Mails an andere schicken, brauchst du eine eigene Domain, die du bei Resend verifizierst. Dann die Adresse im `from:` anpassen.

**Empfohlen**

- [ ] **Admin-Adresse prüfen:** `ADMIN_EMAIL` in `src/worker.js` ist fest auf `jathu733@gmail.com` gesetzt, wie gewünscht. Wenn du das Repo öffentlich machst (z. B. auf GitHub), ist die Adresse dort sichtbar. Dann lieber ein privates Repo nutzen oder die Adresse als Secret/Variable auslagern.
- [ ] **Passwort-Regel:** Umgesetzt ist "mind. 4 Zeichen, beliebige Zeichen". Wenn du wirklich nur Ziffern (PIN) willst, sag Bescheid, dann wird das in `src/worker.js` (`validPassword`) und `public/app.js` angepasst.
- [ ] **Datenschutz:** Gespeichert werden Namen, gehashte Passwörter und Zeitpunkte, und Mails enthalten Namen. Für eine öffentliche Seite in Deutschland/EU brauchst du eine kurze Datenschutzerklärung. Ein Impressum ist für rein private Seiten nicht Pflicht, empfohlen wird es aber.
- [ ] **Passwort vergessen:** Es gibt keinen Reset. Wer sein Passwort vergisst, kommt nicht mehr rein. Das ist bewusst so, weil es keine Mail-Adressen der Teilnehmer gibt. Der Host sollte das im Hinterkopf haben.
- [ ] **Alte Räume aufräumen:** Räume werden nie automatisch gelöscht. Für den Anfang unkritisch. Später kannst du per Cron-Trigger (`triggers.crons` in `wrangler.jsonc`) alles löschen, was älter als z. B. 30 Tage ist.
- [ ] **Spam-Schutz:** Die Sperre gilt pro Name. Gegen massenhaftes Raum-Erstellen hilft eine kostenlose Rate-Limit-Regel im Cloudflare-Dashboard (Security, Rate limiting). Mit Turnstile (ebenfalls kostenlos) kannst du zusätzlich ein Captcha beim Erstellen einbauen.
- [ ] **Eigene Domain (optional):** Im Cloudflare-Dashboard unter *Workers > zuteiler > Settings > Domains & Routes* verbinden.

**Verhalten, das du wissen solltest**

- Wer sich mit demselben Namen auf einem zweiten Gerät anmeldet, wird auf dem ersten abgemeldet (ein aktives Gerät pro Name).
- Der Host kann die Ziehung zurücksetzen und neu ziehen, solange er will.
- Mindestens 3 Personen für eine Ziehung. Das lässt sich in `MIN_PLAYERS` in `src/worker.js` ändern.

## Code auf GitHub (optional)

```bash
git init
git add .
git commit -m "Initial commit"
```

Dann auf GitHub ein neues Repo anlegen und pushen. Mit Cloudflare lässt sich auch direkt aus GitHub deployen (Workers > Connect to Git). Die `.gitignore` schließt `node_modules` und `.wrangler` schon aus.
