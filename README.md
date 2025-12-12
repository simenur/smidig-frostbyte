# Krysselista - Barnehage Inn/Ut-kryssingssystem

En moderne, mobil-vennlig applikasjon for å administrere inn- og ut-krysser i barnehager. Bygget med React, Firebase og i18next for flerspråklig støtte.


## ✨ Funksjoner

### For Ansatte (Staff)

- **Dashboard med avdelingsvisning**
  - Oversikt over alle barn sortert etter avdeling (Småbarna, Mellombarna, Storbarna)
  - Live statistikk: antall inne/ute
  - Se hvilke ansatte som er på hver avdeling

- **Søk og filtrering**
  - Søk etter barn etter navn
  - Filtrer på status: Alle / Inne / Ute

- **Inn/Ut-kryssing**
  - Rask inn- og ut-kryssing av barn
  - Automatisk logging av tidspunkt
  - Hvem som utførte kryssingen

- **Barn-administrasjon**
  - Legg til nye barn med komplett informasjon
  - Rediger barneprofiler (allergier, notater, nødkontakt)
  - Slett barn (GDPR-kompatibel med fullstendig sletting av all data)
  - Auto-utfylling av foreldre-info fra database

- **Foreldre-administrasjon**
  - Legg til ventende foreldre
  - Oversikt over ventende foreldre
  - Slett ventende foreldre

- **Meldingssystem**
  - Send meldinger til spesifikke foreldre om deres barn
  - Send kunngjøringer til hele avdelinger
  - Se alle meldingssamtaler
  - Automatisk markering av leste meldinger

- **Kalender**
  - Opprett arrangementer (arrangement, fridager, møter)
  - Velg avdeling for arrangementer (alle eller spesifikk avdeling)
  - Automatisk kunngjøring til avdelingschat når arrangement opprettes
  - Redigerbar kunngjøringstekst
  - Slett arrangementer
  - Månedsvisning med event-indikatorer

- **Aktivitetslogg**
  - Fullstendig historikk for hvert barn
  - Se hvem som krysset inn/ut og når

### For Foreldre (Parents)

- **Mine barn**
  - Oversikt over egne barn
  - Se barnets status (inne/ute)
  - Siste inn/ut-kryssing

- **Barneprofil**
  - Se detaljert informasjon om barnet
  - Oppdatere allergier og notater
  - Oppdatere nødkontakt informasjon
  - Aktivitetslogg for barnet

- **Inn/Ut-kryssing**
  - Kryss inn/ut egne barn
  - Automatisk logging

- **Meldinger**
  - Send meldinger til ansatte om spesifikke barn
  - Motta kunngjøringer fra barnehagen (avdelingsspesifikke)
  - Se alle meldingssamtaler for egne barn

- **Kalender**
  - Se alle kommende arrangementer
  - Filtrer arrangementer basert på barnets avdeling
  - Se detaljer om arrangementer (tittel, dato, type, beskrivelse)

### Generelle funksjoner

- **Autentisering**
  - Sikker innlogging med Firebase Auth
  - Endre passord
  - Automatisk utlogging ved inaktivitet

- **Dark/Light Mode**
  - Automatisk tilpassing til systempreferanser
  - Manuell toggle mellom mørkt og lyst tema

- **Mobil-optimalisert**
  - Responsiv design for mobil, tablet og desktop
  - Bunnnavigasjon for enkel tilgang til hovedfunksjoner
  - Touch-vennlige knapper og elementer

- **Flerspråklig støtte**
  - Norsk (standard)
  - Engelsk
  - Polsk
  - Arabisk (med RTL-støtte)

## 👥 Brukerroller

### Staff (Ansatte)
- Kan se alle barn i barnehagen
- Kan krysse inn/ut alle barn
- Kan legge til, redigere og slette barn
- Kan legge til ventende foreldre
- Kan sende meldinger til foreldre
- Kan sende kunngjøringer til hele avdelinger
- Kan opprette og slette kalenderarrangementer
- Har tilgang til alle administrasjonsfunksjoner

### Parent (Foreldre)
- Kan kun se egne barn
- Kan krysse inn/ut egne barn
- Kan oppdatere barnets allergier, notater og nødkontakt
- Kan sende meldinger til ansatte om egne barn
- Kan motta kunngjøringer fra barnehagen
- Kan se kalenderarrangementer for barnets avdeling
- Kan endre eget passord

## 💬 Meldingssystem

Applikasjonen har et komplett meldingssystem med ulike meldingstyper:

### Meldingstyper

#### 1. Parent-to-Staff (Forelder til Ansatt)
- Foreldre kan sende meldinger til ansatte om spesifikke barn
- Meldinger er knyttet til et barn og en avdeling
- Ansatte ser alle meldinger fra foreldre

#### 2. Staff-to-Parent (Ansatt til Forelder)
- Ansatte kan svare på meldinger fra foreldre
- Meldinger sendes i samme samtale som forelderens melding

