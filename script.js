/* ===========================
   TN EB BILL CALCULATOR
   script.js
   Based on TNEB New Tariff (Effective: 10 May 2026)
   No Fixed Charges applicable from 2026
   =========================== */

"use strict";

// ---- LANGUAGE STATE ----
let lang = "en";

const langToggle = document.getElementById("langToggle");
const langLabel  = document.getElementById("langLabel");

langToggle.addEventListener("click", () => {
  lang = lang === "en" ? "ta" : "en";
  langLabel.textContent = lang === "en" ? "தமிழ்" : "English";
  document.body.classList.toggle("lang-ta", lang === "ta");
  applyLanguage();
});

function applyLanguage() {
  document.querySelectorAll("[data-en][data-ta]").forEach(el => {
    el.textContent = el.getAttribute("data-" + lang);
  });
  document.querySelectorAll("select option[data-en][data-ta]").forEach(el => {
    el.textContent = el.getAttribute("data-" + lang);
  });
  const placeholders = {
    prevReading: { en: "e.g. 1250", ta: "எ.கா. 1250" },
    currReading: { en: "e.g. 1550", ta: "எ.கா. 1550" },
    directUnits: { en: "e.g. 300",  ta: "எ.கா. 300"  }
  };
  Object.entries(placeholders).forEach(([id, vals]) => {
    const el = document.getElementById(id);
    if (el) el.placeholder = vals[lang];
  });
}

// ---- TAB SWITCHING ----
const tab1  = document.getElementById("tab1");
const tab2  = document.getElementById("tab2");
const mode1 = document.getElementById("mode1");
const mode2 = document.getElementById("mode2");

tab1.addEventListener("click", () => switchTab(1));
tab2.addEventListener("click", () => switchTab(2));

function switchTab(n) {
  [tab1, tab2].forEach(t => { t.classList.remove("active"); t.setAttribute("aria-selected","false"); });
  [mode1, mode2].forEach(m => m.classList.remove("active"));
  const activeTab   = n === 1 ? tab1 : tab2;
  const activePanel = n === 1 ? mode1 : mode2;
  activeTab.classList.add("active");
  activeTab.setAttribute("aria-selected", "true");
  activePanel.classList.add("active");
  hideResult();
}

// ---- LIVE SUBTRACTION PREVIEW (Mode 1) ----
const prevReading   = document.getElementById("prevReading");
const currReading   = document.getElementById("currReading");
const unitsPreview1 = document.getElementById("unitsPreview1");
const unitsVal1     = document.getElementById("unitsVal1");

function updateUnitsPreview() {
  const prev = parseFloat(prevReading.value);
  const curr = parseFloat(currReading.value);
  if (!isNaN(prev) && !isNaN(curr) && curr > prev) {
    unitsVal1.textContent = (curr - prev).toFixed(0);
    unitsPreview1.style.display = "flex";
  } else {
    unitsPreview1.style.display = "none";
  }
}

prevReading.addEventListener("input", updateUnitsPreview);
currReading.addEventListener("input", updateUnitsPreview);

// ---- TARIFF CONSTANTS ----
// TNEB New Tariff — Effective 10 May 2026
// Bi-monthly, telescopic. NO fixed charges from 2026.

const TIER_LIMIT = 500;  // bi-monthly threshold

// TIER 1 — consumption ≤ 500 units bi-monthly → 200 units free
const TIER1_SLABS = [
  { label: "1 – 200 (Free)",  max: 200,      rate: 0.00 },
  { label: "201 – 400",        max: 400,      rate: 4.70 },
  { label: "401 – 500",        max: 500,      rate: 6.30 },
];

// TIER 2 — consumption > 500 units bi-monthly → only 100 units free
const TIER2_SLABS = [
  { label: "1 – 100 (Free)",  max: 100,      rate: 0.00  },
  { label: "101 – 400",        max: 400,      rate: 4.70  },
  { label: "401 – 500",        max: 500,      rate: 6.30  },
  { label: "501 – 600",        max: 600,      rate: 8.40  },
  { label: "601 – 800",        max: 800,      rate: 9.45  },
  { label: "801 – 1000",       max: 1000,     rate: 10.50 },
  { label: "Above 1000",       max: Infinity, rate: 11.55 },
];

