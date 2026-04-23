# 🎬 StreamFinder

Dein persönlicher Streaming-Guide mit **Live-Katalogsuche** über Netflix, Prime Video, Disney+, Paramount+, ARD, ZDF und HBO/WOW.

Durchsucht den **gesamten Katalog** aller Streaming-Dienste in Echtzeit über die TMDB-API.

## Features

- **Live-Katalog** — Zugriff auf tausende Titel aller Streaming-Plattformen
- **Personalisiert** — Fragebogen lernt deinen Geschmack, Likes verfeinern Empfehlungen
- **Stimmungs-Filter** — Entspannt, Intensiv, Zum Lachen, Zum Nachdenken...
- **Plattform-Filter** — Nur Netflix? Nur Disney+? Oder alles gemischt
- **Top-Bewertungen** — Die bestbewerteten Titel auf deinen Plattformen
- **Rezensionen** — Echte User-Reviews direkt aus TMDB
- **Cast-Info** — Wer spielt mit?
- **Suche** — Jeden Titel direkt suchen
- **Cover-Bilder** — Echte Poster für jeden Titel
- **Mobile-optimiert** — Als PWA auf dem Homescreen installierbar

## Setup

### 1. TMDB API-Key holen (kostenlos, 2 Min)
1. Gehe auf [themoviedb.org](https://www.themoviedb.org/)
2. Account erstellen
3. Settings > API > API Key beantragen
4. Du bekommst sofort einen Key (v3 auth)

### 2. Auf GitHub Pages deployen
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/DEIN-USERNAME/streamfinder.git
git push -u origin main
```

### 3. GitHub Pages aktivieren
Settings > Pages > Source: GitHub Actions

### 4. Fertig!
Deine App ist live unter `https://DEIN-USERNAME.github.io/streamfinder/`

### Auf dem Handy installieren
1. URL im Browser oeffnen
2. iPhone: Teilen > Zum Home-Bildschirm
3. Android: Menu > App installieren

## Lokal entwickeln

```bash
npm install
npm run dev
```

## Datenschutz
- API-Key wird nur lokal im Browser gespeichert
- Kein Backend, keine Datenbank, kein Tracking
- Alle Daten bleiben auf dem Geraet des Nutzers
