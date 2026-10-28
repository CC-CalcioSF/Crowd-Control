// Keep the Project URL and publishable/anon key you already use on your website.
 const SUPABASE_URL = "https://kvnfbdfpyqvqexeezrir.supabase.co";
const SUPABASE_KEY = "sb_publishable_h1U1Jpkv4ndwGpH9HtvpSg_PF3DT_hp";

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const statusEl = document.getElementById("status");
const rowsEl = document.getElementById("rows");
const notesEl = document.getElementById("notes");
const eventForm = document.getElementById("event-form");
const eventFormStatus = document.getElementById("event-form-status");
const eventsList = document.getElementById("events-list");
let rows = [];
let notes = "";
let supabase;
let applyingRemote = false;
let saveTimer = null;
let workspaceChannel;
let eventsChannel;

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

async function loadWorkspace() {
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
}

document.getElementById("add-row").addEventListener("click", () => {
  rows.push({ name: "", category: "", value: "", notes: "" });
  renderRows();
  scheduleSave();
});
notesEl.addEventListener("input", () => { notes = notesEl.value; scheduleSave(); });

function setEventStatus(message, isError = false) {
  eventFormStatus.textContent = message;
  eventFormStatus.style.color = isError ? "#b91c1c" : "";
}

function formatEventDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data non disponibile";
  return new Intl.DateTimeFormat("it-IT", {
    weekday: "short", day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  }).format(date);
}

function addText(parent, tag, text, className) {
  const element = document.createElement(tag);
  element.textContent = text;
  if (className) element.className = className;
  parent.append(element);
  return element;
}

async function loadEvents() {
  eventsList.replaceChildren();
  addText(eventsList, "p", "Caricamento eventi…", "hint");
  try {
    const [{ data: events, error: eventsError }, { data: attendees, error: attendeesError }] = await Promise.all([
      supabase.from("events").select("*").order("event_date", { ascending: true }),
      supabase.from("event_attendees").select("id,event_id,nickname,created_at").order("created_at", { ascending: true })
    ]);
    if (eventsError) throw eventsError;
    if (attendeesError) throw attendeesError;

    eventsList.replaceChildren();
    if (!events || events.length === 0) {
      addText(eventsList, "div", "Non ci sono ancora eventi.", "empty-events");
      return;
    }

    const attendeesByEvent = new Map();
    for (const person of (attendees || [])) {
      if (!attendeesByEvent.has(person.event_id)) attendeesByEvent.set(person.event_id, []);
      attendeesByEvent.get(person.event_id).push(person.nickname);
    }

    for (const event of events) {
      const card = document.createElement("article");
      card.className = "event-card";
      addText(card, "h3", event.title || "Evento senza titolo");
      const meta = document.createElement("div");
      meta.className = "event-meta";
      const dateSpan = document.createElement("span");
      dateSpan.textContent = `📅 ${formatEventDate(event.event_date)}`;
      meta.append(dateSpan);
      if (event.location) {
        const place = document.createElement("span");
        place.textContent = `📍 ${event.location}`;
        meta.append(place);
      }
      if (event.creator_nickname) {
        const creator = document.createElement("span");
        creator.textContent = `Creato da ${event.creator_nickname}`;
        meta.append(creator);
      }
      card.append(meta);
      if (event.description) addText(card, "p", event.description, "event-description");

      const eventAttendees = attendeesByEvent.get(event.id) || [];
      const footer = document.createElement("div");
      footer.className = "event-footer";
      const attendeeText = eventAttendees.length
        ? `Iscritti (${eventAttendees.length}): ${eventAttendees.join(", ")}`
        : "Ancora nessun iscritto";
      addText(footer, "div", attendeeText, "participants");

      const signupForm = document.createElement("form");
      signupForm.className = "signup-form";
      const nickname = document.createElement("input");
      nickname.type = "text";
      nickname.maxLength = 40;
      nickname.required = true;
      nickname.placeholder = "Il tuo nickname";
      nickname.setAttribute("aria-label", `Nickname per iscriversi a ${event.title}`);
      const join = document.createElement("button");
      join.type = "submit";
      join.className = "primary";
      join.textContent = "Iscriviti";
      signupForm.append(nickname, join);
      signupForm.addEventListener("submit", async (submitEvent) => {
        submitEvent.preventDefault();
        const cleanNickname = nickname.value.trim().replace(/\s+/g, " ");
        if (!cleanNickname) return;
        join.disabled = true;
        join.textContent = "Iscrizione…";
        try {
          const { error } = await supabase.from("event_attendees").insert({ event_id: event.id, nickname: cleanNickname });
          if (error) {
            if (error.code === "23505") throw new Error("Questo nickname è già iscritto a questo evento.");
            throw error;
          }
          await loadEvents();
        } catch (error) {
          console.error(error);
          window.alert(error.message || "Non è stato possibile completare l'iscrizione.");
          join.disabled = false;
          join.textContent = "Iscriviti";
        }
      });
      footer.append(signupForm);
      card.append(footer);
      eventsList.append(card);
    }
  } catch (error) {
    console.error(error);
    eventsList.replaceChildren();
    addText(eventsList, "p", "Impossibile caricare gli eventi. Controlla di aver eseguito lo script SQL per gli eventi in Supabase.", "empty-events");
  }
}

