# Microsoft Graph Proxy with Server-Side Token Storage

Ovaj projekat implementira sigurnu integraciju sa Microsoft Graph API koristeći Node.js (Fastify), gde se Microsoft tokeni čuvaju isključivo na serveru, dok klijent komunicira samo preko sopstvenih JWT tokena.

## ✅ Glavne karakteristike

- 🔐 **Sigurno upravljanje tokenima**
  - Microsoft access/refresh tokeni nikada ne napuštaju server
  - Klijent koristi samo interne JWT tokene

- 🔄 **Automatski refresh Microsoft tokena**
  - Server automatski osvežava token kada istekne

- ⚡ **Graph API proxy**
  - Jednostavan pristup Microsoft Graph API putem `/graph/*` rute

- 🧠 **In-memory storage (Map)**
  - Brza implementacija bez baze (lako se menja u Redis ili DB)

- 🔑 **PKCE autentifikacija**
  - Siguran OAuth2 flow bez izlaganja tajni

---

## 🧱 Arhitektura

### Token modeli

| Tip tokena        | Gde se čuva        | Ko ga koristi |
|------------------|-------------------|--------------|
| JWT access        | Cookie (klijent)  | frontend     |
| JWT refresh       | Cookie (klijent)  | frontend     |
| MS access token   | Server (Map)      | backend      |
| MS refresh token  | Server (Map)      | backend      |

---

## 📁 Struktura projekta
├── server.js           # Fastify server i auth logika
├── services/
│   └── GraphService.js # Microsoft Graph client
├── public/
│   └── index.html
├── .env

---

## ⚙️ Instalacija

```bash
npm install

🚀 Pokretanje
Shellnode server.jsShow more lines

🔑 Autentifikacija flow

Korisnik ide na /login
Redirect na Microsoft login (PKCE)
Microsoft vraća code
Server:

menja code za tokene
validira ID token
čuva MS tokene u Map
generiše sopstvene JWT tokene


Klijent dobija samo JWT cookies


🔄 Microsoft token storage
JavaScriptconst msTokenStore = new Map()// ključ: userId (OID)// vrednost:{  accessToken,  refreshToken}Show more lines

🌐 Graph API proxy
Endpoint:
GET /graph/{path}

Primer:
GET /graph/me
GET /graph/me/memberOf

Server:

validira JWT
uzima MS tokene iz Map
zove Graph API
automatski refresh ako treba


🔄 Automatski refresh
Ako Microsoft API vrati 401:

Koristi se refresh token
Dobijaju se novi tokeni
Update u msTokenStore
Request se ponavlja


🧹 Logout

briše JWT tokene
briše session iz refreshStore
briše Microsoft tokene iz msTokenStore


🛡️ Security benefiti
✅ Microsoft tokeni nikada nisu izloženi klijentu
✅ Centralizovana kontrola tokena
✅ Lak prelazak na:

Redis
bazu
distributed session storage