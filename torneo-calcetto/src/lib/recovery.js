// Via di fuga comune a tutti gli errori irrecuperabili: si butta via lo stato
// locale (che è sempre ricostruibile dal database) e si riparte dalla home.
// Il torneo vive su Supabase: qui non c'è mai niente di irrinunciabile da
// perdere, quindi ripulire è sempre sicuro.

// La sessione di Supabase Auth sta in localStorage sotto chiavi "sb-*".
// Si conserva: un errore di interfaccia non è un buon motivo per buttare
// fuori chi stava lavorando, e ricadendo sulla home la sessione permette il
// rientro immediato al torneo.
const SESSION_PREFIX = 'sb-'

async function clearCaches() {
  if (!('caches' in window)) return
  const keys = await caches.keys()
  await Promise.all(keys.map((k) => caches.delete(k)))
}

async function unregisterServiceWorkers() {
  if (!('serviceWorker' in navigator)) return
  const regs = await navigator.serviceWorker.getRegistrations()
  await Promise.all(regs.map((r) => r.unregister()))
}

function clearStorage({ keepSession }) {
  try {
    sessionStorage.clear()
  } catch {
    // storage negato (navigazione privata): non c'è nulla da ripulire
  }
  try {
    const drop = Object.keys(localStorage).filter(
      (k) => !keepSession || !k.startsWith(SESSION_PREFIX),
    )
    drop.forEach((k) => localStorage.removeItem(k))
  } catch {
    // idem
  }
}

// Ogni passaggio è protetto: se la pulizia fallisce si torna comunque alla
// home, che è il punto dell'operazione.
export async function resetAndGoHome({ keepSession = true } = {}) {
  clearStorage({ keepSession })
  await Promise.allSettled([clearCaches(), unregisterServiceWorkers()])
  // replace, non assign: la pagina rotta non deve restare nella cronologia,
  // e il reload completo scarta anche lo stato React in memoria
  window.location.replace('/')
}