eventForm.addEventListener("submit", async (submitEvent) => {
  submitEvent.preventDefault();
  const creatorNickname = document.getElementById("event-creator").value.trim().replace(/\s+/g, " ");
  const title = document.getElementById("event-title").value.trim();
  const dateValue = document.getElementById("event-date").value;
  const eventDate = new Date(dateValue);
  const location = document.getElementById("event-location").value.trim();
  const description = document.getElementById("event-description").value.trim();
  if (!creatorNickname || !title || !dateValue || Number.isNaN(eventDate.getTime())) {
    setEventStatus("Inserisci nickname, titolo e data/ora validi.", true);
    return;
  }
  if (eventDate.getTime() < Date.now()) {
    setEventStatus("La data dell'evento deve essere nel futuro.", true);
    return;
  }

  const submitButton = eventForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  setEventStatus("Creazione evento…");
  try {
    const { error } = await supabase.from("events").insert({
      title, description: description || null, event_date: eventDate.toISOString(),
      location: location || null, creator_nickname: creatorNickname
    });
    if (error) throw error;
    eventForm.reset();
    setEventStatus("Evento creato!");
    await loadEvents();
  } catch (error) {
    console.error(error);
    setEventStatus("Errore: controlla la configurazione SQL di Supabase.", true);
  } finally {
    submitButton.disabled = false;
  }
});

document.getElementById("refresh-events").addEventListener("click", loadEvents);

async function start() {
  if (SUPABASE_URL.includes("TUO-PROGETTO") || SUPABASE_KEY.includes("LA_TUA_CHIAVE")) {
    setStatus("Configura Supabase", "err");
    eventsList.replaceChildren();
    addText(eventsList, "p", "Inserisci nel file script.js il tuo URL e la tua chiave pubblica Supabase già usati dal sito.", "empty-events");
    return;
  }
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    await loadWorkspace();
    await loadEvents();
    setStatus("Connesso · Salvato", "ok");

    workspaceChannel = supabase.channel("shared-workspace-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "shared_workspace", filter: "id=eq.1" }, (payload) => {
        if (document.activeElement && ["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) return;
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

    eventsChannel = supabase.channel("shared-events-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, loadEvents)
      .on("postgres_changes", { event: "*", schema: "public", table: "event_attendees" }, loadEvents)
      .subscribe();
  } catch (error) {
    console.error(error);
    setStatus("Connessione fallita: controlla SQL e chiavi", "err");
  }
}

// Fade the banner as the page scrolls down.
const pageBanner = document.getElementById("pageBanner");
if (pageBanner) {
  window.addEventListener("scroll", () => {
    const fadeDistance = 250;
    pageBanner.style.opacity = Math.max(0, 1 - window.scrollY / fadeDistance);
  }, { passive: true });
}

start();
