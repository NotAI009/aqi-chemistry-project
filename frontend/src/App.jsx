import { useState } from "react";
import { motion } from "framer-motion";
import Papa from "papaparse";
import { API_BASE } from "./api";


import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";

// register chart.js pieces
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend
);

// tabs for the main content
const TABS = [
  { id: "overview", label: "Overview" },
  { id: "chemistry", label: "Chemistry of Pollutants" },
  { id: "charts", label: "City & Charts" },
  { id: "health", label: "Health & AQI Categories" },
  { id: "data", label: "Data Explorer" },
];

function App() {
  const [activeTab, setActiveTab] = useState("overview");

  // calculator state
  const [form, setForm] = useState({
    pm25: "",
    pm10: "",
    so2: "",
    no2: "",
    co: "",
    o3: "",
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [calcError, setCalcError] = useState("");

  // CSV / data state
  const [csvData, setCsvData] = useState([]);
  const [csvError, setCsvError] = useState("");

  // ---------------- FORM HANDLERS ----------------
  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setCalcError("");
    setResult(null);

    try {
      const payload = {
        pm25: parseFloat(form.pm25) || 0,
        pm10: parseFloat(form.pm10) || 0,
        so2: parseFloat(form.so2) || 0,
        no2: parseFloat(form.no2) || 0,
        co: parseFloat(form.co) || 0,
        o3: parseFloat(form.o3) || 0,
      };

     const res = await fetch(`${API_BASE}/api/calc-aqi`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});

      if (!res.ok) throw new Error("Backend error");
      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error(err);
      setCalcError("Failed to calculate AQI. Is the FastAPI backend running?");
    } finally {
      setLoading(false);
    }
  };

  // ---------------- CSV HANDLER ----------------
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvError("");

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (!results.data || results.data.length === 0) {
          setCsvError("CSV is empty or invalid.");
          setCsvData([]);
          return;
        }
        setCsvData(results.data);
      },
      error: () => {
        setCsvError("Could not read CSV file.");
        setCsvData([]);
      },
    });
  };

  // --------------- CHART DATA FROM FORM ---------------
  const pollutantLabels = ["PM2.5", "PM10", "SO₂", "NO₂", "CO", "O₃"];
  const pollutantValues = [
    parseFloat(form.pm25) || 0,
    parseFloat(form.pm10) || 0,
    parseFloat(form.so2) || 0,
    parseFloat(form.no2) || 0,
    parseFloat(form.co) || 0,
    parseFloat(form.o3) || 0,
  ];

  const pollutantChartData = {
    labels: pollutantLabels,
    datasets: [
      {
        label: "Concentration",
        data: pollutantValues,
        backgroundColor: "rgba(56, 189, 248, 0.5)",
        borderColor: "rgb(56, 189, 248)",
        borderWidth: 1,
      },
    ],
  };

  // --------------- CHART DATA FROM CSV ---------------
  const aqiLineData =
    csvData.length > 0
      ? {
          labels: csvData.map((r, i) => r.date || `Reading ${i + 1}`),
          datasets: [
            {
              label: "AQI",
              data: csvData.map((r) => r.AQI ?? r.aqi ?? 0),
              borderColor: "rgb(129, 140, 248)",
              backgroundColor: "rgba(129, 140, 248, 0.3)",
              tension: 0.2,
            },
          ],
        }
      : null;

  const pollutantKeys = ["PM2_5", "PM10", "NO2", "SO2", "O3", "CO"];
  const pollutantMeans =
    csvData.length > 0
      ? pollutantKeys.map((key) => {
          const vals = csvData
            .map((row) => row[key])
            .filter(
              (v) => typeof v === "number" && !Number.isNaN(v)
            );
          if (!vals.length) return 0;
          return vals.reduce((a, b) => a + b, 0) / vals.length;
        })
      : [];

  const pollutantMeanData =
    csvData.length > 0
      ? {
          labels: pollutantKeys,
          datasets: [
            {
              label: "Mean concentration (CSV)",
              data: pollutantMeans,
              backgroundColor: "rgba(45, 212, 191, 0.5)",
              borderColor: "rgb(45, 212, 191)",
              borderWidth: 1,
            },
          ],
        }
      : null;

  const getBadgeColor = (category) => {
    const map = {
      Good: "bg-green-500",
      Satisfactory: "bg-lime-500",
      Moderate: "bg-yellow-400",
      Poor: "bg-orange-500",
      "Very Poor": "bg-red-600",
      Severe: "bg-purple-700",
    };
    return map[category] || "bg-slate-700";
  };

  // --------------- LAYOUT ---------------
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="flex max-w-7xl mx-auto">
        {/* SIDEBAR (like Streamlit Controls) */}
        <motion.aside
          initial={{ x: -16, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="hidden lg:flex flex-col w-64 shrink-0 border-r border-slate-800 bg-slate-950/80 backdrop-blur-sm px-4 py-5 gap-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-2xl bg-cyan-400 flex items-center justify-center font-black text-slate-950 text-xs shadow-lg shadow-cyan-400/40">
              AQI
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-300">
                Controls
              </p>
              <p className="text-xs text-slate-300">
                Dataset & input settings
              </p>
            </div>
          </div>

          <div className="text-[11px] text-slate-300 space-y-1">
            <p className="font-semibold text-slate-100">Upload AQI CSV</p>
              <p className="text-slate-400">
    Upload the AQI dataset in CSV format with columns{" "}
    <code>AQI, PM2_5, PM10, NO2, SO2, O3, CO, date</code>.
  </p>

            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="mt-1 text-[11px] file:mr-3 file:px-3 file:py-1.5 file:rounded-full file:border-0 file:bg-cyan-500 file:text-slate-950 file:text-[11px] file:font-semibold hover:file:bg-cyan-400"
            />
            {csvError && (
              <p className="mt-1 text-[11px] text-red-400">
                {csvError}
              </p>
            )}
            {!csvError && csvData.length > 0 && (
              <p className="mt-1 text-[11px] text-emerald-300">
                Loaded {csvData.length} rows.
              </p>
            )}
          </div>

          <div className="mt-3 text-[11px] text-slate-300 space-y-2">
            <p className="font-semibold text-slate-100">
              Chemistry perspective
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>Combustion → SO₂, NOₓ, CO, PM</li>
              <li>Atmospheric oxidation → acids & O₃</li>
              <li>Particles carry toxic metals & organics</li>
            </ul>
          </div>

          <div className="mt-auto text-[11px] text-slate-500">
            <p>Frontend: React + Tailwind</p>
            <p>Backend: FastAPI (Python)</p>
          </div>
        </motion.aside>

        {/* MAIN AREA */}
        <div className="flex-1 px-4 md:px-6 py-5 md:py-6 space-y-5">
          {/* top nav */}
          <motion.nav
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3">
              <div className="lg:hidden h-8 w-8 rounded-2xl bg-cyan-400 flex items-center justify-center font-black text-slate-950 text-xs shadow-lg shadow-cyan-400/40">
                AQI
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-300">
                  AQI Intelligence
                </p>
                <p className="font-semibold text-lg leading-tight">
                  Environmental Chemistry Dashboard
                </p>
              </div>
            </div>

            <div className="hidden md:flex bg-slate-900/70 rounded-full border border-slate-700 p-1">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-1.5 text-[11px] rounded-full font-medium transition ${
                    activeTab === tab.id
                      ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-400/30"
                      : "text-slate-300 hover:bg-slate-800/80"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </motion.nav>

          {/* mobile tab bar */}
          <div className="md:hidden flex gap-2">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-3 py-1.5 text-[11px] rounded-full border ${
                  activeTab === tab.id
                    ? "bg-cyan-500 text-slate-950 border-cyan-400"
                    : "bg-slate-900/80 border-slate-700 text-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* HERO / TITLE */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900/80 border border-slate-700 rounded-2xl p-4 md:p-6 shadow-[0_18px_45px_rgba(15,23,42,0.9)]"
          >
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              AQI Analysis Dashboard –{" "}
              <span className="text-cyan-400">
                Environmental Chemistry Focus
              </span>
            </h1>

            <div className="flex flex-wrap gap-2 mt-3 text-[11px]">
              <span className="px-3 py-1 rounded-full border border-cyan-400/70 bg-cyan-400/10 text-cyan-100 font-medium">
                Air Pollution Chemistry
              </span>
              <span className="px-3 py-1 rounded-full border border-emerald-400/70 bg-emerald-400/10 text-emerald-100 font-medium">
                Atmospheric Reactions
              </span>
              <span className="px-3 py-1 rounded-full border border-sky-400/70 bg-sky-400/10 text-sky-100 font-medium">
                Health & Environment
              </span>
            </div>

            <p className="mt-3 text-xs md:text-sm text-slate-300 max-w-2xl">
              Connects AQI numbers with{" "}
              <b>combustion chemistry, photochemical smog, acid rain</b> and{" "}
              <b>particulate pollution</b>, powered by a Python FastAPI backend
              and a modern React interface.
            </p>
          </motion.section>

          {/* MAIN CONTENT (tabs) */}
          <motion.main
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            {activeTab === "overview" && (
              <OverviewTab
                form={form}
                handleChange={handleChange}
                handleSubmit={handleSubmit}
                loading={loading}
                error={calcError}
                result={result}
                getBadgeColor={getBadgeColor}
                pollutantChartData={pollutantChartData}
              />
            )}

            {activeTab === "chemistry" && <ChemistryTab />}

            {activeTab === "charts" && (
              <ChartsTab
                csvData={csvData}
                aqiLineData={aqiLineData}
                pollutantMeanData={pollutantMeanData}
              />
            )}

            {activeTab === "health" && <HealthTab />}

            {activeTab === "data" && (
              <DataTab csvData={csvData} handleFileUpload={handleFileUpload} />
            )}
          </motion.main>

          {/* FOOTER */}
          <footer className="pt-4 border-t border-slate-800 text-[11px] text-slate-500 text-center">
            Built with <span className="text-cyan-300">Python (FastAPI)</span> +
            <span className="text-cyan-300"> React & Tailwind</span> for AQI and
            atmospheric chemistry analysis.
          </footer>
        </div>
      </div>
    </div>
  );
}

/* =============== OVERVIEW TAB =============== */

function OverviewTab({
  form,
  handleChange,
  handleSubmit,
  loading,
  error,
  result,
  getBadgeColor,
  pollutantChartData,
}) {
  return (
    <div className="grid xl:grid-cols-2 gap-5 items-start">
      {/* LEFT: calculator */}
      <section className="bg-slate-900/80 border border-slate-700 rounded-2xl p-5 shadow-xl">
        <h2 className="text-lg font-semibold mb-1">AQI Calculator</h2>
        <p className="text-xs text-slate-400 mb-4">
          Enter pollutant concentrations (µg/m³, CO in mg/m³ approx). Backend
          returns AQI, category and a chemistry explanation.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[
              { name: "pm25", label: "PM₂.₅" },
              { name: "pm10", label: "PM₁₀" },
              { name: "so2", label: "SO₂" },
              { name: "no2", label: "NO₂" },
              { name: "co", label: "CO" },
              { name: "o3", label: "O₃" },
            ].map((field) => (
              <div key={field.name} className="space-y-1">
                <label className="block text-[11px] text-slate-300">
                  {field.label}
                </label>
                <input
                  type="number"
                  step="0.01"
                  name={field.name}
                  value={form[field.name]}
                  onChange={handleChange}
                  className="w-full rounded-lg bg-slate-800 border border-slate-600 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-400"
                />
              </div>
            ))}
          </div>

          {error && (
            <p className="text-xs text-red-300 bg-red-900/40 border border-red-700 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-1 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 disabled:cursor-not-allowed py-2.5 text-sm font-semibold shadow-lg shadow-cyan-500/30 transition"
          >
            {loading ? "Calculating..." : "Calculate AQI"}
          </button>
        </form>
      </section>

      {/* RIGHT: result + chart */}
      <section className="space-y-4">
        <div className="bg-slate-900/80 border border-slate-700 rounded-2xl p-5 shadow-xl">
          <h2 className="text-lg font-semibold mb-3">Snapshot</h2>

          {!result && (
            <p className="text-sm text-slate-300">
              Run a calculation to see AQI, category and a chemistry summary.
            </p>
          )}

          {result && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase text-slate-400">AQI</p>
                  <p className="text-4xl font-bold">{result.aqi}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] uppercase text-slate-400">
                    Category
                  </p>
                  <span
                    className={
                      "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold " +
                      getBadgeColor(result.category)
                    }
                  >
                    {result.category}
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-700 pt-3">
                <p className="text-[11px] uppercase text-slate-400 mb-1">
                  Dominant pollutant
                </p>
                <p className="text-xs md:text-sm font-medium">
                  {result.dominant_pollutant}
                </p>
              </div>

              <div className="border-t border-slate-700 pt-3">
                <p className="text-[11px] uppercase text-slate-400 mb-1">
                  Chemistry insight
                </p>
                <p className="text-xs md:text-sm text-slate-200 leading-relaxed whitespace-pre-line">
                  {result.chemistry_note}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-slate-900/70 border border-slate-700 rounded-2xl p-5 shadow-lg">
          <h3 className="text-sm font-semibold mb-2">
            Pollutant profile for this reading
          </h3>
          <p className="text-[11px] text-slate-400 mb-2">
            Tallest bar = dominant pollutant. (SO₂, NO₂, CO), secondary aerosol formation (sulfates,
            nitrates) or smog (O₃).
          </p>
          <Bar
            data={pollutantChartData}
            options={{
              responsive: true,
              plugins: {
                legend: { labels: { color: "#e5e7eb", font: { size: 10 } } },
              },
              scales: {
                x: {
                  ticks: { color: "#9ca3af", font: { size: 9 } },
                  grid: { color: "rgba(75,85,99,0.3)" },
                },
                y: {
                  ticks: { color: "#9ca3af", font: { size: 9 } },
                  grid: { color: "rgba(75,85,99,0.25)" },
                },
              },
            }}
          />
        </div>
      </section>
    </div>
  );
}

/* =============== CHEMISTRY TAB =============== */

function ChemistryTab() {
  return (
    <section className="bg-slate-900/80 border border-slate-700 rounded-2xl p-5 shadow-xl space-y-3 text-xs md:text-sm text-slate-200">
      <h2 className="text-lg font-semibold mb-1">
        Chemistry of Major AQI Pollutants
      </h2>
      <p className="text-slate-300">
  
      </p>

      <ul className="space-y-3">
        <li>
          <span className="font-semibold text-cyan-300">
            SO₂ → H₂SO₄ (acid rain):
          </span>{" "}
          SO₂ from coal / fuel combustion oxidises:
          <br />
          2 SO₂ + O₂ → 2 SO₃
          <br />
          SO₃ + H₂O → H₂SO₄
          <br />
          Acidic droplets in rain corrode buildings, metals and damage leaves.
        </li>
        <li>
          <span className="font-semibold text-cyan-300">
            NO₂ & VOCs → O₃ (photochemical smog):
          </span>{" "}
          NO₂ absorbs sunlight:
          <br />
          NO₂ + hν → NO + O·
          <br />
          O· + O₂ → O₃
          <br />
          In presence of VOCs this leads to brownish photochemical smog; O₃ is a
          strong oxidant that irritates lungs.
        </li>
        <li>
          <span className="font-semibold text-cyan-300">
            PM₂.₅ & PM₁₀ (particulate matter):
          </span>{" "}
          Complex mixture of sulfates, nitrates, carbon and metals. PM₂.₅
          penetrates deep into alveoli and can enter bloodstream; acts as a
          carrier for toxic chemicals.
        </li>
        <li>
          <span className="font-semibold text-cyan-300">
            CO (carbon monoxide):
          </span>{" "}
          Produced by incomplete combustion. Forms carboxyhaemoglobin
          (HbCO) with blood, reducing oxygen transport; high levels cause
          headache, dizziness and can be fatal.
        </li>
        <li>
          <span className="font-semibold text-cyan-300">
            Primary vs secondary pollutants:
          </span>{" "}
          Primary: emitted directly (SO₂, NO, CO, PM). Secondary: formed in
          atmosphere (O₃, PAN, acids, some PM).
        </li>
      </ul>
    </section>
  );
}

/* =============== CHARTS / CITY TAB =============== */

function ChartsTab({ csvData, aqiLineData, pollutantMeanData }) {
  return (
    <div className="space-y-5">
      {csvData.length === 0 && (
        <p className="text-xs md:text-sm text-slate-300">
          Upload a CSV from the sidebar to unlock time-series and composition
          charts.
        </p>
      )}

      {csvData.length > 0 && (
        <div className="grid lg:grid-cols-2 gap-5">
          <section className="bg-slate-900/80 border border-slate-700 rounded-2xl p-5 shadow-xl">
            <h3 className="text-sm font-semibold mb-2">
              AQI time series (all rows)
            </h3>
            {aqiLineData ? (
              <Line
                data={aqiLineData}
                options={{
                  responsive: true,
                  plugins: {
                    legend: { labels: { color: "#e5e7eb", font: { size: 10 } } },
                  },
                  scales: {
                    x: {
                      ticks: { color: "#9ca3af", font: { size: 8 } },
                      grid: { color: "rgba(75,85,99,0.25)" },
                    },
                    y: {
                      ticks: { color: "#9ca3af", font: { size: 9 } },
                      grid: { color: "rgba(75,85,99,0.25)" },
                    },
                  },
                }}
              />
            ) : (
              <p className="text-xs text-slate-400">
                No AQI column detected (expects “AQI” or “aqi”).
              </p>
            )}
          </section>

          <section className="bg-slate-900/80 border border-slate-700 rounded-2xl p-5 shadow-xl">
            <h3 className="text-sm font-semibold mb-2">
              Average pollutant composition (from CSV)
            </h3>
            {pollutantMeanData ? (
              <Bar
                data={pollutantMeanData}
                options={{
                  responsive: true,
                  plugins: {
                    legend: { labels: { color: "#e5e7eb", font: { size: 10 } } },
                  },
                  scales: {
                    x: {
                      ticks: { color: "#9ca3af", font: { size: 10 } },
                      grid: { color: "rgba(75,85,99,0.25)" },
                    },
                    y: {
                      ticks: { color: "#9ca3af", font: { size: 9 } },
                      grid: { color: "rgba(75,85,99,0.25)" },
                    },
                  },
                }}
              />
            ) : (
              <p className="text-xs text-slate-400">
                CSV missing pollutant columns (PM2_5, PM10, NO2, SO2, O3, CO).
              </p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

/* =============== HEALTH TAB =============== */

function HealthTab() {
  const categories = [
    {
      range: "0 – 50",
      label: "Good",
      desc: "Clean air, only background levels of pollutants. Suitable for outdoor activity for all groups.",
      color: "bg-emerald-500/20 border-emerald-500",
    },
    {
      range: "51 – 100",
      label: "Moderate",
      desc: "Some buildup of NO₂ and PM. Sensitive groups may feel mild irritation.",
      color: "bg-yellow-500/20 border-yellow-500",
    },
    {
      range: "101 – 200",
      label: "Unhealthy (Sensitive)",
      desc: "Higher PM₂.₅ / PM₁₀ and acidic / oxidizing species. Asthmatics and heart patients at risk.",
      color: "bg-orange-500/20 border-orange-500",
    },
    {
      range: "201 – 300",
      label: "Very Unhealthy",
      desc: "Strong smog, high oxidants and acids. Everyone may experience health effects.",
      color: "bg-red-500/20 border-red-500",
    },
    {
      range: "300+",
      label: "Hazardous",
      desc: "Severe pollution episodes. Schools should be closed; emergency health advisories.",
      color: "bg-purple-500/20 border-purple-500",
    },
  ];

  return (
    <section className="bg-slate-900/80 border border-slate-700 rounded-2xl p-5 shadow-xl space-y-4">
      <h2 className="text-lg font-semibold">AQI Categories & Health Effects</h2>
      <p className="text-xs md:text-sm text-slate-300">
       “AQI compresses concentrations of PM, SO₂, NO₂, CO and
        O₃ into a single scale that directly relates to health impact.”
      </p>

      <div className="grid md:grid-cols-3 gap-3">
        {categories.map((cat) => (
          <div
            key={cat.label}
            className={`rounded-xl border px-3 py-3 text-xs md:text-sm ${cat.color}`}
          >
            <p className="text-[11px] uppercase tracking-wide text-slate-100">
              {cat.range}
            </p>
            <p className="font-semibold text-slate-50">{cat.label}</p>
            <p className="mt-1 text-slate-100 text-[11px] md:text-xs">
              {cat.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* =============== DATA TAB =============== */

function DataTab({ csvData, handleFileUpload }) {
  const headers =
    csvData.length > 0 ? Object.keys(csvData[0]) : ["No data loaded"];

  return (
    <div className="space-y-4">
      <section className="bg-slate-900/80 border border-slate-700 rounded-2xl p-5 shadow-xl">
        <h2 className="text-lg font-semibold mb-1">Raw Data Explorer</h2>
        <p className="text-xs text-slate-300 mb-2">
          “We used a React-based data explorer to inspect and verify the AQI dataset.”
        </p>
        <p className="text-[11px] text-slate-400 mb-2">
          You can re-upload a CSV here if you want to test a different file.
        </p>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          className="text-xs file:mr-3 file:px-3 file:py-1.5 file:rounded-full file:border-0 file:bg-cyan-500 file:text-slate-950 file:text-xs file:font-semibold hover:file:bg-cyan-400"
        />
      </section>

      {csvData.length === 0 ? (
        <p className="text-xs md:text-sm text-slate-300">
          Upload a CSV from here or from the sidebar to explore the table.
        </p>
      ) : (
        <section className="bg-slate-900/90 border border-slate-700 rounded-2xl p-4 shadow-xl overflow-auto">
          <table className="min-w-full text-[11px] md:text-xs border-collapse">
            <thead>
              <tr className="bg-slate-800/90">
                {headers.map((h) => (
                  <th
                    key={h}
                    className="border-b border-slate-700 px-2 py-2 text-left font-semibold"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {csvData.slice(0, 80).map((row, idx) => (
                <tr
                  key={idx}
                  className={idx % 2 === 0 ? "bg-slate-900" : "bg-slate-950"}
                >
                  {headers.map((h) => (
                    <td
                      key={h}
                      className="border-b border-slate-800 px-2 py-1"
                    >
                      {String(row[h] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-[10px] text-slate-500">
            Showing first 80 rows for performance.
          </p>
        </section>
      )}
    </div>
  );
}

export default App;
