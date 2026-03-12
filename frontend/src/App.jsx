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

export default function App() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const [collapsedSections, setCollapsedSections] = useState({
    upload: false,
    metricsRow: false,
    transactionsByState: false,
    fraudByLocation: false,
    fraudVsNonFraud: false,
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

      const res = await fetch("http://127.0.0.1:8000/transactions/upload", {
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

      setRows(preparedRows);
      setPage(1);
      setPageInput("1");
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setIsUploading(false);
    }
  }

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
    alignItems: "flex-start",
    padding: "32px 16px",
    boxSizing: "border-box",
    fontFamily: '"Cabin", Arial, sans-serif',
  };

  const contentStyle = {
    width: "100%",
    maxWidth: 1280,
    margin: "0 auto",
    padding: 32,
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

  const chartsRowStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))",
    gap: 24,
    marginBottom: 30,
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
    overflowX: "auto",
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
  };

  const thTdStyle = {
    borderBottom: "1px solid #374151",
    padding: "12px 10px",
    textAlign: "left",
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
      <div style={contentStyle}>
        <h1 style={titleStyle}>Fraud Detection Dashboard</h1>
        <p style={subtitleStyle}>
          Upload transaction data, run fraud analysis, and review the results.
        </p>

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
          <div
            style={{
              ...panelHeaderStyle,
              marginBottom: collapsedSections.metricsRow ? 0 : 0,
            }}
          >
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
                ${totalAmount.toLocaleString()}
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

        <div style={chartsRowStyle}>
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
              <div style={{ width: "100%", height: 320 }}>
                <ResponsiveContainer>
                  <BarChart data={fraudByLocation}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="location" stroke="#e5e7eb" />
                    <YAxis stroke="#e5e7eb" />
                    <Tooltip />
                    <Bar dataKey="fraudCount" fill="#60a5fa" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

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
              <div style={{ width: "100%", height: 320 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
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
                      <th style={thTdStyle}>ID</th>
                      <th style={thTdStyle}>Merchant</th>
                      <th style={thTdStyle}>Location</th>
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
                        <td style={thTdStyle}>{r.merchant}</td>
                        <td style={thTdStyle}>{r.location}</td>
                        <td style={thTdStyle}>${r.amount}</td>
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