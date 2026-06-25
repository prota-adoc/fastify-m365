# DMS rute

Evo liste najvažnijih ruta koje možeš pozivati koristeći `dms/{index}/...` i šta svaka od njih omogućava.

## 1. Biblioteke i fajlovi (Document Management)
Ovo su "radne" rute za tvoj DMS.

- `GET /dms/{index}/drives` – Listanje svih biblioteka dokumenata na sajtu.
- `GET /dms/{index}/drives/{drive-id}/root/children` – Listanje sadržaja (fajlova i foldera) u root-u biblioteke.
- `GET /dms/{index}/drives/{drive-id}/items/{item-id}/children` – Ulazak u podfoldere ili Document Set-ove.
- `PUT /dms/{index}/drives/{drive-id}/root:/{fajl.zip}:/content` – Upload novog fajla ili nove verzije fajla.
- `GET /dms/{index}/drives/{drive-id}/items/{item-id}/versions` – Pregled istorije verzija nekog dokumenta.

## 2. Upravljanje metapodacima i Document Set-ovima
Ovo su napredne rute za DMS funkcionalnosti.

- `GET /dms/{index}/drives/{drive-id}/list/contentTypes` – Provera koji su tipovi sadržaja (npr. Document Set) dozvoljeni u toj biblioteci.
- `GET /dms/{index}/drives/{drive-id}/items/{item-id}?$expand=fields` – Ključna ruta! Dohvata metapodatke (polja) za određeni folder ili Document Set.
- `PATCH /dms/{index}/drives/{drive-id}/items/{item-id}` – Ažuriranje metapodataka na Document Set-u ili fajlu.

## 3. Dozvole i administracija (Security)
Ovo koristiš za upravljanje administratorima biblioteka.

- `GET /dms/{index}/drives/{drive-id}/permissions` – Listanje ko ima pristup biblioteci.
- `POST /dms/{index}/drives/{drive-id}/permissions` – Dodavanje novih korisnika ili grupa (npr. tvojih adminGroup ID-jeva).
- `DELETE /dms/{index}/drives/{drive-id}/permissions/{permission-id}` – Uklanjanje pristupa.

## 4. Struktura sajta (Site Discovery)

- `GET /dms/{index}/` – Informacije o samom sajtu (`displayName`, `webUrl`, `createdDateTime`).
- `GET /dms/{index}/lists` – Listanje svih lista na sajtu (ovde bi se nalazila i ona tvoja "Master lista" ako je kreiraš na svakom sajtu).
- `GET /dms/{index}/columns` – Pregled svih custom kolona definisanih na nivou sajta.

## Kako da ovo koristiš u klijentskom delu?

Pošto tvoj `server.js` proxy automatski menja `{index}` u `site_id`, na front-endu samo gradiš URL-ove.

```javascript
// Primeri poziva sa klijenta
const index = 0; // Prvi sajt iz .env liste

// Dohvati biblioteke
const drives = await fetch(`/dms/${index}/drives`).then(res => res.json());

// Dohvati detalje konkretnog fajla
const file = await fetch(`/dms/${index}/drives/${driveId}/items/${itemId}?$expand=fields`).then(res => res.json());
```

## Savet

Sve ove rute podržavaju `$select`, `$filter` i `$expand` parametre. Na primer, ako želiš samo listu biblioteka sa njihovim imenima, koristi:

```text
GET /dms/{index}/drives?$select=id,name
```

To će ti značajno ubrzati aplikaciju i smanjiti nepotreban saobraćaj.