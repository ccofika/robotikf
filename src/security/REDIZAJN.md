# Robotik Security: redizajn (29.9.2026)

Ceo Security deo (sve stranice, fioke, dijalozi i web za radnika) je prerađen po veštini
`awwwards-research-robotik-design-skill`. Samo lokalno: worktree `.wt/robotikf`, folder `src/security` nije na gitu.
Rezerva starog izgleda: `preprod-security/backup-security-ui-2026-09-29/`.

## Šta je bilo loše i šta je sada

| Staro | Sada |
|---|---|
| sadržaj na 70% širine | svaka strana preko cele širine, raspored po širini sadržaja (container query) |
| svi podaci prikazani isto (kartice i tabele svuda) | svaki tip podatka ima svoj oblik: vreme na liniji (raspored, tok smene, plan obilaska, pravila), ljudi i stvari kao lista, brojke kao sažetak, dokument kao papir |
| razbacano, nepredvidivo | isti okvir na svakoj strani: natpis, naslov, jedna rečenica, glavne radnje desno, pa traka sa filterima, pa sadržaj; tabovi su podvučeni (navigacija), pilule filtriraju |

## Izbor korisnika

- Paleta **Papir i tuš** (po uzoru na Vercel Geist): belo i crno, sive bez tona, boja samo za stanja i "sada".
  Tokeni: `sx/tokens.css`. Kontrast: tekst 17,9:1, sporedni 5,7:1, stanja >= 5,1:1.
  Istraživanje 7 paleta (rangiranje, snimci, kontrast): `preprod-security/research/palete/`.
- Tačke **D, znak po ISO 3864**: kvadrat u redu, trougao upozorenje, osmougao alarm, krug informacija
  i "sledeće", crtica bez stanja. Stanje se razlikuje i bez boje.
- Znak u šini: petlja obilaska sa radnikom u sredini i plavom tačkom (sledeća kontrolna tačka), bez tamne
  pločice (`sx/BrandMark.jsx`); pri otvaranju se petlja iscrta (700 ms).

## Motiv

Obilazak: smena je linija, kontrolne tačke su čvorovi na njoj. Isti jezik na tabli (Uživo), u toku smene
(fioka smene i web za radnika), u planu obilaska objekta, u putu pripreme objekta (6 koraka: radno mesto,
checkpointi, plan obilaska, radnici, koordinator, izveštaj) i u lestvici pravila alarma.
Dnevna smena je "papir" (bela karta), noćna je "tuš" (crna karta), nacrt je šrafiran.

## Sistem (sx/)

| Fajl | Šta |
|---|---|
| `tokens.css` | boje (jedina mesta sa hex vrednostima) |
| `sx.css` | tipografija (Roboto Flex naslovi i brojke, Golos Text tekst, Geist Mono vreme i brojevi), lampica stanja, dugme sa kupolom, kretanje |
| `forms.jsx` / `forms.css` | polje, unos, padajuća lista (spisak u stilu aplikacije, base-select), broj sa jedinicom, prekidač, štikliranje, pilule izbora, više izbora, pretraga, vreme 24 h i datum sa sopstvenim kalendarom, fajl |
| `layout.jsx` / `page.css` | zaglavlje strane, traka sa filterima (lepi se uz vrh), panel, napomena, parovi naziv/vrednost, tabovi, brojke, traka nesačuvanih izmena, tabela (na uskom prostoru kartice), lista, vremenska linija |
| `Sheet.jsx` | fioka sa desne strane (na telefonu list odozdo), stek slojeva |
| `Dialog.jsx`, `confirm.jsx` | dijalog sa vizirom, potvrda (umesto window.confirm, i sa poljem za razlog) |
| `ShiftLine.jsx` | tok jedne smene na liniji |
| `layer.js` | Escape zatvara samo gornji sloj; dok je otvoren kalendar ili spisak, Escape pripada njemu |
| `toast.jsx`, `tooltips.js`, `motion.jsx`, `SignalBar.jsx`, `Shell.jsx` | obaveštenja, oblačići, kretanje, traka učitavanja, ljuska |
| `schedule.css`, `facility.css`, `shift.css`, `alarms.css`, `reports.css`, `guard.css`, `live.css`, `shell.css`, `overlays.css` | stil po stranici |

## Stranice

| Strana | Glavni oblik |
|---|---|
| Uživo | situacija jednom rečenicom, pet brojki, tabla obilazaka, za reakciju, zadaci, treba srediti, dnevnik |
| Raspored | nedeljna mreža radnici x dani, red pokrivenosti na vrhu, izbor smene na mestu klika; na telefonu po danima |
| Objekti | red: stanje sada, put pripreme, ljudi; nepoznati tagovi na vrhu |
| Objekat | put pripreme (klik vodi u deo), tabovi Pregled, NFC tagovi (fioka taga sa istorijom), Obilazak (linija smene), Zadaci, Radnici, Izveštaj |
| Radnici | brojke kao filteri, tabela; dosije u fioci (Dosije, Podaci, Licence, Smene, Nalog) |
| Alarmi | dnevnik po danima; pravila kao lestvica eskalacije sa brojevima u rečenici |
| Izveštaji | tabela smena (obilazak, dolazak, slanje, kontrola); izveštaj kao papirni Dnevnik rada, mejl, kontrola |
| Satnica | mesec, sažetak za isplatu, tabela sa satnicom u redu, pravila obračuna, praznici |
| Fioka smene | tok smene na liniji, vremena, zamena radnika, obilazak, zadaci, zapažanja, alarmi, NFC očitavanja; ručna prijava i odjava u dijalogu |
| Web za radnika | kartica smene sa očitavanjem taga i tokom smene, obilazak, zadaci za prst, zapažanja, objekat, raspored |

## Provera (pre-prod, web 3300)

- Raspored strane: 14 prikaza x 6 širina (360, 390, 768, 1024, 1440, 1920): 0 prelivanja, 0 elemenata van ekrana, 0 odsečenog teksta.
- Hover: 200 elemenata na 14 prikaza, svaki izlaz >= 180 ms (boja teksta >= 100 ms): 0 problema.
- Tokovi rada: 47 koraka na 1440 px i 47 na 390 px (raspored, objekti i detalj, radnici i dosije, alarmi i pravila, izveštaji, satnica), bez grešaka u konzoli i bez neuspelih API poziva.
- Escape: kalendar u dijalogu se zatvara prvi, dijalog u fioci se zatvara pre fioke.
- 0 dugih crta; produkcioni build bez upozorenja u Security delu.
- Skripte provere: `preprod-security/scripts/redizajn-provera/` (`audit-all.js` raspored + hover, `flow.js` tokovi po stranicama, `interact.js` Uživo, `snap.js` i `final-shots.js` snimci, `final-sheet.py` pregledni list). Pokreću se iz tog foldera, prijava se čuva u `auth.json`. Snimci svih stranica: `snimci/`.

## Backend dopune (worktree `.wt/robotikb`)

- `GET /api/security/shifts/:id` vraća i `rules` (tolerancija i odlaganje za objekat), za tok smene.
- `GET /api/security/live` u `todo.drafts` vraća i `facilityId` (dugme Raspored vodi na tačan objekat i nedelju).
