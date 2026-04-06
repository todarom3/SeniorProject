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
  const [datasets, setDatasets] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeDatasetId, setActiveDatasetId] = useState(() => {
    try {
      return localStorage.getItem(ACTIVE_DATASET_KEY);
    } catch {
      return null;
    }
  });

  const [error, setError] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const [collapsedSections, setCollapsedSections] = useState({
    upload: false,
    metricsRow: false,
    transactionsByState: false,
    fraudByLocation: false,
    fraudVsNonFraud: false,
    transactionsByDevice: false,
    transactionsTable: false,
  });

  const [page, setPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const pageSize = 30;

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

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(datasets));
    } catch {
      // ignore storage errors
    }
  }, [datasets]);

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

  useEffect(() => {
    if (datasets.length > 0 && !datasets.some((d) => d.id === activeDatasetId)) {
      setActiveDatasetId(datasets[0].id);
    }
    if (datasets.length === 0 && activeDatasetId) {
      setActiveDatasetId(null);
    }
  }, [datasets, activeDatasetId]);

  function toggleSection(sectionKey) {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  }

  function tsToMillis(ts) {
    if (!ts) return 0;

    const cleaned = String(ts).trim();
    const isoLike = cleaned.includes("T") ? cleaned : cleaned.replace(" ", "T");
    const ms = Date.parse(isoLike);
    return Number.isNaN(ms) ? 0 : ms;
  }

  function formatDateMDY(ts) {
    const ms = tsToMillis(ts);
    if (!ms) return "";
    const d = new Date(ms);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  }

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

  function formatAmount(value) {
    const num = Number(value);
    if (Number.isNaN(num)) return "";
    return `$${num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  function createDatasetName(fileName) {
    const now = new Date();
    const timeLabel = now.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
    return `${fileName} • ${timeLabel}`;
  }

  function switchDataset(datasetId) {
    setActiveDatasetId(datasetId);
    setPage(1);
    setPageInput("1");
    setError("");
  }

  function removeDataset(datasetId) {
    setDatasets((prev) => prev.filter((dataset) => dataset.id !== datasetId));

    if (datasetId === activeDatasetId) {
      const remaining = datasets.filter((dataset) => dataset.id !== datasetId);
      setActiveDatasetId(remaining.length > 0 ? remaining[0].id : null);
      setPage(1);
      setPageInput("1");
    }
  }

  async function handleUpload() {
    if (!selectedFile) {
      setError("Please choose a CSV file first.");
      return;
    }

    setError("");
    setIsUploading(true);

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
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setIsUploading(false);
    }
  }

  const activeDataset =
    datasets.find((dataset) => dataset.id === activeDatasetId) || null;

  const rows = activeDataset ? activeDataset.rows : [];

  const totalTransactions = rows.length;
  const fraudCount = rows.filter((r) => r.predicted_is_fraud).length;
  const nonFraudCount = totalTransactions - fraudCount;
  const fraudRate = totalTransactions
    ? ((fraudCount / totalTransactions) * 100).toFixed(2)
    : "0.00";
  const totalAmount = rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

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

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      if (b._ts !== a._ts) return b._ts - a._ts;
      return a._rowId - b._rowId;
    });
  }, [rows]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const startIndex = (safePage - 1) * pageSize;

  const pagedRows = useMemo(() => {
    return sortedRows.slice(startIndex, startIndex + pageSize);
  }, [sortedRows, startIndex]);

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

  const transactionsByDevice = Object.values(
    rows.reduce((acc, r) => {
      const device = r.device || "Unknown";
      acc[device] = acc[device] || { device, count: 0 };
      acc[device].count += 1;
      return acc;
    }, {})
  ).sort((a, b) => b.count - a.count);

  const pieData = [
    { name: "Fraud", value: fraudCount },
    { name: "Non-Fraud", value: nonFraudCount },
  ];

  const pieColors = ["#ef4444", "#22c55e"];

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

  function handlePageInputKeyDown(e) {
    if (e.key === "Enter") {
      handleGoToPage();
    }
  }

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
  };

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

  return (
    <div style={pageStyle}>
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

        {error && (
          <div style={{ ...panelStyle, border: "1px solid #ef4444" }}>
            <h3 style={{ marginTop: 0 }}>Error</h3>
            <pre style={{ whiteSpace: "pre-wrap", marginBottom: 0 }}>{error}</pre>
          </div>
        )}

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