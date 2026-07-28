---
name: style
description: Migliora lo stile di design secondo le idee di Claude Fable 5
---


# Playbook grafico — istruzioni per implementare interfacce di qualità

Istruzioni operative per progettare e implementare l'estetica di un'interfaccia web, in qualunque progetto, anche quando l'utente non fornisce alcuna richiesta stilistica. Il documento è scritto come set di regole da seguire alla lettera: quando lavori su un aspetto grafico, applica la sezione corrispondente.

---

## 1. Icone

**Regola principale: mai emoji, mai librerie di icone pesanti, mai icone caricate da CDN.** Usa SVG inline minimali in stile Google Material Symbols.

### Come costruirle

- ViewBox sempre `0 0 24 24`, come Material Icons. Dimensione di default 14–20px passata via prop.
- Colore sempre `fill="currentColor"` (o `stroke="currentColor"` per icone outline): l'icona eredita il colore del testo circostante e si adatta automaticamente a hover, stati e temi.
- Geometria semplice: 1–3 path, forme piene oppure tratti con `stroke-width: 2`, `stroke-linecap="round"`, `stroke-linejoin="round"`. Niente dettagli sotto i 2px, niente gradienti dentro l'icona.
- Ogni icona è un piccolo componente riutilizzabile con props `size` e `className`, più `role="img"` e `aria-label`/`<title>` per l'accessibilità.

```jsx
export default function CheckIcon({ size = 16, className = '' }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24"
         fill="none" stroke="currentColor" strokeWidth="2"
         strokeLinecap="round" strokeLinejoin="round" role="img" aria-label="Fatto">
      <path d="M4 12.5l5 5L20 6.5" />
    </svg>
  )
}
```

Un'icona piena (fill) segue lo stesso schema: pochi path con coordinate tonde, `fill="currentColor"`, un `<title>` descrittivo. Esempio: una corona per contrassegnare un ruolo speciale si disegna con un solo path a zigzag più un rettangolo di base — non serve altro.

### Come sceglierle

- Cerca prima l'equivalente in Google Material Symbols (fonts.google.com/icons) e ricrea quel glifo a mano semplificandolo: stessa metafora, meno nodi. Non copiare path complessi: ridisegna con coordinate tonde sulla griglia 24×24.
- L'icona accompagna il testo, non lo sostituisce, salvo azioni universali (chiudi ✕ disegnata come due path, non il carattere ✕... e mai l'emoji ❌).
- Allineamento: dentro un flex container con `align-items: center` e `gap: 6–8px`; l'icona è ~1em del testo adiacente.

### Icona dell'applicazione (favicon / PWA) — categoria opzionale, solo su richiesta dell'utente

Se l'utente chiede un'icona per l'app (favicon, icona PWA, icona installabile), generala come singolo file `.svg` disegnato a mano, seguendo questo processo:

- **Canvas**: `viewBox="0 0 512 512"`, sfondo a rettangolo pieno con angoli arrotondati (`rx` ≈ 20% del lato, es. 104 su 512) — funziona sia come favicon sia come icona PWA "maskable-friendly".
- **Sfondo = materiale dominante del tema**: riprendi i token del design system dell'app e usa il colore/materiale principale come `linearGradient` diagonale dal tono chiaro al tono scuro (es. per un gioco da tavolo il gradiente del panno di gioco; per un'app meteo un gradiente cielo). L'icona deve sembrare un frammento dell'app stessa.
- **Cornice interna**: un secondo rettangolo arrotondato inscritto, `fill="none"`, stroke in una tinta più chiara dello sfondo con `opacity` ~0.5: dà finitura senza aggiungere elementi.
- **Soggetto: 1–2 elementi emblematici del dominio, non di più.** Scegli l'oggetto che da solo identifica il progetto (per un gioco di carte: due carte leggermente ruotate e sovrapposte; per un'app di note: un foglio con l'angolo piegato; per un timer: un quadrante). Componili con leggere rotazioni (±10–12°) per dare dinamismo, con path semplici in stile Material come da regole sopra.
- **Superfici con gradienti tenui**: gli oggetti chiari (una carta, un foglio) usano un `linearGradient` verticale quasi impercettibile (bianco → bianco sporco) più uno stroke sottile di tono neutro, invece del bianco piatto: è ciò che rende l'icona "materica" e non piatta.
- **Niente testi lunghi**: mai parole o nome dell'app dentro l'icona, se non richiesto. Al massimo un singolo carattere se è parte del linguaggio del dominio (l'asso "A" su una carta, la nota "♪"); usa il font display del progetto.
- **Palette limitata**: 3–4 colori totali, presi dai token dell'app più al massimo un colore semantico del dominio (il rosso dei semi delle carte, il giallo del sole). Contrasto forte tra soggetto e sfondo: l'icona deve leggersi anche a 16×16.
- Salvala come `public/favicon.svg`: è la sorgente unica da cui derivi tutto il resto del pacchetto.

**Il pacchetto completo per una PWA** è composto dal `favicon.svg` più 4 PNG in `public/icons/`, tutti rasterizzati dallo stesso SVG:

| File | Dimensione | Scopo |
|---|---|---|
| `icons/icon-192.png` | 192×192 | icona PWA standard |
| `icons/icon-512.png` | 512×512 | icona PWA standard / splash |
| `icons/icon-maskable-512.png` | 512×512 | `purpose: maskable` (Android) |
| `icons/apple-touch-icon.png` | 180×180 | iOS home screen |

Come generarli:

- Rasterizza con `sharp` (dipendenza dev) tramite uno script Node usa-e-getta: `sharp(Buffer.from(svg)).resize(N, N).png().toFile(...)` per ciascuna dimensione. Non salvare PNG disegnati a mano né usare servizi online.
- **Variante maskable**: non riusare l'SVG tale e quale — Android ritaglia l'icona in un cerchio, quindi il soggetto deve stare nella "safe zone" centrale (~80% del lato). Genera una variante dell'SVG con sfondo a piena copertura **senza** angoli arrotondati (`rx=0`, sarà la piattaforma a mascherare) e con il soggetto scalato a ~0.8 e ricentrato, poi rasterizzala a 512.
- **Apple touch icon**: rasterizzazione a 180×180 della versione normale; iOS applica da sé gli angoli arrotondati, quindi anche qui meglio partire dalla variante con sfondo pieno senza `rx`.
- Registra tutto in `public/manifest.json`: l'SVG con `"sizes": "any"` e `purpose: "any"`, i due PNG standard, il maskable con `"purpose": "maskable"`; imposta anche `background_color` e `theme_color` con i colori scuro e principale del tema (gli stessi token dello sfondo dell'icona). In `index.html` collega `<link rel="icon" href="/favicon.svg" type="image/svg+xml">`, `<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">` e il manifest.
- Dopo la generazione, elimina lo script usa-e-getta; i PNG committati sono l'output, la sorgente di verità resta `favicon.svg`.

---

## 2. Design senza brief (come progettare quando l'utente non chiede uno stile)

Quando non c'è alcuna richiesta stilistica, non produrre un'interfaccia "neutra da framework". Deriva un'identità visiva dal **dominio dell'app** e impegnati su di essa. Se l'app è un gioco da casinò, i materiali sono il feltro verde del tavolo, l'oro degli ornamenti, la crema delle carte, il legno del bordo; se è un'app meteo, saranno cielo, nuvole e luce del sole; se è un tool per sviluppatori, l'estetica del terminale. Procedimento:

