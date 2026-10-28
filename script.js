  // Inserisci qui URL e chiave publishable (o anon legacy) del tuo progetto Supabase.
  const SUPABASE_URL = "https://TUO-PROGETTO.supabase.co";
  const SUPABASE_KEY = "LA_TUA_CHIAVE_PUBLISHABLE";

  import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

  const statusEl = document.getElementById("status");
  const rowsEl = document.getElementById("rows");
  const notesEl = document.getElementById("notes");
  let rows = [];
  let notes = "";
  let supabase;
  let applyingRemote = false;
  let saveTimer = null;
  let channel;

  function setStatus(message, kind = "") {
    statusEl.textContent = message;
    statusEl.className = "status" + (kind ? " " + kind : "");
  }

  function renderRows() {
    rowsEl.replaceChildren();
    rows.forEach((row, index) => {
      const tr = document.createElement("tr");
      ["name", "category", "value", "notes"].forEach((field) => {
        const td = document.createElement("td");
        const input = document.createElement("input");
        input.type = "text";
        input.value = row[field] ?? "";
        input.setAttribute("aria-label", `${field} riga ${index + 1}`);
        input.addEventListener("input", () => {
          rows[index][field] = input.value;
          scheduleSave();
        });
        td.append(input);
        tr.append(td);
      });
      const action = document.createElement("td");
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "delete";
      remove.textContent = "✕";
      remove.title = "Elimina riga";
      remove.setAttribute("aria-label", `Elimina riga ${index + 1}`);
      remove.addEventListener("click", () => {
        rows.splice(index, 1);
        renderRows();
        scheduleSave();
      });
      action.append(remove);
      tr.append(action);
      rowsEl.append(tr);
    });
  }

  function scheduleSave() {
    if (applyingRemote || !supabase) return;
    setStatus("Modifiche da salvare…");
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 650);
  }

  async function saveNow() {
    if (!supabase || applyingRemote) return;
    try {
      setStatus("Salvataggio…");
      const { error } = await supabase.from("shared_workspace").upsert({
        id: 1, rows, notes, updated_at: new Date().toISOString()
      });
      if (error) throw error;
      setStatus("Salvato", "ok");
    } catch (error) {
      console.error(error);
      setStatus("Errore salvataggio", "err");
    }
  }

  async function loadData() {
    const { data, error } = await supabase.from("shared_workspace").select("*").eq("id", 1).maybeSingle();
    if (error) throw error;
    if (!data) {
      rows = [{ name: "", category: "", value: "", notes: "" }];
      notes = "";
      const { error: insertError } = await supabase.from("shared_workspace").insert({
        id: 1, rows, notes, updated_at: new Date().toISOString()
      });
      if (insertError && insertError.code !== "23505") throw insertError;
    } else {
      rows = Array.isArray(data.rows) ? data.rows : [];
      notes = typeof data.notes === "string" ? data.notes : "";
    }
    renderRows();
    notesEl.value = notes;
    setStatus("Connesso · Salvato", "ok");
  }

  document.getElementById("add-row").addEventListener("click", () => {
    rows.push({ name: "", category: "", value: "", notes: "" });
    renderRows();
    scheduleSave();
  });
  notesEl.addEventListener("input", () => { notes = notesEl.value; scheduleSave(); });

  async function start() {
    if (SUPABASE_URL.includes("TUO-PROGETTO") || SUPABASE_KEY.includes("LA_TUA_CHIAVE")) {
      setStatus("Configura Supabase", "err");
      return;
    }
    try {
      supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
      await loadData();

      channel = supabase.channel("shared-workspace-live")
        .on("postgres_changes", { event: "*", schema: "public", table: "shared_workspace", filter: "id=eq.1" }, (payload) => {
          // Ignore the local echo while typing; other clients still receive updates.
          if (document.activeElement && (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA")) return;
          const data = payload.new;
          if (!data) return;
          applyingRemote = true;
          rows = Array.isArray(data.rows) ? data.rows : [];
          notes = typeof data.notes === "string" ? data.notes : "";
          renderRows();
          notesEl.value = notes;
          applyingRemote = false;
          setStatus("Aggiornato in tempo reale", "ok");
        })
        .subscribe((state) => {
          if (state === "SUBSCRIBED") setStatus("Connesso · In tempo reale", "ok");
          if (state === "CHANNEL_ERROR" || state === "TIMED_OUT") setStatus("Errore sincronizzazione", "err");
        });
    } catch (error) {
      console.error(error);
      setStatus("Connessione fallita: controlla SQL e chiavi", "err");
    }
  }
  start();
