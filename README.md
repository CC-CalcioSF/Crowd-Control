# Spazio condiviso — GitHub Pages + Supabase

Sostituisce Firebase con Supabase. Include una tabella editabile, appunti liberi, salvataggio nel database e aggiornamenti in tempo reale.

## 1. Crea un progetto Supabase
1. Vai su https://supabase.com/dashboard e crea un progetto gratuito.
2. Aspetta che il progetto sia pronto.
3. Apri **SQL Editor** nel menu laterale.
4. Premi **New query**, copia tutto il contenuto di `supabase-setup.sql`, incollalo e premi **Run**.
5. Se Realtime non si attiva automaticamente, vai a **Database → Publications** (o sezione Realtime) e abilita `shared_workspace` nella publication `supabase_realtime`.

## 2. Copia URL e chiave
1. Nel dashboard apri **Project Settings → API** oppure **Connect**.
2. Copia il **Project URL**.
3. Copia la **publishable key** (`sb_publishable_...`). Se il progetto mostra ancora la vecchia chiave `anon`, puoi usare quella.
4. Non usare mai una `service_role` o `secret` key nel browser.

## 3. Configura index.html
Apri `index.html` con Blocco note / Visual Studio Code e cerca:
- `https://TUO-PROGETTO.supabase.co`
- `LA_TUA_CHIAVE_PUBLISHABLE`

Sostituiscili con il tuo Project URL e la chiave publishable, mantenendo le virgolette. Salva.

## 4. Pubblica su GitHub Pages
1. Crea un repository GitHub, ad esempio `shared-workspace`.
2. Carica `index.html`, `supabase-setup.sql` e `README.md` nella cartella principale.
3. Apri **Settings → Pages**.
4. In **Build and deployment** scegli **Deploy from a branch**, branch `main`, cartella `/ (root)`, poi **Save**.
5. Attendi la pubblicazione e apri l'URL indicato da GitHub Pages. Mandalo al tuo amico.

## Sicurezza importante
Questo esempio è configurato apposta per un workspace pubblico modificabile da chiunque abbia il link. Il link non è una password: chi lo conosce può leggere, cambiare o cancellare il contenuto. Non inserire informazioni sensibili. Per privacy reale serve autenticazione e una policy RLS più restrittiva.

## Limite
Tabella e appunti vengono salvati insieme in una singola riga. Se entrambi scrivete nello stesso momento, alcune modifiche potrebbero sovrascriversi. Per un progetto piccolo va bene come punto di partenza, ma non è un editor collaborativo robusto come Google Docs.
