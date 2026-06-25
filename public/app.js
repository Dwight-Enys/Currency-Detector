/* ── CurrencyLens — app.js ─────────────────────────── */

const fileInput   = document.getElementById("fileInput");
const cameraInput = document.getElementById("cameraInput");
const cameraBtn   = document.getElementById("cameraBtn");
const dropZone    = document.getElementById("dropZone");
const dropInner   = document.getElementById("dropInner");
const previewState= document.getElementById("previewState");
const previewImg  = document.getElementById("previewImg");
const analyzeBtn  = document.getElementById("analyzeBtn");
const resultsPanel= document.getElementById("resultsPanel");
const loadingState= document.getElementById("loadingState");
const resultContent=document.getElementById("resultContent");

let selectedFile = null;

/* ── File handling ──────────────────────────────────── */
fileInput.addEventListener("change", e => {
  if (e.target.files[0]) setFile(e.target.files[0]);
});

cameraInput.addEventListener("change", e => {
  if (e.target.files[0]) setFile(e.target.files[0]);
});

cameraBtn.addEventListener("click", () => cameraInput.click());

function setFile(file) {
  selectedFile = file;
  const url = URL.createObjectURL(file);
  previewImg.src = url;
  dropInner.classList.add("hidden");
  previewState.classList.remove("hidden");
  analyzeBtn.disabled = false;
}

/* ── Drag & drop ────────────────────────────────────── */
dropZone.addEventListener("dragover", e => {
  e.preventDefault();
  dropZone.classList.add("drag-over");
});

dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag-over"));

dropZone.addEventListener("drop", e => {
  e.preventDefault();
  dropZone.classList.remove("drag-over");
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith("image/")) setFile(file);
});

dropZone.addEventListener("click", e => {
  if (e.target === dropZone || e.target.closest(".drop-inner")) {
    fileInput.click();
  }
});

/* ── Reset ─────────────────────────────────────────── */
function resetUpload() {
  selectedFile = null;
  fileInput.value = "";
  cameraInput.value = "";
  previewImg.src = "";
  previewState.classList.add("hidden");
  dropInner.classList.remove("hidden");
  analyzeBtn.disabled = true;
  resultsPanel.classList.add("hidden");
  loadingState.classList.remove("hidden");
  resultContent.classList.add("hidden");
}

/* ── Analyze ────────────────────────────────────────── */
async function analyze() {
  if (!selectedFile) return;

  analyzeBtn.disabled = true;
  resultsPanel.classList.remove("hidden");
  loadingState.classList.remove("hidden");
  resultContent.classList.add("hidden");

  // Scroll to results
  setTimeout(() => resultsPanel.scrollIntoView({ behavior: "smooth", block: "start" }), 100);

  const formData = new FormData();
  formData.append("image", selectedFile);

  try {
    const res = await fetch("/api/detect", { method: "POST", body: formData });
    const json = await res.json();

    loadingState.classList.add("hidden");
    resultContent.classList.remove("hidden");

    if (!json.success) {
      showError(json.error || "An unknown error occurred.");
      return;
    }

    renderResult(json.result);
  } catch (err) {
    loadingState.classList.add("hidden");
    resultContent.classList.remove("hidden");
    showError("Network error — is the server running?");
  } finally {
    analyzeBtn.disabled = false;
  }
}

