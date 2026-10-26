# Bildstudio Pro 📸

> **Ett snabbt, modernt och visuellt bildbehandlingsverktyg direkt i webbläsaren.**  
> Beskär, skala om, komprimera och konvertera bilder mellan **JPG**, **PNG**, **WebP**, **BMP** och Apples **HEIC / HEIF** – helt kostnadsfritt och 100% privat.

---

###  **[Öppna Bildstudio Pro Direkt i Webbläsaren](https://joreimer1.github.io/bildstudio/)**
 **Klicka här för att använda verktyget:** **[https://joreimer1.github.io/bildstudio/](https://joreimer1.github.io/bildstudio/)**  
*(Fungerar direkt på Mac, Windows, Linux, iPhone, iPad och Android. Ingen inloggning eller installation krävs!)*

---

##  Varför Bildstudio Pro?

*  **100% Privat & Säkert:** Alla beräkningar, konverteringar och beskärningar sker lokalt på din egen dator eller telefon via HTML5 Canvas och WebAssembly. **Inga bilder laddas någonsin upp till någon extern server.**
*  **Blixtsnabbt:** Inga uppladdningstider eller väntetider över internet.
*  **Inbyggd Apple HEIC-konvertering:** Öppna och konvertera foton direkt från iPhone och iPad till vanliga format utan att behöva externa program.
*  **Masskonvertering (Batch):** Dra in dussintals bilder samtidigt, välj format och storlek, och ladda ner alla samlade i en `.zip`-fil.
*  **Urklippsstöd:** Klistra in skärmdumpar direkt med `Ctrl+V` (Windows) eller `Cmd+V` (Mac), eller kopiera den färdiga bilden direkt till urklipp.

---

##  Huvudfunktioner

### 1. Beskär & Orientera (Crop & Rotate)
* **Interaktiv beskärningsruta** med dra-och-släpp-hörn, flyttbar markering och tredjedelsraster (*Rule of Thirds*).
* **Fasta bildförhållanden:** Fritt val, 1:1 (Kvadrat för Instagram/profilbild), 4:3, 16:9 (Widescreen), 3:2 (Klassiskt foto) samt 9:16 (Stories/Reels/TikTok).
* **Rotation & Spegling:** Rotera 90° åt vänster eller höger, samt spegla horisontellt med ett klick.
* **Återställ-knapp:** Ångra och gå tillbaka till full originalbild när som helst.

### 2. Ändra storlek & Skala (Resize)
* **Procentuella snabbval:** Skala snabbt till 25%, 50%, 75%, 100%, 150% eller 200%.
* **Exakta pixelmått:** Ange specifik bredd eller höjd i pixlar med automatiskt proportionellt lås (🔒).
* **Färdiga formatmallar:** 
  * Full HD (1920×1080)
  * Kvadrat (1080×1080)
  * Webb (1200 px bredd)
  * E-post (800 px bredd)

### 3. Konvertera & Komprimera (Format & Export)
* **JPG / JPEG:** Optimalt för fotografier. Fullt justerbart kvalitetsreglage (5%–100%) för att minimera filstorleken.
* **PNG:** Perfekt för logotyper, illustrationer och grafik med transparens.
* **WebP:** Googles moderna webbformat som ger upp till 30–50% mindre filstorlek än JPG med bibehållen bildkvalitet.
* **BMP:** Klassiskt okomprimerat 24-bitars bitmap-format.
* **HEIC / HEIF:** Avkoda och konvertera Apples iPhone-bilder till standard JPG, PNG eller WebP direkt i webbläsaren.

### 4. Realtidsstatistik & Filstorleksberäkning
* Se den beräknade nya filstorleken i realtid innan du sparar.
* Direkt visning av filbesparing i procent (t.ex. `-65% mindre`).
* **Spara med anpassat filnamn:** Välj själv vad den exporterade filen ska heta.

### 5. Masskonvertering (Batch)
* Dra och släpp eller välj flera bilder samtidigt.
* Konvertera hela samlingen till valfritt format och skalningsnivå.
* Automatisk komprimering och nedladdning som ett samlat ZIP-arkiv (`konverterade_bilder.zip`).

---

##  Teknikstack

Projektet är byggt som en modern, fristående webbapplikation utan tunga externa ramverk:
* **HTML5 Canvas API:** För snabb pixelrendering, skalning och färgkonvertering.
* **Vanilla JavaScript & CSS3:** Mörkt glasigt användargränssnitt (*Glassmorphism*) med responsiv layout.
* **[Cropper.js](https://fengyuanchen.github.io/cropperjs/):** Robust och följsam beskärningsmotor.
* **[JSZip](https://stuk.github.io/jszip/):** Klientbaserad paketering av ZIP-filer vid masskonvertering.
* **[heic2any](https://github.com/alexcorvi/heic2any):** WebAssembly/libde265 för lokal avkodning av Apple HEIC-bilder.

---

##  Hur du använder verktyget

1. Öppna **[https://joreimer1.github.io/bildstudio/](https://joreimer1.github.io/bildstudio/)**.
2. Släpp din bild i rutan eller klicka för att välja en fil (eller klistra in med `Ctrl+V` / `Cmd+V`).
3. Beskär, rotera eller ändra storlek efter behov i kontrollpanelen.
4. Välj önskat format och kvalitetsnivå.
5. Klicka på **Spara & Ladda ner bild**!

---

##  Licens & Upphovsrätt

Öppen källkod och fri att använda för både personliga och professionella ändamål.
Utvecklad med fokus på användarvänlighet, integritet och snabbhet.