1. **Estrai 3–5 materiali/colori dal mondo reale del dominio** e trasformali in variabili CSS con nomi di dominio, non generici: per un gioco di carte `--felt`, `--rim`, `--gold`, `--cream`, non `--primary`/`--secondary`. Il nome del token deve evocare il materiale che rappresenta.
2. **Un solo file di design system** (es. `index.css`): token in `:root`, poi componenti base (`.btn`, `.input`, `.modal`), poi sezioni per pagina, separate da commenti-intestazione. Niente CSS-in-JS sparso, niente Tailwind se non richiesto.
3. **Token obbligatori**: palette, un solo `--radius` (12–14px), una sola `--shadow`, due font (`--font-display` serif o caratterizzante per i titoli, `--font-ui` di sistema per il resto). Ogni componente usa i token, mai valori esadecimali ripetuti inline.
4. **Superfici come materiali, non tinte piatte**: lo sfondo della pagina è un `radial-gradient` che simula la luce (più chiaro dove "batte la lampada", scuro ai bordi); i pannelli sono scuri semitrasparenti (es. `rgba(6,26,16,0.88)`) con bordo 1px nel colore d'accento al 30–40% di opacità.
5. **Gerarchia con la tipografia**: titolo display con `clamp()` per la dimensione, `letter-spacing` largo e `text-transform: uppercase` per sottotitoli ed etichette; testo secondario nel colore chiaro della palette attenuato via alpha (`rgba(…, 0.55–0.75)`), mai grigio puro.
6. **Scena, non solo layout**: se il dominio lo consente, costruisci un elemento ambientale in puro CSS con pseudo-elementi. Esempio concreto: per un gioco di carte, un tavolo semicircolare che spunta dal fondo della home — un `::before` con `border-radius: 50% 50% 0 0 / 100% 100% 0 0`, riempito da un gradiente radiale "feltro", bordato da 14px di colore "legno", con un'ombra `inset` che scava la superficie; sopra, un `::after` più piccolo con solo un bordo sottile dorato semitrasparente a disegnare la linea delle puntate. Trenta righe di CSS che danno identità all'intera app.

Regola di giudizio: se uno screenshot dell'app potrebbe appartenere a qualunque altra app, il design non è finito.

---

## 3. Effetti (profondità, luce, bagliori)

Gli effetti servono a simulare materiali e luce, non a decorare. Tecniche precise:

- **Bottoni "fisici"**: sfondo `linear-gradient(180deg, chiaro, colore 45%, scuro)` — la luce viene dall'alto. Bordo 1px più chiaro del riempimento. Per il bottone primario aggiungi un bagliore del suo stesso colore: `box-shadow: 0 4px 14px rgba(<colore accento>, 0.35)`. Sul bottone chiaro, un `text-shadow: 0 1px 0 rgba(255,255,255,0.3)` dà l'effetto inciso.
- **Ombre**: una sola ombra ambientale grande e morbida per i pannelli (es. `0 10px 30px rgba(0,0,0,0.45)`), definita come token. Mai ombre nere dure, mai più di due ombre per elemento.
- **Bagliori (glow)**: sempre col colore d'accento a bassa opacità, mai bianco. Focus degli input: `box-shadow: 0 0 0 3px rgba(<accento>, 0.18)`. Elemento attivo o vincente: glow pulsante via animazione (vedi §4).
- **Profondità interna**: ombra `inset` per superfici concave (es. `inset 0 20px 60px rgba(0,0,0,0.35)` su un piano di gioco); `text-shadow` a due livelli per titoli "in rilievo": `0 2px 0 <tinta scura del colore del testo>, 0 6px 24px rgba(0,0,0,0.6)`.
- **Vetro/pannelli**: sfondo scuro semitrasparente + bordo tenue nel colore d'accento; `backdrop-filter: blur(...)` solo con parsimonia (costa in performance su mobile).
- Opacità sempre in step riconoscibili: 0.18 (glow tenue), 0.35 (bordi/ombre colorate), 0.55–0.75 (testo secondario), 0.88 (pannelli).

---

## 4. Animazioni e micro-interazioni

Le animazioni sono brevi, con uno scopo, e in numero limitato. Regole:

- **Durate**: micro-interazioni (hover, press) 100–150ms; ingressi di elementi (card, modali, banner) 250–400ms. Mai oltre 500ms per feedback di interazione. Easing `ease` o `ease-out` per gli ingressi; `cubic-bezier(0.34, 1.56, 0.64, 1)` (overshoot) solo per apparizioni "festose" come un banner di vittoria.
- **Hover dei bottoni**: `transform: translateY(-1px)` + `filter: brightness(1.15)`; al click ritorna a `translateY(0)`. Transizione dichiarata solo sulle proprietà usate: `transition: transform 0.12s ease, box-shadow 0.12s ease, filter 0.12s ease` — mai `transition: all`.
- **Ingressi con significato fisico**: un elemento entra da dove proverrebbe nel mondo reale. Una carta distribuita arriva dalla direzione del mazzo (`from { opacity: 0; transform: translateY(-26px) translateX(18px) rotate(4deg) }` → posizione finale); un banner di esito "sboccia" al centro (`scale(0.85)` → `scale(1)` con fade-in); una notifica scivola dal bordo da cui logicamente proviene.
- **Attesa/attenzione**: un solo pattern, il pulse di opacità (`@keyframes pulse { 50% { opacity: 0.45 } }`) con durata 1.2–1.6s infinite; spinner = bordo che ruota (`@keyframes spin { to { transform: rotate(360deg) } }`).
- **Anima solo `transform` e `opacity`** (compositor-friendly). Mai animare `width`, `height`, `top/left` o colori di sfondo in loop.
- **Stagger**: per liste di elementi che entrano insieme, ritarda ciascuno di 60–120ms via `animation-delay` calcolato sull'indice.
- Rispetta `prefers-reduced-motion: reduce` disattivando le animazioni decorative (pulse, overshoot), mantenendo i cambi di stato istantanei.