// ---- CORE CALCULATION (No Fixed Charges) ----
function calcBill(unitsInput, billingPeriod) {
  // If monthly input, double it for bi-monthly slab evaluation
  const bimonthlyUnits = billingPeriod === "monthly" ? unitsInput * 2 : unitsInput;

  const tier      = bimonthlyUnits > TIER_LIMIT ? 2 : 1;
  const slabs     = tier === 1 ? TIER1_SLABS : TIER2_SLABS;
  const freeUnits = tier === 1 ? 200 : 100;

  let energyCharge = 0;
  let remaining    = bimonthlyUnits;
  let prevMax      = 0;
  const slabDetails = [];

  for (const slab of slabs) {
    if (remaining <= 0) break;
    const slabSize    = Math.min(slab.max === Infinity ? bimonthlyUnits : slab.max, bimonthlyUnits) - prevMax;
    const unitsInSlab = Math.max(0, Math.min(remaining, slabSize));
    const charge      = unitsInSlab * slab.rate;
    energyCharge     += charge;
    slabDetails.push({ label: slab.label, units: unitsInSlab, rate: slab.rate, charge, isFree: slab.rate === 0 });
    remaining -= unitsInSlab;
    prevMax    = slab.max === Infinity ? bimonthlyUnits : Math.min(slab.max, bimonthlyUnits);
  }

  const divisor     = billingPeriod === "monthly" ? 2 : 1;
  const periodLabel = billingPeriod === "monthly" ? "Monthly" : "Bi-Monthly";

  return {
    bimonthlyUnits,
    inputUnits: unitsInput,
    tier,
    freeUnits,
    slabDetails,
    energyCharge,
    displayEnergy: (energyCharge / divisor).toFixed(2),
    displayTotal:  (energyCharge / divisor).toFixed(2),   // No fixed charges
    periodLabel,
    billingPeriod
  };
}

// ---- DISPLAY RESULTS ----
const resultSection     = document.getElementById("resultSection");
const totalAmountEl     = document.getElementById("totalAmount");
const resultUnitsInfoEl = document.getElementById("resultUnitsInfo");
const breakdownTableEl  = document.getElementById("breakdownTable");
const slabTableEl       = document.getElementById("slabTable");