#### 3. Staff-Broadcast (Kunngjøringer)
- Ansatte kan sende kunngjøringer til hele avdelinger
- Foreldre ser kun kunngjøringer for avdelingene deres barn tilhører
- Automatisk opprettet når arrangementer legges til i kalenderen

### Funksjoner
- **Sanntidsoppdateringer**: Meldinger oppdateres automatisk uten refresh
- **Uleste meldinger**: Teller for uleste meldinger per samtale
- **Søk**: Søk i samtaler etter barnenavn eller avdeling
- **Automatisk markering**: Meldinger markeres automatisk som lest når de vises
- **Mobil-optimalisert**: To-kolonne layout på desktop, full-screen på mobil

## 📅 Kalendersystem

Kalenderfunksjonen gir oversikt over viktige datoer og arrangementer i barnehagen.

### Funksjoner for Ansatte

#### Opprett arrangementer
- **Tittel**: Navn på arrangementet (f.eks. "Juleavslutning")
- **Dato**: Velg dato fra kalender eller klikk på en dag i månedsvisningen
- **Type**: Velg mellom Arrangement, Fridag eller Møte
- **Avdeling**: Velg hvilken avdeling arrangementet gjelder for
  - Alle avdelinger
  - Småbarna
  - Mellombarna
  - Storbarna
- **Beskrivelse**: Legg til ytterligere informasjon (valgfritt)

#### Automatiske kunngjøringer
- Når et arrangement opprettes, kan ansatte velge å sende automatisk kunngjøring
- Kunngjøringsteksten genereres automatisk med:
  - Arrangementtype og tittel
  - Dato (formatert på norsk)
  - Beskrivelse (hvis tilgjengelig)
- Teksten kan redigeres før sending
- Kunngjøringen sendes til valgt avdelings chat

#### Administrere arrangementer
- Se alle kommende arrangementer i liste
- Slett arrangementer som er kansellert
- Månedsvisning med fargekodede event-indikatorer

### Funksjoner for Foreldre
- Se kalender med alle arrangementer
- Automatisk filtrering basert på barnets avdeling
- Se kommende arrangementer i liste
- Motta kunngjøringer om nye arrangementer i meldingssystemet

### Event-typer og farger
- **Arrangement** (Blå): Generelle arrangementer og aktiviteter
- **Fridag** (Rød): Fridager og stengt barnehage
- **Møte** (Grønn): Foreldremøter og planleggingsmøter

## 🔐 Hvordan foreldre får tilgang

Systemet bruker en invitasjonsbasert registrering:

1. **Ansatt legger til forelder**
   - Går til "Legg til forelder"
   - Fyller inn e-post, navn og telefon

2. **Forelder mottar invitasjon**
   - Får e-post med link til registrering
   - Registrerer seg med samme e-post
   - Velger eget passord

3. **Automatisk tilgang**
   - Forelderen får automatisk tilgang til sine barn
   - Kan umiddelbart begynne å bruke appen

## 🛠 Teknologi

Applikasjonen er bygget med moderne web-teknologi:

- **React** - Frontend framework for brukergrensesnitt
- **Firebase** - Backend for autentisering og database
- **Responsive design** - Fungerer på mobil, tablet og desktop
- **Flerspråklig** - Støtte for 4 språk
- **Dark/Light mode** - Automatisk tilpasning til brukerens preferanser

## 📊 Database

Applikasjonen bruker Firebase Firestore som database med følgende hovedsamlinger:

- **users** - Brukerinformasjon (ansatte og foreldre)
- **children** - Barneinformasjon med tilknytning til foreldre
- **activityLog** - Historikk over inn/ut-krysser
- **pendingParents** - Foreldre som venter på å fullføre registrering
- **messages** - Meldinger og kunngjøringer
- **events** - Kalenderarrangementer

### Sikkerhet
- Firebase Security Rules sikrer at foreldre kun ser egne barn
- Ansatte har tilgang til all data
- All data er beskyttet med autentisering

## 🌍 Språk

Applikasjonen støtter fire språk:
- Norsk (standard)
- Engelsk
- Polsk
- Arabisk

Språk kan enkelt byttes i menyen inne i applikasjonen.

## 🚀 Kjøre applikasjonen

Applikasjonen er allerede deployet og kjører med Firebase som backend.

For å kjøre lokalt:

1. Installer avhengigheter:
```bash
npm install
```

2. Start utviklingsserver:
```bash
npm run dev
```

Applikasjonen åpnes på `http://localhost:5173`

### Testbrukere

For testing av applikasjonen finnes det testbrukere med ulike roller i systemet.

## 📝 Om prosjektet

Dette prosjektet er utviklet som en del av et kurs i smidig utvikling. Applikasjonen demonstrerer et komplett system for barnehageadministrasjon med fokus på brukeropplevelse, sikkerhet og moderne web-teknologi.
