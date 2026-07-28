# Torneo Calcetto

WebApp per la gestione di un torneo di calcio a 3 a 6 squadre: iscrizioni con
codici di invito a due livelli, quattro ruoli (Host, Admin, Giocatore,
Spettatore), girone all'italiana seguito da play-off, semifinali e finali,
con classifica live.

## Stato del progetto

Implementazione completa di frontend e schema database. **Manca solo il
collegamento a un progetto Supabase reale**: va creato un progetto, applicato
[docs/schema.sql](docs/schema.sql) e compilato `torneo-calcetto/.env` (vedi
`.env.example`) con `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. Senza
queste variabili l'app si avvia ma ogni chiamata a Supabase fallisce (avviso
in console).

Il piano di implementazione originale è in
`C:\Users\Pitta\.claude\plans\proproni-la-tua-implementazione-fluttering-popcorn.md`.
Decisioni chiave, tutte rispecchiate nello schema e nel codice:

- Pareggio nelle fasi a eliminazione diretta → l'Admin sceglie a mano il vincitore
- Rose → giocatori registrati **più** giocatori "ospite" (solo nome, senza account)
- Calendario del girone → creato manualmente dagli staff (unicità di coppia imposta dal DB)
- Tabellone play-off/semifinali/finali → slot pre-calcolati e precompilati da `close_phase()` secondo il regolamento
- Avanzamento di fase → manuale ("Chiudi fase" in Panoramica), con verifiche bloccanti lato server
- Stack → JavaScript (no TypeScript), React Router, CSS scritto a mano (niente Tailwind: si è mantenuto e ampliato il design system già in `index.css`), Supabase (Auth + Postgres + RLS + Realtime)

## Database

[docs/schema.sql](docs/schema.sql) è la fonte di verità per lo schema: tabelle,
vincoli di regolamento (esattamente 6 squadre, un solo scontro per coppia nel
girone, un solo match per slot KO), funzioni helper (`my_role`, `is_staff`,
`can_manage`), RPC (`create_tournament`, `join_tournament`,
`get_tournament_codes`, `set_member_role`, `remove_member`,
`set_member_status`, `close_phase`), RLS su ogni tabella e la publication
realtime. **L'autorità dei permessi vive nel database**: il frontend nasconde
solo i controlli, non è mai l'unica barriera.

Da eseguire una tantum sul progetto Supabase (SQL editor o `supabase db push`
puntato a questo file).

## Struttura frontend

```
torneo-calcetto/src/
  lib/
    supabase.js                  client Supabase (legge le env VITE_SUPABASE_*)
    tournament/
      standings.js                calcolo puro classifica (3/1/0 punti, spareggio DR)
      bracket.js                  risoluzione pura degli slot KO (anteprima/podio)
      permissions.js               specchio client di can_manage() — solo per la UI
      actions.js                   wrapper delle RPC e delle insert/update dirette
  context/
    AuthContext.jsx                sessione Supabase + profilo (signUp/signIn/signOut)
    TournamentContext.jsx          dati del torneo corrente + realtime (postgres_changes)
  components/
    icons.jsx                     icone SVG inline del dominio
    RequireAuth.jsx / GuestOnly.jsx  guardie di routing
    ui/ConfirmDialog.jsx, Alert.jsx
  routes/
    Landing.jsx  Login.jsx  Register.jsx  Dashboard.jsx
    tournament/
      TournamentLayout.jsx         shell con tab + guardia di ruolo
      Overview.jsx                 stato torneo, codici (solo staff), chiusura fase
      Lobby.jsx                    ruoli, promozione/retrocessione, espulsione, ban
      Teams.jsx                    creazione squadre, rose (iscritti + ospiti)
      Matches.jsx                  calendario e risultati del girone
      Standings.jsx                classifica live, avviso su parità irrisolte
      Bracket.jsx                  tabellone KO, pareggio a scelta manuale, podio
  App.jsx                          definizione delle rotte
  main.jsx                         BrowserRouter + AuthProvider
```

Ogni scrittura verso Supabase passa da `lib/tournament/actions.js`; nessun
componente chiama `supabase` direttamente per mutazioni sensibili.

## Design system

Le regole grafiche del progetto sono in [STYLE.md](STYLE.md) e vanno seguite
alla lettera per qualunque lavoro sull'interfaccia. In sintesi quanto già
applicato in [index.css](torneo-calcetto/src/index.css) — unico file di
design system, organizzato in sezioni commentate (token → componenti base →
sezioni di pagina):

- **Identità di dominio**: campo da calcetto notturno. Token nominati per
  materiale: `--pitch`, `--pitch-deep`, `--pitch-light`, `--chalk`, `--gold`, `--gold-deep`.
- **Icone**: mai emoji, mai librerie esterne. Solo SVG inline 24×24,
  `currentColor`, in [icons.jsx](torneo-calcetto/src/components/icons.jsx).
- **Favicon** ([favicon.svg](torneo-calcetto/public/favicon.svg)): disegnata a
  mano seguendo il processo di STYLE.md §1.

Quando si estende l'UI, riusare i token e le classi esistenti (`.btn`,
`.panel`, `.badge`, `.field`, `.table`, `.tabs`, `.modal`...) invece di
introdurre nuovi valori o librerie CSS-in-JS.

## Comandi

```bash
cd torneo-calcetto
npm run dev       # sviluppo
npm run build     # build di produzione
npm run lint      # oxlint
```

Deploy su Netlify: build command `npm run build`, publish directory `dist`;
[public/_redirects](torneo-calcetto/public/_redirects) gestisce il routing SPA
di React Router.

## Note di processo

Per il lavoro grafico, seguire il processo descritto in STYLE.md §7: niente
commit automatici dopo modifiche di stile, niente suite di test per il CSS,
niente browser automation senza autorizzazione esplicita.