function showResult(result) {
  resultSection.style.display = "block";
  resultSection.scrollIntoView({ behavior: "smooth", block: "start" });

  totalAmountEl.textContent = "₹ " + Number(result.displayTotal).toLocaleString("en-IN", { minimumFractionDigits: 2 });

  const tierText = lang === "en"
    ? `Tier ${result.tier} consumer · ${result.bimonthlyUnits} units/bi-month · ${result.freeUnits} units FREE · No Fixed Charges`
    : `நிலை ${result.tier} நுகர்வோர் · ${result.bimonthlyUnits} அலகுகள்/இருமாதம் · ${result.freeUnits} அலகுகள் இலவசம் · நிலையான கட்டணம் இல்லை`;
  resultUnitsInfoEl.textContent = tierText;

  // Breakdown rows — energy only, no fixed charges row
  const rows = [
    {
      label: lang === "en" ? "Energy Charges (Slab-wise)" : "ஆற்றல் கட்டணங்கள் (தொகுப்பு வாரியான)",
      val:   "₹ " + Number(result.displayEnergy).toLocaleString("en-IN", { minimumFractionDigits: 2 })
    },
    {
      label: lang === "en" ? "Fixed Charges" : "நிலையான கட்டணங்கள்",
      val:   lang === "en" ? "₹ 0 (Not Applicable from 2026)" : "₹ 0 (2026 முதல் பொருந்தாது)",
      isNil: true
    },
    {
      label: lang === "en"
        ? `TOTAL PAYABLE (${result.periodLabel})`
        : `மொத்தம் செலுத்த வேண்டியது (${result.periodLabel === "Monthly" ? "மாதாந்திர" : "இருமாதம்"})`,
      val: "₹ " + Number(result.displayTotal).toLocaleString("en-IN", { minimumFractionDigits: 2 }),
      isTotal: true
    }
  ];

  breakdownTableEl.innerHTML = rows.map(r => `
    <div class="breakdown-row ${r.isTotal ? "total-row" : ""} ${r.isNil ? "nil-row" : ""}">
      <span class="row-label">${r.label}</span>
      <span class="row-val">${r.val}</span>
    </div>
  `).join("");

  // Slab breakdown
  const divisor = result.billingPeriod === "monthly" ? 2 : 1;

  slabTableEl.innerHTML = result.slabDetails.map(s => {
    const displayCharge = (s.charge / divisor).toFixed(2);
    const chargeStr = s.isFree
      ? (lang === "en" ? "FREE" : "இலவசம்")
      : "₹ " + Number(displayCharge).toLocaleString("en-IN", { minimumFractionDigits: 2 });
    const unitsDisplay = Math.round(s.units / divisor);
    return `
      <div class="slab-row ${s.isFree ? "free-row" : ""}">
        <span class="row-label">${s.label} &nbsp;(${unitsDisplay} ${lang === "en" ? "units" : "அலகுகள்"} × ₹${s.rate.toFixed(2)})</span>
        <span class="row-val">${chargeStr}</span>
      </div>
    `;
  }).join("");
}

function hideResult() {
  resultSection.style.display = "none";
}

// ---- CALCULATE — MODE 1 ----
document.getElementById("calcBtn1").addEventListener("click", () => {
  const err  = document.getElementById("err1");
  err.textContent = "";
  const prev = parseFloat(prevReading.value);
  const curr = parseFloat(currReading.value);
  if (isNaN(prev) || isNaN(curr)) {
    err.textContent = lang === "en"
      ? "⚠️ Please enter both previous and current meter readings."
      : "⚠️ முந்தைய மற்றும் தற்போதைய மீட்டர் அளவீடுகளை உள்ளிடுங்கள்.";
    return;
  }
  if (curr < prev) {
    err.textContent = lang === "en"
      ? "⚠️ Current reading must be greater than previous reading."
      : "⚠️ தற்போதைய அளவீடு முந்தைய அளவீட்டை விட அதிகமாக இருக்க வேண்டும்.";
    return;
  }
  const units  = curr - prev;
  const period = document.getElementById("billing1").value;
  showResult(calcBill(units, period));
});

// ---- CALCULATE — MODE 2 ----
document.getElementById("calcBtn2").addEventListener("click", () => {
  const err   = document.getElementById("err2");
  err.textContent = "";
  const units = parseFloat(document.getElementById("directUnits").value);
  if (isNaN(units) || units < 0) {
    err.textContent = lang === "en"
      ? "⚠️ Please enter a valid number of units consumed."
      : "⚠️ செல்லுபடியாகும் அலகுகளின் எண்ணிக்கையை உள்ளிடுங்கள்.";
    return;
  }
  const period = document.getElementById("billing2").value;
  showResult(calcBill(units, period));
});

// ---- RESET ----
document.getElementById("resetBtn").addEventListener("click", () => {
  hideResult();
  [prevReading, currReading, document.getElementById("directUnits")].forEach(i => { if (i) i.value = ""; });
  unitsPreview1.style.display = "none";
  document.getElementById("err1").textContent = "";
  document.getElementById("err2").textContent = "";
  document.querySelector(".mode-tabs").scrollIntoView({ behavior: "smooth", block: "start" });
});

// ---- ENTER KEY ----
document.addEventListener("keydown", e => {
  if (e.key !== "Enter") return;
  if (mode1.classList.contains("active")) document.getElementById("calcBtn1").click();
  else document.getElementById("calcBtn2").click();
});

// ---- INIT ----
applyLanguage();
