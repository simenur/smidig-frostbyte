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
  - Hamburger-meny for enkel navigasjon
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
- Har tilgang til alle administrasjonsfunksjoner

### Parent (Foreldre)
- Kan kun se egne barn
- Kan krysse inn/ut egne barn
- Kan oppdatere barnets allergier, notater og nødkontakt
- Kan endre eget passord

## 🔐 Registreringsflyt

Systemet bruker en invitasjonsbasert registrering for foreldre:

### 1. Ansatt legger til forelder
1. Ansatt navigerer til **Legg til forelder**
2. Fyller inn e-post, navn og telefon
3. Forelderen lagres som "ventende" i `pendingParents`-samlingen

### 2. Ansatt sender invitasjon
1. Ansatt sender manuell e-post til forelderen med link til `/register`
2. Forelderen får beskjed om å opprette sin konto

### 3. Forelder registrerer seg
1. Forelderen går til registreringssiden
2. Skriver inn samme e-postadresse som ansatt la til
3. Velger passord (minimum 6 tegn)
4. Systemet:
   - Sjekker om e-posten finnes i `pendingParents`
   - Oppretter Firebase Auth-bruker
   - Oppretter `users`-dokument med role: 'parent'
   - Sletter fra `pendingParents`
   - Logger inn automatisk

### 4. Automatisk tilgang
- Forelderen får automatisk tilgang til barn der deres UID er listet i `parentIds`
- Ingen ekstra konfigurasjon nødvendig

## 🛠 Teknologi

### Frontend
- **React 18** - UI framework
- **React Router** - Navigasjon
- **i18next** - Flerspråklig støtte
- **Vite** - Build tool og dev server

### Backend & Database
- **Firebase Authentication** - Brukerautentisering
- **Cloud Firestore** - NoSQL database
  - Realtime updates
  - Offline support
  - Firestore Security Rules for tilgangskontroll

### Styling
- **Custom CSS** - Med CSS variabler for theming
- **Responsive Design** - Mobil-først tilnærming
- **Dark/Light Mode** - Automatisk og manuell toggle

## 📊 Firestore struktur

### Collections

#### `users`
Brukerinformasjon for både ansatte og foreldre.

```javascript
{
  uid: "abc123",
  email: "user@example.com",
  name: "Ola Nordmann",
  phone: "12345678",
  role: "staff" | "parent",
  departments: ["Småbarna"], // Kun for staff
  createdAt: Timestamp,
  registeredAt: Timestamp
}
```

#### `children`
Informasjon om alle barn i barnehagen.

```javascript
{
  id: "child123",
  name: "Emma Hansen",
  department: "Småbarna",
  parentIds: ["uid1", "uid2"], // Array av foreldre-UIDs
  parentInfo: [
    { email: "parent@example.com", name: "...", phone: "..." }
  ],
  allergies: "Melk, nøtter",
  notes: "Liker ikke gulrøtter",
  emergencyContact: {
    name: "Bestemor",
    phone: "87654321",
    email: "bestemor@example.com"
  },
  checkedIn: true,
  lastCheckIn: Timestamp,
  lastCheckOut: Timestamp,
  createdAt: Timestamp,
  createdBy: "staff_uid"
}
```

#### `activityLog`
Aktivitetslogg for alle inn/ut-krysser.

```javascript
{
  id: "log123",
  childId: "child123",
  childName: "Emma Hansen",
  action: "check-in" | "check-out",
  timestamp: Timestamp,
  performedBy: "user_uid",
  performedByEmail: "staff@example.com"
}
```

#### `pendingParents`
Foreldre som er lagt til men ikke har fullført registrering.

```javascript
{
  id: "pending123",
  email: "parent@example.com",
  name: "Kari Nordmann",
  phone: "12345678",
  role: "parent",
  status: "pending",
  createdAt: Timestamp,
  createdBy: "staff_uid"
}
```

## 🔒 Security Rules

Firestore Security Rules sikrer at brukere kun har tilgang til data de skal ha tilgang til.

### Viktige regler

- **Users**: Brukere kan lese og oppdatere sin egen profil
- **Children**:
  - Staff kan lese/skrive alle barn
  - Foreldre kan kun lese/oppdatere barn de er knyttet til
- **ActivityLog**:
  - Staff kan lese alle logger
  - Foreldre kan lese logger for egne barn
- **PendingParents**:
  - Alle kan lese (for registrering)
  - Kun staff kan opprette
  - Staff og nye brukere kan slette egne

Se full konfigurasjon i Firebase Console under **Firestore Database → Rules**.

## 🌍 Flerspråklig støtte

Applikasjonen støtter fire språk:

- **Norsk** (no) - Standard
- **Engelsk** (en)
- **Polsk** (pl)
- **Arabisk** (ar) - Med RTL-støtte

### Oversettingsfiler

Alle oversettelser ligger i `src/locales/`:
- `no.json` - Norsk
- `en.json` - Engelsk
- `pl.json` - Polsk
- `ar.json` - Arabisk


## 📱 Mobil-optimalisering

Applikasjonen er optimalisert for mobil med:

- **Responsiv layout** - Tilpasser seg alle skjermstørrelser
- **Touch-vennlige elementer** - Store knapper og god spacing
- **Hamburger-meny** - Enkel navigasjon på mobil
- **Rask lasting** - Lazy loading av komponenter
- **Offline-støtte** - Firestore offline persistence

## 🔧 Utviklingsmodus

### Test-bruker toggle

I utviklingsmodus kan ansatte toggle mellom staff- og parent-modus for testing:

```javascript
const TEST_PARENT_UID = 'VtDgO4jGy9Z8LncGTAx6r5zShIv1';
```

Bytt til en test-forelder UID i `Dashboard.jsx` for testing.

## 📋 Planlagte funksjoner (TODO)

Basert på kravspesifikasjonen er følgende funksjoner planlagt for fremtidig implementering:

- [ ] **Melding/Chat-system**
  - Meldinger mellom foreldre og ansatte
  - Markere meldinger som lest/ulest

- [ ] **Kalender**
  - Vise viktige datoer (fridager, arrangementer, etc.)
  - Legge til arrangementer (kun ansatte)
  - Foreldre kan se kommende arrangementer