/* ── Render result ─────────────────────────────────── */
function renderResult(data) {
  const noCurrency  = document.getElementById("noCurrency");
  const currencyCards=document.getElementById("currencyCards");
  const totalsSection=document.getElementById("totalsSection");
  const totalsList  = document.getElementById("totalsList");
  const aiNotes     = document.getElementById("aiNotes");
  const notesText   = document.getElementById("notesText");
  const resultStatus= document.getElementById("resultStatus");
  const qualityRow  = document.getElementById("qualityRow");
  const qualityBadge= document.getElementById("qualityBadge");

  // Reset
  currencyCards.innerHTML = "";
  totalsList.innerHTML = "";
  noCurrency.classList.add("hidden");
  totalsSection.classList.add("hidden");
  aiNotes.classList.add("hidden");
  qualityRow.style.display = "none";

  if (!data.detected || !data.currencies || data.currencies.length === 0) {
    resultStatus.textContent = "";
    noCurrency.classList.remove("hidden");
    return;
  }

  // Status
  const count = data.currencies.length;
  resultStatus.textContent = `${count} item${count !== 1 ? "s" : ""} detected`;

  // Currency cards
  data.currencies.forEach(c => {
    const card = buildCard(c);
    currencyCards.appendChild(card);
  });

  // Totals
  if (data.total_by_currency && data.total_by_currency.length > 0) {
    data.total_by_currency.forEach(t => {
      const row = document.createElement("div");
      row.className = "total-row";
      row.innerHTML = `
        <span class="total-name">${t.currency_name || t.currency_code}</span>
        <span class="total-amount">${t.symbol || ""}${formatAmount(t.total)}</span>
      `;
      totalsList.appendChild(row);
    });
    totalsSection.classList.remove("hidden");
  }

  // Notes
  if (data.notes) {
    notesText.textContent = data.notes;
    aiNotes.classList.remove("hidden");
  }

  // Image quality
  if (data.image_quality) {
    qualityBadge.textContent = data.image_quality;
    qualityBadge.style.background = data.image_quality === "clear" ? "#e8f5ee" : data.image_quality === "partial" ? "#fff8e6" : "#fdecea";
    qualityRow.style.display = "flex";
  }
}

function buildCard(c) {
  const wrapper = document.createElement("div");
  wrapper.className = "currency-card";

  const typeClass = c.note_or_coin === "coin" ? "badge-coin" : "badge-note";
  const typeLabel = c.note_or_coin || "note";

  const confPct  = c.confidence === "high" ? 100 : c.confidence === "medium" ? 60 : 30;
  const confClass = `conf-${c.confidence || "low"}`;

  wrapper.innerHTML = `
    <div class="card-top">
      <div class="card-amount">
        <span class="card-symbol">${c.symbol || ""}</span>${formatAmount(c.amount)}
      </div>
      <div class="card-badges">
        <span class="badge badge-code">${c.currency_code || "???"}</span>
        <span class="badge ${typeClass}">${typeLabel}</span>
      </div>
    </div>
    <div class="card-grid">
      <div class="card-row">
        <span class="card-key">Currency</span>
        <span class="card-val">${c.currency_name || "Unknown"}</span>
      </div>
      <div class="card-row">
        <span class="card-key">Country</span>
        <span class="card-val">${c.country || "Unknown"}</span>
      </div>
      <div class="card-row">
        <span class="card-key">Denomination</span>
        <span class="card-val">${c.denomination || c.amount || "—"}</span>
      </div>
      <div class="card-row">
        <span class="card-key">Condition</span>
        <span class="card-val">${capitalize(c.condition) || "—"}</span>
      </div>
    </div>
    <div class="confidence-bar">
      <span class="conf-label">AI confidence</span>
      <div class="conf-track"><div class="conf-fill ${confClass}" style="width:${confPct}%"></div></div>
      <span class="conf-label">${capitalize(c.confidence) || "Low"}</span>
    </div>
  `;

  return wrapper;
}

function showError(msg) {
  const resultStatus = document.getElementById("resultStatus");
  const currencyCards = document.getElementById("currencyCards");
  const noCurrency   = document.getElementById("noCurrency");

  resultStatus.textContent = "";
  currencyCards.innerHTML = `
    <div style="text-align:center;padding:32px;color:#c0392b;">
      <div style="font-size:2rem;margin-bottom:12px;">⚠</div>
      <p style="font-weight:600;margin-bottom:6px;">Detection failed</p>
      <p style="font-size:0.85rem;color:#6b6860;">${msg}</p>
    </div>
  `;
  document.getElementById("totalsSection").classList.add("hidden");
  document.getElementById("aiNotes").classList.add("hidden");
  document.getElementById("qualityRow").style.display = "none";
  noCurrency.classList.add("hidden");
}

function formatAmount(val) {
  if (val === undefined || val === null) return "—";
  const n = Number(val);
  if (isNaN(n)) return val;
  return n % 1 === 0 ? n.toLocaleString() : n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}
