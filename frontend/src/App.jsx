import { useEffect, useMemo, useState } from "react";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const STORAGE_KEY = "fraud-dashboard-datasets";
const ACTIVE_DATASET_KEY = "fraud-dashboard-active-dataset";

export default function App() {
  // Main dataset storage for uploaded CSV results
  const [datasets, setDatasets] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Tracks which uploaded dataset tab is currently active
  const [activeDatasetId, setActiveDatasetId] = useState(() => {
    try {
      return localStorage.getItem(ACTIVE_DATASET_KEY);
    } catch {
      return null;
    }
  });

  // Basic UI state for errors, selected file, and upload in progress
  const [error, setError] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Backend / model info used to prove which model is active
  const [modelInfo, setModelInfo] = useState(null);
  const [modelInfoError, setModelInfoError] = useState("");

  // Human-readable status shown in the model proof section
  const [analysisStatus, setAnalysisStatus] = useState("Waiting for upload");

  // Loading overlay state
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(false);
  const [analysisFinished, setAnalysisFinished] = useState(false);

  // Messages shown in the loading overlay so the user can see what is happening
  const loadingSteps = [
    "Connecting to backend...",
    "Uploading CSV...",
    "Reading transaction data...",
    "Preparing model input...",
    "Running fraud detection model...",
    "Calculating fraud probabilities...",
    "Building dashboard results...",
  ];

  // Controls which sections can be minimized / expanded
  const [collapsedSections, setCollapsedSections] = useState({
    upload: false,
    modelStatus: false,
    metricsRow: false,
    transactionsByState: false,
    fraudByLocation: false,
    fraudVsNonFraud: false,
    transactionsByDevice: false,
    highRiskTransactions: false,
    transactionsTable: false,
  });

  // Pagination state for the main transactions table
  const [page, setPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const pageSize = 30;

  // Loads the Cabin font once when the component first mounts
  useEffect(() => {
    const existingLink = document.getElementById("cabin-font-link");

    if (!existingLink) {
      const link = document.createElement("link");
      link.id = "cabin-font-link";
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Cabin:wght@400;500;600;700&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  // Saves uploaded datasets into localStorage so they stay after refresh
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(datasets));
    } catch {
      // ignore storage errors
    }
  }, [datasets]);

  // Saves the current active tab into localStorage
  useEffect(() => {
    try {
      if (activeDatasetId) {
        localStorage.setItem(ACTIVE_DATASET_KEY, activeDatasetId);
      } else {
        localStorage.removeItem(ACTIVE_DATASET_KEY);
      }
    } catch {
      // ignore storage errors
    }
  }, [activeDatasetId]);

  // Keeps the active dataset valid if a tab is removed
  useEffect(() => {
    if (datasets.length > 0 && !datasets.some((d) => d.id === activeDatasetId)) {
      setActiveDatasetId(datasets[0].id);
    }
    if (datasets.length === 0 && activeDatasetId) {
      setActiveDatasetId(null);
    }
  }, [datasets, activeDatasetId]);

  // Fetches model info from the backend once on page load
  useEffect(() => {
    fetchModelInfo();
  }, []);

  // Advances the loading overlay step-by-step while upload/analysis is running
  useEffect(() => {
    if (!showLoadingOverlay || analysisFinished) return;

    setLoadingStepIndex(0);

    const interval = setInterval(() => {
      setLoadingStepIndex((prev) => {
        if (prev >= loadingSteps.length - 1) return prev;
        return prev + 1;
      });
    }, 1400);

    return () => clearInterval(interval);
  }, [showLoadingOverlay, analysisFinished]);

  // Calls the backend to confirm which model is active and whether it exists
  async function fetchModelInfo() {
    try {
      setModelInfoError("");
      const res = await fetch(`${API_BASE_URL}/model/info`);

      if (!res.ok) {
        throw new Error("Could not load model info.");
      }

      const data = await res.json();
      setModelInfo(data);
    } catch (e) {
      setModelInfo(null);
      setModelInfoError(e.message || "Could not load model info.");
    }
  }

  // Toggles minimize / expand on dashboard sections
  function toggleSection(sectionKey) {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  }

  // Converts timestamps into milliseconds for sorting
  function tsToMillis(ts) {
    if (!ts) return 0;

    const cleaned = String(ts).trim();
    const isoLike = cleaned.includes("T") ? cleaned : cleaned.replace(" ", "T");
    const ms = Date.parse(isoLike);
    return Number.isNaN(ms) ? 0 : ms;
  }

  // Formats a timestamp as MM/DD/YYYY
  function formatDateMDY(ts) {
    const ms = tsToMillis(ts);
    if (!ms) return "";
    const d = new Date(ms);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  }

  // Formats a timestamp as 12-hour time with AM/PM
  function formatTimeAMPM(ts) {
    const ms = tsToMillis(ts);
    if (!ms) return "";
    const d = new Date(ms);

    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";

    hours = hours % 12;
    if (hours === 0) hours = 12;

    return `${hours}:${minutes} ${ampm}`;
  }

  // Formats currency values nicely for display
  function formatAmount(value) {
    const num = Number(value);
    if (Number.isNaN(num)) return "";
    return `$${num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  // Creates the name shown on each uploaded file tab
  function createDatasetName(fileName) {
    const now = new Date();
    const timeLabel = now.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
    return `${fileName} • ${timeLabel}`;
  }

  // Switches to another uploaded dataset tab
  function switchDataset(datasetId) {
    setActiveDatasetId(datasetId);
    setPage(1);
    setPageInput("1");
    setError("");
    setAnalysisStatus("Viewing saved analysis");
  }

  // Removes an uploaded dataset tab
  function removeDataset(datasetId) {
    setDatasets((prev) => prev.filter((dataset) => dataset.id !== datasetId));

    if (datasetId === activeDatasetId) {
      const remaining = datasets.filter((dataset) => dataset.id !== datasetId);
      setActiveDatasetId(remaining.length > 0 ? remaining[0].id : null);
      setPage(1);
      setPageInput("1");
    }
  }

  // Lets the user close the loading overlay manually after analysis finishes
  function handleContinueAfterLoading() {
    setShowLoadingOverlay(false);
    setAnalysisFinished(false);
    setLoadingStepIndex(0);
  }

  // Uploads the CSV to the backend, receives fraud predictions, and saves the results
  async function handleUpload() {
    if (!selectedFile) {
      setError("Please choose a CSV file first.");
      return;
    }

    setError("");
    setIsUploading(true);
    setShowLoadingOverlay(true);
    setAnalysisFinished(false);
    setLoadingStepIndex(0);
    setAnalysisStatus("Starting analysis...");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch(`${API_BASE_URL}/transactions/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Upload failed.");
      }

      const preparedRows = (data.rows || []).map((row, idx) => ({
        ...row,
        _rowId: idx,
        _ts: tsToMillis(row.timestamp),
      }));

      const newDataset = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: createDatasetName(selectedFile.name),
        fileName: selectedFile.name,
        uploadedAt: new Date().toLocaleString(),
        rows: preparedRows,
      };

      setDatasets((prev) => [newDataset, ...prev]);
      setActiveDatasetId(newDataset.id);
      setPage(1);
      setPageInput("1");
      setSelectedFile(null);

      setAnalysisStatus("Analysis complete — model predictions loaded");
      setAnalysisFinished(true);

      await fetchModelInfo();
    } catch (e) {
      setError(e.message || String(e));
      setAnalysisStatus("Analysis failed");
      setAnalysisFinished(true);
    } finally {
      setIsUploading(false);
    }
  }

  // Finds the currently selected dataset and its rows
  const activeDataset =
    datasets.find((dataset) => dataset.id === activeDatasetId) || null;

  const rows = activeDataset ? activeDataset.rows : [];

  // Main summary metrics for the uploaded dataset
  const totalTransactions = rows.length;
  const fraudCount = rows.filter((r) => r.predicted_is_fraud).length;
  const nonFraudCount = totalTransactions - fraudCount;
  const fraudRate = totalTransactions
    ? ((fraudCount / totalTransactions) * 100).toFixed(2)
    : "0.00";
  const totalAmount = rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  // Extra proof/insight metrics based on the model's fraud probabilities
  const averageFraudProbability = totalTransactions
    ? (
        (rows.reduce(
          (sum, r) => sum + (Number(r.predicted_probability) || 0),
          0
        ) /
          totalTransactions) *
        100
      ).toFixed(2)
    : "0.00";

  const highestFraudProbability = totalTransactions
    ? (
        Math.max(
          ...rows.map((r) => Number(r.predicted_probability) || 0),
          0
        ) * 100
      ).toFixed(2)
    : "0.00";

  const highConfidenceFraudCount = rows.filter(
    (r) => Number(r.predicted_probability) >= 0.8
  ).length;

  // Builds the "transactions by state" summary
  const transactionsByState = useMemo(() => {
    const acc = {};
    for (const r of rows) {
      const loc = r.location || "Unknown";
      acc[loc] = (acc[loc] || 0) + 1;
    }

    return Object.entries(acc)
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count);
  }, [rows]);

  // Sorts rows newest-first for the main table
  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      if (b._ts !== a._ts) return b._ts - a._ts;
      return a._rowId - b._rowId;
    });
  }, [rows]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const startIndex = (safePage - 1) * pageSize;

  const pagedRows = useMemo(() => {
    return sortedRows.slice(startIndex, startIndex + pageSize);
  }, [sortedRows, startIndex]);

  // Builds the "fraud by location" chart data
  const fraudByLocation = Object.values(
    rows
      .filter((r) => r.predicted_is_fraud)
      .reduce((acc, r) => {
        const loc = r.location || "Unknown";
        acc[loc] = acc[loc] || { location: loc, fraudCount: 0 };
        acc[loc].fraudCount += 1;
        return acc;
      }, {})
  ).sort((a, b) => b.fraudCount - a.fraudCount);

  // Builds the "transactions by device" chart data
  const transactionsByDevice = Object.values(
    rows.reduce((acc, r) => {
      const device = r.device || "Unknown";
      acc[device] = acc[device] || { device, count: 0 };
      acc[device].count += 1;
      return acc;
    }, {})
  ).sort((a, b) => b.count - a.count);

  // Data for the fraud vs non-fraud pie chart
  const pieData = [
    { name: "Fraud", value: fraudCount },
    { name: "Non-Fraud", value: nonFraudCount },
  ];

  const pieColors = ["#ef4444", "#22c55e"];

  // Finds the top 10 highest-risk transactions by fraud probability
  const highestRiskTransactions = useMemo(() => {
    return [...rows]
      .sort(
        (a, b) =>
          (Number(b.predicted_probability) || 0) -
          (Number(a.predicted_probability) || 0)
      )
      .slice(0, 10);
  }, [rows]);

  // Handles the "Go to page" control for the main table
  function handleGoToPage() {
    const requestedPage = Number(pageInput);

    if (!Number.isInteger(requestedPage) || requestedPage < 1) {
      setPageInput(String(safePage));
      return;
    }

    const boundedPage = Math.min(requestedPage, totalPages);
    setPage(boundedPage);
    setPageInput(String(boundedPage));
  }

  // Lets the user press Enter in the page input box
  function handlePageInputKeyDown(e) {
    if (e.key === "Enter") {
      handleGoToPage();
    }
  }

  // Main page-level layout styles
  const pageStyle = {
    minHeight: "100vh",
    width: "100%",
    background: "#111827",
    display: "flex",
    justifyContent: "center",
    alignItems: "stretch",
    padding: "16px",
    boxSizing: "border-box",
    fontFamily: '"Cabin", Arial, sans-serif',
    gap: 16,
    position: "relative",
  };

  // Full-screen loading overlay styles
  const loadingOverlayStyle = {
    position: "fixed",
    inset: 0,
    background: "rgba(3, 7, 18, 0.82)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    backdropFilter: "blur(4px)",
  };

  const loadingCardStyle = {
    width: "min(92vw, 620px)",
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: 18,
    padding: 26,
    color: "white",
    boxShadow: "0 20px 50px rgba(0,0,0,0.45)",
  };

  const loadingTitleStyle = {
    marginTop: 0,
    marginBottom: 8,
    fontSize: "1.6rem",
    fontWeight: 700,
  };

  const loadingSubtitleStyle = {
    marginTop: 0,
    marginBottom: 18,
    color: "#cbd5e1",
    lineHeight: 1.6,
  };

  const progressTrackStyle = {
    width: "100%",
    height: 12,
    background: "#1e293b",
    borderRadius: 999,
    overflow: "hidden",
    marginBottom: 18,
    border: "1px solid #334155",
  };

  const progressFillStyle = {
    width: `${((loadingStepIndex + 1) / loadingSteps.length) * 100}%`,
    height: "100%",
    background: "linear-gradient(90deg, #38bdf8 0%, #60a5fa 100%)",
    borderRadius: 999,
    transition: "width 0.35s ease",
  };

  const loadingStepListStyle = {
    display: "grid",
    gap: 10,
  };

  const loadingStepItemStyle = (isActive, isDone) => ({
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 12px",
    borderRadius: 10,
    background: isActive ? "#1e293b" : "rgba(255,255,255,0.02)",
    border: `1px solid ${isActive ? "#3b82f6" : "#334155"}`,
    color: isDone || isActive ? "white" : "#94a3b8",
  });

  const loadingDotStyle = (isActive, isDone) => ({
    width: 11,
    height: 11,
    borderRadius: "50%",
    background: isDone ? "#22c55e" : isActive ? "#60a5fa" : "#475569",
    flexShrink: 0,
    boxShadow: isActive ? "0 0 0 6px rgba(96,165,250,0.12)" : "none",
  });

  // Sidebar styles
  const sidebarStyle = {
    width: 220,
    minWidth: 220,
    background: "#0f172a",
    borderRadius: 16,
    padding: 14,
    boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
    color: "white",
    alignSelf: "stretch",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  };

  const sidebarTitleStyle = {
    fontSize: "1.05rem",
    fontWeight: 700,
    margin: 0,
  };

  const sidebarSubStyle = {
    margin: 0,
    color: "#cbd5e1",
    fontSize: "0.84rem",
    lineHeight: 1.45,
  };

  const datasetListStyle = {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    overflowY: "auto",
    paddingRight: 2,
  };

  const datasetTabStyle = {
    background: "#1f2937",
    color: "white",
    border: "1px solid #374151",
    borderRadius: 10,
    padding: 10,
    cursor: "pointer",
    textAlign: "left",
  };

  const activeDatasetTabStyle = {
    ...datasetTabStyle,
    border: "1px solid #60a5fa",
    background: "#1e293b",
  };

  const datasetHeaderRowStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  };

  const datasetNameStyle = {
    margin: 0,
    fontSize: "0.88rem",
    fontWeight: 600,
    lineHeight: 1.35,
    wordBreak: "break-word",
  };

  const datasetMetaStyle = {
    marginTop: 6,
    color: "#cbd5e1",
    fontSize: "0.74rem",
    lineHeight: 1.3,
    wordBreak: "break-word",
  };

  const removeTabButtonStyle = {
    background: "transparent",
    color: "#cbd5e1",
    border: "none",
    cursor: "pointer",
    fontSize: "0.95rem",
    lineHeight: 1,
    padding: 0,
  };

  const emptySidebarBoxStyle = {
    background: "#1f2937",
    borderRadius: 12,
    padding: 12,
    color: "#cbd5e1",
    fontSize: "0.84rem",
    lineHeight: 1.45,
  };

  // Main content area styles
  const contentStyle = {
    width: "100%",
    maxWidth: 1700,
    margin: "0 auto",
    padding: 20,
    color: "white",
  };

  const titleStyle = {
    marginTop: 0,
    marginBottom: 8,
    fontSize: "2.4rem",
    fontWeight: 700,
    textAlign: "center",
  };

  const subtitleStyle = {
    marginTop: 0,
    marginBottom: 28,
    color: "#cbd5e1",
    textAlign: "center",
    fontSize: "1.05rem",
  };

  const activeFileBannerStyle = {
    background: "#0f172a",
    color: "white",
    borderRadius: 14,
    padding: "12px 16px",
    marginBottom: 18,
    border: "1px solid #334155",
  };

  const metricsHeaderPanelStyle = {
    background: "#1f2937",
    color: "white",
    padding: collapsedSections.metricsRow ? "14px 18px" : "18px 22px",
    borderRadius: 14,
    marginBottom: collapsedSections.metricsRow ? 18 : 20,
    boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
  };

  const metricsRowStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
    gap: 20,
    marginBottom: 24,
  };

  const cardStyle = {
    background: "#1f2937",
    color: "white",
    padding: 22,
    borderRadius: 14,
    textAlign: "left",
    boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
    minHeight: 150,
  };

  const collapsedChipRowStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
    gap: 14,
    marginBottom: 24,
  };

  const collapsedChipStyle = {
    background: "#1f2937",
    color: "white",
    padding: "12px 14px",
    borderRadius: 12,
    textAlign: "center",
    boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
    minHeight: 64,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 600,
    fontSize: "0.95rem",
  };

  const panelStyle = {
    background: "#1f2937",
    color: "white",
    padding: 24,
    borderRadius: 14,
    marginBottom: 30,
    textAlign: "left",
    boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
  };

  const collapsedPanelStyle = {
    ...panelStyle,
    padding: "14px 18px",
    marginBottom: 22,
  };

  const lowerChartsRowStyle = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 24,
    marginBottom: 30,
    alignItems: "start",
  };

  const sectionTitleStyle = {
    marginTop: 0,
    marginBottom: 16,
    fontSize: "1.35rem",
    fontWeight: 600,
  };

  const panelHeaderStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  };

  const buttonRowStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginBottom: 12,
    flexWrap: "wrap",
  };

  const buttonStyle = {
    padding: "10px 16px",
    borderRadius: 8,
    border: "1px solid #4b5563",
    background: "#111827",
    color: "white",
    cursor: "pointer",
    fontFamily: '"Cabin", Arial, sans-serif',
    fontSize: "0.95rem",
  };

  const smallButtonStyle = {
    padding: "6px 12px",
    borderRadius: 8,
    border: "1px solid #4b5563",
    background: "#111827",
    color: "white",
    cursor: "pointer",
    fontFamily: '"Cabin", Arial, sans-serif',
    fontSize: "0.85rem",
    whiteSpace: "nowrap",
  };

  const buttonDisabledStyle = {
    ...buttonStyle,
    opacity: 0.5,
    cursor: "not-allowed",
  };

  const uploadPanelStyle = {
    background: "#1f2937",
    color: "white",
    padding: collapsedSections.upload ? "14px 18px" : 24,
    borderRadius: 14,
    marginBottom: 30,
    textAlign: "center",
    boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
  };

  const fileInputStyle = {
    marginRight: 12,
    marginBottom: 12,
    fontFamily: '"Cabin", Arial, sans-serif',
  };

  const tableWrapStyle = {
    width: "100%",
    overflowX: "visible",
    marginTop: 8,
    textAlign: "left",
  };

  const tableStyle = {
    width: "100%",
    borderCollapse: "collapse",
    background: "#111827",
    color: "white",
    borderRadius: 10,
    overflow: "hidden",
    tableLayout: "auto",
  };

  const thTdStyle = {
    borderBottom: "1px solid #374151",
    padding: "10px 8px",
    textAlign: "left",
    fontSize: "0.88rem",
    whiteSpace: "normal",
    wordBreak: "break-word",
    verticalAlign: "top",
  };

  const goToPageWrapStyle = {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    marginTop: 18,
    flexWrap: "wrap",
  };

  const pageInputStyle = {
    width: 90,
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #4b5563",
    background: "#111827",
    color: "white",
    fontFamily: '"Cabin", Arial, sans-serif',
    fontSize: "0.95rem",
  };

  // Styles for the model/proof section
  const modelGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 16,
  };

  const modelCardStyle = {
    background: "#111827",
    border: "1px solid #374151",
    borderRadius: 12,
    padding: 16,
    minHeight: 110,
  };

  const modelCardLabelStyle = {
    margin: 0,
    color: "#94a3b8",
    fontSize: "0.82rem",
    marginBottom: 8,
  };

  const modelCardValueStyle = {
    margin: 0,
    fontSize: "1.08rem",
    fontWeight: 700,
    lineHeight: 1.4,
    wordBreak: "break-word",
  };

  const proofNoteStyle = {
    marginTop: 18,
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: 12,
    padding: 16,
    color: "#dbeafe",
    lineHeight: 1.6,
  };

  return (
    <div style={pageStyle}>
      {/* Full-screen loading overlay shown while the backend is analyzing the uploaded CSV */}
      {showLoadingOverlay && (
        <div style={loadingOverlayStyle}>
          <div style={loadingCardStyle}>
            <h2 style={loadingTitleStyle}>Running Fraud Analysis</h2>
            <p style={loadingSubtitleStyle}>
              Your file is being processed by the deployed backend and the saved
              machine learning model. The dashboard will update as soon as the
              results are ready.
            </p>

            <div style={progressTrackStyle}>
              <div style={progressFillStyle}></div>
            </div>

            <div style={loadingStepListStyle}>
              {loadingSteps.map((step, index) => {
                // When finished, mark all steps up to current as complete
                const isDone = analysisFinished
                  ? index <= loadingStepIndex
                  : index < loadingStepIndex;

                // Only show active highlight while still processing
                const isActive = !analysisFinished && index === loadingStepIndex;

                return (
                  <div
                    key={step}
                    style={loadingStepItemStyle(isActive, isDone)}
                  >
                    <div style={loadingDotStyle(isActive, isDone)}></div>
                    <span>{step}</span>
                  </div>
                );
              })}
            </div>

            {/* Show final message + continue button after analysis finishes */}
            {analysisFinished && (
              <div style={{ marginTop: 20, textAlign: "center" }}>
                <p style={{ color: "#cbd5e1", marginBottom: 14, lineHeight: 1.6 }}>
                  {analysisStatus === "Analysis failed"
                    ? "The analysis stopped because an error occurred."
                    : "The model finished running. Review the results when you continue."}
                </p>

                <button
                  onClick={handleContinueAfterLoading}
                  style={{
                    padding: "10px 18px",
                    borderRadius: 8,
                    border: "1px solid #4b5563",
                    background: "#111827",
                    color: "white",
                    cursor: "pointer",
                    fontFamily: '"Cabin", Arial, sans-serif',
                    fontSize: "0.95rem",
                  }}
                >
                  Continue
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sidebar showing all uploaded dataset tabs */}
      <aside style={sidebarStyle}>
        <h2 style={sidebarTitleStyle}>Uploaded Files</h2>
        <p style={sidebarSubStyle}>
          Each CSV upload creates a new tab. Tabs stay saved after refresh on this
          browser.
        </p>

        <div style={datasetListStyle}>
          {datasets.length === 0 ? (
            <div style={emptySidebarBoxStyle}>
              No transaction files uploaded yet.
            </div>
          ) : (
            datasets.map((dataset) => (
              <div
                key={dataset.id}
                style={
                  dataset.id === activeDatasetId
                    ? activeDatasetTabStyle
                    : datasetTabStyle
                }
                onClick={() => switchDataset(dataset.id)}
              >
                <div style={datasetHeaderRowStyle}>
                  <p style={datasetNameStyle}>{dataset.name}</p>
                  <button
                    style={removeTabButtonStyle}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeDataset(dataset.id);
                    }}
                    title="Remove tab"
                  >
                    ×
                  </button>
                </div>
                <div style={datasetMetaStyle}>
                  <div>{dataset.rows.length} rows</div>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Main dashboard content */}
      <div style={contentStyle}>
        <h1 style={titleStyle}>Fraud Detection Dashboard</h1>
        <p style={subtitleStyle}>
          Upload transaction data, run fraud analysis, and review the results.
        </p>

        {activeDataset && (
          <div style={activeFileBannerStyle}>
            <strong>Current dataset:</strong> {activeDataset.fileName}
          </div>
        )}

        {/* Upload area for CSV files */}
        <div style={uploadPanelStyle}>
          <div
            style={{
              ...panelHeaderStyle,
              marginBottom: collapsedSections.upload ? 0 : 16,
            }}
          >
            <h2 style={{ ...sectionTitleStyle, marginBottom: 0 }}>
              Upload Transactions CSV
            </h2>
            <button
              onClick={() => toggleSection("upload")}
              style={smallButtonStyle}
            >
              {collapsedSections.upload ? "Expand" : "Minimize"}
            </button>
          </div>

          {!collapsedSections.upload && (
            <>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                style={fileInputStyle}
              />
              <button
                onClick={handleUpload}
                style={isUploading ? buttonDisabledStyle : buttonStyle}
                disabled={isUploading}
              >
                {isUploading ? "Uploading..." : "Upload and Analyze"}
              </button>
            </>
          )}
        </div>

        {/* Error box shown if upload or model analysis fails */}
        {error && (
          <div style={{ ...panelStyle, border: "1px solid #ef4444" }}>
            <h3 style={{ marginTop: 0 }}>Error</h3>
            <pre style={{ whiteSpace: "pre-wrap", marginBottom: 0 }}>{error}</pre>
          </div>
        )}

        {/* Shows backend/model status and proof that the model returned analysis results */}
        <div
          style={
            collapsedSections.modelStatus ? collapsedPanelStyle : panelStyle
          }
        >
          <div
            style={{
              ...panelHeaderStyle,
              marginBottom: collapsedSections.modelStatus ? 0 : 16,
            }}
          >
            <h2 style={{ ...sectionTitleStyle, marginBottom: 0 }}>
              Model Status and Proof of Analysis
            </h2>
            <button
              onClick={() => toggleSection("modelStatus")}
              style={smallButtonStyle}
            >
              {collapsedSections.modelStatus ? "Expand" : "Minimize"}
            </button>
          </div>

          {!collapsedSections.modelStatus && (
            <>
              <div style={modelGridStyle}>
                <div style={modelCardStyle}>
                  <p style={modelCardLabelStyle}>Backend Status</p>
                  <p style={modelCardValueStyle}>
                    {modelInfo?.status || (modelInfoError ? "Unavailable" : "Loading")}
                  </p>
                </div>

                <div style={modelCardStyle}>
                  <p style={modelCardLabelStyle}>Active Model</p>
                  <p style={modelCardValueStyle}>
                    {modelInfo?.active_model || "Unknown"}
                  </p>
                </div>

                <div style={modelCardStyle}>
                  <p style={modelCardLabelStyle}>Model File</p>
                  <p style={modelCardValueStyle}>
                    {modelInfo?.model_path || "Unknown"}
                  </p>
                </div>

                <div style={modelCardStyle}>
                  <p style={modelCardLabelStyle}>Model Found</p>
                  <p style={modelCardValueStyle}>
                    {modelInfo
                      ? modelInfo.model_exists
                        ? "Yes"
                        : "No"
                      : "Unknown"}
                  </p>
                </div>
              </div>

              <div style={proofNoteStyle}>
                <strong>Analysis Status:</strong> {analysisStatus}
                <br />
                <strong>Rows analyzed:</strong> {totalTransactions}
                <br />
                <strong>Fraud predictions returned:</strong> {fraudCount}
                <br />
                <strong>Average fraud probability:</strong>{" "}
                {averageFraudProbability}%
                <br />
                <strong>Highest fraud probability:</strong>{" "}
                {highestFraudProbability}%
                <br />
                <strong>High-confidence frauds (80%+):</strong>{" "}
                {highConfidenceFraudCount}
                {modelInfoError && (
                  <>
                    <br />
                    <strong>Model info error:</strong> {modelInfoError}
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* Summary metric cards */}
        <div style={metricsHeaderPanelStyle}>
          <div style={{ ...panelHeaderStyle, marginBottom: 0 }}>
            <h2 style={{ ...sectionTitleStyle, marginBottom: 0 }}>
              Key Summary Metrics
            </h2>
            <button
              onClick={() => toggleSection("metricsRow")}
              style={smallButtonStyle}
            >
              {collapsedSections.metricsRow ? "Expand" : "Minimize"}
            </button>
          </div>
        </div>

        {collapsedSections.metricsRow ? (
          <div style={collapsedChipRowStyle}>
            <div style={collapsedChipStyle}>Total Transactions</div>
            <div style={collapsedChipStyle}>Fraud Count</div>
            <div style={collapsedChipStyle}>Fraud Rate</div>
            <div style={collapsedChipStyle}>Total Amount</div>
            <div style={collapsedChipStyle}>Clear Summary</div>
          </div>
        ) : (
          <div style={metricsRowStyle}>
            <div style={cardStyle}>
              <h3 style={{ marginTop: 0 }}>Total Transactions</h3>
              <p style={{ fontSize: "1.8rem", marginBottom: 0 }}>
                {totalTransactions}
              </p>
            </div>

            <div style={cardStyle}>
              <h3 style={{ marginTop: 0 }}>Fraud Count</h3>
              <p style={{ fontSize: "1.8rem", marginBottom: 0 }}>{fraudCount}</p>
            </div>

            <div style={cardStyle}>
              <h3 style={{ marginTop: 0 }}>Fraud Rate</h3>
              <p style={{ fontSize: "1.8rem", marginBottom: 0 }}>{fraudRate}%</p>
            </div>

            <div style={cardStyle}>
              <h3 style={{ marginTop: 0 }}>Total Amount</h3>
              <p style={{ fontSize: "1.8rem", marginBottom: 0 }}>
                {formatAmount(totalAmount)}
              </p>
            </div>

            <div style={cardStyle}>
              <h3 style={{ marginTop: 0 }}>Clear Summary</h3>
              <p style={{ margin: 0, lineHeight: 1.6 }}>
                {totalTransactions === 0
                  ? "Upload a CSV to view results."
                  : `${nonFraudCount.toLocaleString()} transactions were marked non-fraud.`}
              </p>
            </div>
          </div>
        )}

        {/* Text summary for transactions by state */}
        <div
          style={
            collapsedSections.transactionsByState ? collapsedPanelStyle : panelStyle
          }
        >
          <div
            style={{
              ...panelHeaderStyle,
              marginBottom: collapsedSections.transactionsByState ? 0 : 16,
            }}
          >
            <h2 style={{ ...sectionTitleStyle, marginBottom: 0 }}>
              Transactions by State (Total)
            </h2>
            <button
              onClick={() => toggleSection("transactionsByState")}
              style={smallButtonStyle}
            >
              {collapsedSections.transactionsByState ? "Expand" : "Minimize"}
            </button>
          </div>

          {!collapsedSections.transactionsByState && (
            <p style={{ margin: 0, lineHeight: 1.7, fontSize: "1.05rem" }}>
              {transactionsByState.length === 0
                ? "No data loaded yet"
                : transactionsByState
                    .map((s) => `${s.location}: ${s.count}`)
                    .join(" | ")}
            </p>
          )}
        </div>

        {/* Bar chart showing how many frauds were found by location */}
        <div
          style={
            collapsedSections.fraudByLocation ? collapsedPanelStyle : panelStyle
          }
        >
          <div
            style={{
              ...panelHeaderStyle,
              marginBottom: collapsedSections.fraudByLocation ? 0 : 16,
            }}
          >
            <h2 style={{ ...sectionTitleStyle, marginBottom: 0 }}>
              Fraud by Location
            </h2>
            <button
              onClick={() => toggleSection("fraudByLocation")}
              style={smallButtonStyle}
            >
              {collapsedSections.fraudByLocation ? "Expand" : "Minimize"}
            </button>
          </div>

          {!collapsedSections.fraudByLocation && (
            <div style={{ width: "100%", height: 420 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={fraudByLocation}
                  margin={{ top: 10, right: 20, left: 10, bottom: 90 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="location"
                    stroke="#e5e7eb"
                    angle={-45}
                    textAnchor="end"
                    interval={0}
                    height={90}
                  />
                  <YAxis stroke="#e5e7eb" />
                  <Tooltip />
                  <Bar dataKey="fraudCount" fill="#60a5fa" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Lower row of charts: fraud split and device usage */}
        <div style={lowerChartsRowStyle}>
          <div
            style={
              collapsedSections.fraudVsNonFraud ? collapsedPanelStyle : panelStyle
            }
          >
            <div
              style={{
                ...panelHeaderStyle,
                marginBottom: collapsedSections.fraudVsNonFraud ? 0 : 16,
              }}
            >
              <h2 style={{ ...sectionTitleStyle, marginBottom: 0 }}>
                Fraud vs Non-Fraud
              </h2>
              <button
                onClick={() => toggleSection("fraudVsNonFraud")}
                style={smallButtonStyle}
              >
                {collapsedSections.fraudVsNonFraud ? "Expand" : "Minimize"}
              </button>
            </div>

            {!collapsedSections.fraudVsNonFraud && (
              <div style={{ width: "100%", height: 420 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={130}
                      dataKey="value"
                      nameKey="name"
                      label
                    >
                      {pieData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={pieColors[index % pieColors.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div
            style={
              collapsedSections.transactionsByDevice
                ? collapsedPanelStyle
                : panelStyle
            }
          >
            <div
              style={{
                ...panelHeaderStyle,
                marginBottom: collapsedSections.transactionsByDevice ? 0 : 16,
              }}
            >
              <h2 style={{ ...sectionTitleStyle, marginBottom: 0 }}>
                Transactions by Device
              </h2>
              <button
                onClick={() => toggleSection("transactionsByDevice")}
                style={smallButtonStyle}
              >
                {collapsedSections.transactionsByDevice ? "Expand" : "Minimize"}
              </button>
            </div>

            {!collapsedSections.transactionsByDevice && (
              <div style={{ width: "100%", height: 420 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={transactionsByDevice}
                    margin={{ top: 10, right: 20, left: 10, bottom: 70 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis
                      dataKey="device"
                      stroke="#e5e7eb"
                      angle={-20}
                      textAnchor="end"
                      interval={0}
                      height={70}
                    />
                    <YAxis stroke="#e5e7eb" />
                    <Tooltip />
                    <Bar dataKey="count" fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Highlights the transactions with the highest fraud probabilities */}
        <div
          style={
            collapsedSections.highRiskTransactions
              ? collapsedPanelStyle
              : panelStyle
          }
        >
          <div
            style={{
              ...panelHeaderStyle,
              marginBottom: collapsedSections.highRiskTransactions ? 0 : 16,
            }}
          >
            <h2 style={{ ...sectionTitleStyle, marginBottom: 0 }}>
              Top High-Risk Transactions
            </h2>
            <button
              onClick={() => toggleSection("highRiskTransactions")}
              style={smallButtonStyle}
            >
              {collapsedSections.highRiskTransactions ? "Expand" : "Minimize"}
            </button>
          </div>

          {!collapsedSections.highRiskTransactions && (
            <>
              {highestRiskTransactions.length === 0 ? (
                <p style={{ margin: 0, lineHeight: 1.6 }}>
                  Upload a CSV to see the transactions with the highest fraud
                  probabilities.
                </p>
              ) : (
                <div style={tableWrapStyle}>
                  <table border="0" cellPadding="8" style={tableStyle}>
                    <thead>
                      <tr>
                        <th style={thTdStyle}>Transaction ID</th>
                        <th style={thTdStyle}>Merchant</th>
                        <th style={thTdStyle}>Location</th>
                        <th style={thTdStyle}>Amount</th>
                        <th style={thTdStyle}>Predicted Fraud?</th>
                        <th style={thTdStyle}>Fraud Probability</th>
                      </tr>
                    </thead>
                    <tbody>
                      {highestRiskTransactions.map((r) => (
                        <tr key={`high-risk-${r._rowId}`}>
                          <td style={thTdStyle}>{r.transaction_id}</td>
                          <td style={thTdStyle}>{r.merchant}</td>
                          <td style={thTdStyle}>{r.location}</td>
                          <td style={thTdStyle}>{formatAmount(r.amount)}</td>
                          <td
                            style={{
                              ...thTdStyle,
                              color: r.predicted_is_fraud ? "#f87171" : "#4ade80",
                              fontWeight: 700,
                            }}
                          >
                            {r.predicted_is_fraud ? "YES" : "NO"}
                          </td>
                          <td style={thTdStyle}>
                            {r.predicted_probability !== undefined
                              ? `${(Number(r.predicted_probability) * 100).toFixed(2)}%`
                              : ""}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>

        {/* Main full transactions table with pagination */}
        <div
          style={
            collapsedSections.transactionsTable ? collapsedPanelStyle : panelStyle
          }
        >
          <div
            style={{
              ...panelHeaderStyle,
              marginBottom: collapsedSections.transactionsTable ? 0 : 16,
            }}
          >
            <h2 style={{ ...sectionTitleStyle, marginBottom: 0 }}>Transactions</h2>
            <button
              onClick={() => toggleSection("transactionsTable")}
              style={smallButtonStyle}
            >
              {collapsedSections.transactionsTable ? "Expand" : "Minimize"}
            </button>
          </div>

          {!collapsedSections.transactionsTable && (
            <>
              <div style={buttonRowStyle}>
                <button
                  style={safePage === 1 ? buttonDisabledStyle : buttonStyle}
                  onClick={() => {
                    const newPage = Math.max(1, safePage - 1);
                    setPage(newPage);
                    setPageInput(String(newPage));
                  }}
                  disabled={safePage === 1}
                >
                  Prev
                </button>

                <span>
                  Page <b>{safePage}</b> of <b>{totalPages}</b> (showing {pageSize} per
                  page)
                </span>

                <button
                  style={safePage === totalPages ? buttonDisabledStyle : buttonStyle}
                  onClick={() => {
                    const newPage = Math.min(totalPages, safePage + 1);
                    setPage(newPage);
                    setPageInput(String(newPage));
                  }}
                  disabled={safePage === totalPages}
                >
                  Next
                </button>
              </div>

              <div style={tableWrapStyle}>
                <table border="0" cellPadding="8" style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thTdStyle}>Transaction ID</th>
                      <th style={thTdStyle}>Card Number</th>
                      <th style={thTdStyle}>Merchant</th>
                      <th style={thTdStyle}>Category</th>
                      <th style={thTdStyle}>Location</th>
                      <th style={thTdStyle}>Device</th>
                      <th style={thTdStyle}>Amount</th>
                      <th style={thTdStyle}>Date (MM/DD/YYYY)</th>
                      <th style={thTdStyle}>Time (AM/PM)</th>
                      <th style={thTdStyle}>Predicted Fraud?</th>
                      <th style={thTdStyle}>Fraud Probability</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedRows.map((r) => (
                      <tr key={r._rowId}>
                        <td style={thTdStyle}>{r.transaction_id}</td>
                        <td style={thTdStyle}>{r.card_number}</td>
                        <td style={thTdStyle}>{r.merchant}</td>
                        <td style={thTdStyle}>{r.category}</td>
                        <td style={thTdStyle}>{r.location}</td>
                        <td style={thTdStyle}>{r.device}</td>
                        <td style={thTdStyle}>{formatAmount(r.amount)}</td>
                        <td style={thTdStyle}>{formatDateMDY(r.timestamp)}</td>
                        <td style={thTdStyle}>{formatTimeAMPM(r.timestamp)}</td>
                        <td
                          style={{
                            ...thTdStyle,
                            color: r.predicted_is_fraud ? "#f87171" : "#4ade80",
                            fontWeight: 700,
                          }}
                        >
                          {r.predicted_is_fraud ? "YES" : "NO"}
                        </td>
                        <td style={thTdStyle}>
                          {r.predicted_probability !== undefined
                            ? `${(Number(r.predicted_probability) * 100).toFixed(2)}%`
                            : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={goToPageWrapStyle}>
                <span>Go to page:</span>
                <input
                  type="number"
                  min="1"
                  max={totalPages}
                  value={pageInput}
                  onChange={(e) => setPageInput(e.target.value)}
                  onKeyDown={handlePageInputKeyDown}
                  style={pageInputStyle}
                />
                <button onClick={handleGoToPage} style={buttonStyle}>
                  Go
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}