---

## 5. Layout e responsive

- Mobile-first di fatto: ogni dimensione "grande" usa `clamp(min, preferita-in-vw, max)` — titoli, padding, perfino il letter-spacing (es. `font-size: clamp(40px, 10vw, 96px)` per un titolo display). Questo elimina metà dei breakpoint.
- Contenitori centrali con `width: min(320px, 100%)` o `max-width` + `margin: auto`; mai larghezze fisse.
- Spaziatura con `gap` su flex/grid, in una scala breve e riutilizzata ovunque: 6, 8, 14, 24, 34px. Non inventare valori nuovi per ogni componente.
- `overflow-x: hidden` sul body solo se ci sono elementi scenografici che sbordano di proposito; tutto il resto deve stare nel viewport senza scroll orizzontale.
- Elementi sovrapposti/decorativi sempre `position: absolute; inset: 0; pointer-events: none`.

---

## 6. Stati e feedback

- Ogni elemento interattivo ha i 4 stati definiti: default, hover, active, disabled (`opacity: 0.45; cursor: not-allowed` — mai nasconderlo, e mai lasciare l'hover attivo su disabled: usa `:hover:not(:disabled)`).
- Semantica dei colori coerente e tokenizzata: `--danger`, `--ok`; il colore comunica lo stato prima del testo (bordo/glow sull'elemento attivo, banner verde/rosso per l'esito).
- Focus visibile sempre (anello glow di §3), mai `outline: none` senza sostituto.

---

## 7. Processo di lavoro (commit, test, verifica)

Il giudizio estetico finale spetta allo sviluppatore, non a te. Regole di processo:

- **Mai commit automatici.** Non eseguire `git commit` (né push) dopo le modifiche grafiche: lascia le modifiche nel working tree e chiedi allo sviluppatore di valutarle. Committa solo su sua richiesta esplicita.
- **Riduci i test automatici al minimo.** Non scrivere suite di test per il CSS, non avviare cicli ripetuti di verifica automatica del layout. Le correzioni e le valutazioni estetiche sono delegate allo sviluppatore: presenta il risultato, e se qualcosa non va sarà lui a chiederti di correggere gli aspetti non adatti.
- **Test piccoli solo in fase embrionale.** Un rapido controllo (l'app si avvia, la pagina renderizza, niente errori in console) è ammesso solo sulle prime versioni del design, per assicurarti che la base sia sana.
- **Test approfonditi solo su autorizzazione.** Se ritieni utile una verifica più ampia — ad esempio generare screenshot per osservare il layout nel suo complesso o su più viewport — chiedi prima allo sviluppatore se procedere, spiegando cosa vuoi verificare. Non lanciare browser automation di tua iniziativa.
- Quando consegni, descrivi in sintesi cosa hai cambiato visivamente, così lo sviluppatore sa cosa guardare.

---

## 8. Checklist finale prima di consegnare

1. Zero emoji usate come icone; tutte le icone sono SVG 24×24 `currentColor`.
2. Nessun colore/raggio/ombra hardcoded fuori dai token di `:root`.
3. Bottoni: gradiente verticale, hover -1px, transizione ≤150ms su proprietà esplicite.
4. Almeno un elemento che dà identità di dominio all'app (scena, texture, palette derivata dal mondo reale).
5. Animazioni solo su `transform`/`opacity`, con `prefers-reduced-motion` gestito.
6. Testo secondario attenuato via alpha del colore base, non grigio arbitrario.
7. Screenshot-test: l'app è riconoscibile come *questa* app, non come un template.
