# Müllkalender Generator

## 🔗 [muellkalender.netlify.app](https://muellkalender.netlify.app)

Eine liebevoll gestaltete Web-Anwendung zur Erstellung von Müllabfuhr-Kalendern im ICS-Format, die automatisch Feiertage berücksichtigt.

Primär entwickelt für die **Wiener Müllabfuhr (MA48)**, aber universell für jede Müllabfuhr einsetzbar, die feste Abholtermine hat und diese bei Feiertagen verschiebt.

## Funktionen

- **Feiertage abrufen**: Automatischer Abruf von Feiertagen für Österreich (Wien) und Deutschland
- **Flexible Einstellungen**: Wochentag der Müllabfuhr und Benennung des Termins anpassbar
- **Feiertagsberücksichtigung**: Automatische Verschiebung der Abfuhrtermine bei Feiertagen
- **Biotonne-Sonderfall**: Spezielle Option für Biotonnen mit zweiwöchiger Leerung im Winter
- **Erinnerungen**: Optional können Erinnerungen eingestellt werden
- **ICS-Export**: Generierung einer ICS-Datei für den Import in gängige Kalender-Anwendungen

## Technologien

- Next.js
- React
- Tailwind CSS
- Axios für API-Anfragen
- date-fns für Datumsfunktionen
- ical-generator für die Generierung von ICS-Dateien

## Installation und Start

1. Klonen des Repositories:
   ```
   git clone https://github.com/entttom/muellkalender.git
   cd muellkalender
   ```

2. Installation der Abhängigkeiten:
   ```
   npm install
   ```

3. Starten der Anwendung:
   ```
   npm run dev
   ```

4. Öffnen Sie im Browser [http://localhost:3000](http://localhost:3000)

## Nutzung

1. Wählen Sie das Land für die Feiertage (oder laden Sie eine eigene ICS-Datei hoch).
2. Geben Sie den regulären Wochentag der Müllabfuhr an.
3. Benennen Sie den Termin (z.B. "Biomüll", "Restmüll").
4. Falls es sich um eine Biotonne handelt, aktivieren Sie die entsprechende Option und stellen Sie den Winterzeitraum ein.
5. Optional: Stellen Sie eine Erinnerung ein.
6. Generieren Sie die ICS-Datei und laden Sie diese herunter.
7. Importieren Sie die Datei in Ihre bevorzugte Kalender-Anwendung.

## Lizenz

ISC