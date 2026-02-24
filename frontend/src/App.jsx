import { useEffect, useMemo, useState } from "react";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export default function App() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 100;

  // Helper: safely parse timestamps like "2026-02-13 18:28:11"
  function tsToMillis(ts) {
    if (!ts) return 0;

    const cleaned = String(ts).trim();
    const isoLike = cleaned.includes("T") ? cleaned : cleaned.replace(" ", "T");
    const ms = Date.parse(isoLike);
    return Number.isNaN(ms) ? 0 : ms;
  }

  // Format helpers for display
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

    let hours = d.getHours(); // 0-23
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";

    hours = hours % 12;
    if (hours === 0) hours = 12;

    return `${hours}:${minutes} ${ampm}`;
  }

  // Metrics (based on ALL rows)
  const totalTransactions = rows.length;
  const fraudCount = rows.filter((r) => r.is_potential_fraud).length;
  const fraudRate = totalTransactions
    ? ((fraudCount / totalTransactions) * 100).toFixed(2)
    : "0.00";
  const totalAmount = rows.reduce((sum, r) => sum + (r.amount || 0), 0);

  // ✅ NEW: Total transactions per state (all transactions, not just fraud)
  const transactionsByState = useMemo(() => {
    const acc = {};
    for (const r of rows) {
      const loc = r.location || "Unknown";
      acc[loc] = (acc[loc] || 0) + 1;
    }

    // Sort by highest count first
    return Object.entries(acc)
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count);
  }, [rows]);

  // Sort ALL rows by most recent timestamp (newest first) using precomputed _ts
  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      if (b._ts !== a._ts) return b._ts - a._ts;
      return a._rowId - b._rowId;
    });
  }, [rows]);

  // Paged rows (100 per page) from the sorted list
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const startIndex = (safePage - 1) * pageSize;

  const pagedRows = useMemo(() => {
    return sortedRows.slice(startIndex, startIndex + pageSize);
  }, [sortedRows, startIndex]);

  // Chart data (fraud counts per location)
  const fraudByLocation = Object.values(
    rows
      .filter((r) => r.is_potential_fraud)
      .reduce((acc, r) => {
        const loc = r.location || "Unknown";
        acc[loc] = acc[loc] || { location: loc, fraudCount: 0 };
        acc[loc].fraudCount += 1;
        return acc;
      }, {})
  ).sort((a, b) => b.fraudCount - a.fraudCount);

  useEffect(() => {
    async function loadCsv() {
      try {
        const res = await fetch("/transactions.csv");
        if (!res.ok) throw new Error(`HTTP ${res.status} when fetching CSV`);

        const text = await res.text();

        const lines = text.trim().split("\n");
        const headers = lines[0].split(",").map((h) => h.trim());

        const data = lines.slice(1).map((line, idx) => {
          const values = line.split(",");
          const obj = {};

          headers.forEach((h, i) => {
            let value = (values[i] ?? "").trim();

            if (h === "amount") value = parseFloat(value);
            if (h === "is_potential_fraud") value = value === "1";

            obj[h] = value;
          });

          // Stable fields used for sorting + React keys
          obj._rowId = idx;
          obj._ts = tsToMillis(obj.timestamp);

          return obj;
        });

        setRows(data);
        setPage(1);
      } catch (e) {
        setError(e.message || String(e));
      }
    }

    loadCsv();
  }, []);

  if (error) {
    return (
      <div style={{ padding: 16 }}>
        <h2>Failed to load CSV</h2>
        <pre>{error}</pre>
      </div>
    );
  }

  // Styles
  const outerWrapStyle = {
    display: "flex",
    justifyContent: "center",
    width: "100%",
  };

  // Centered content area
  const contentStyle = {
    width: "100%",
    maxWidth: 1100,
    padding: 24,
    fontFamily: "Arial, sans-serif",
    textAlign: "center",
  };

  const cardRowStyle = {
    display: "flex",
    justifyContent: "center",
    gap: 20,
    marginBottom: 30,
    flexWrap: "wrap",
  };

  const cardStyle = {
    background: "#222",
    color: "white",
    padding: 20,
    borderRadius: 8,
    minWidth: 180,
    textAlign: "left",
  };

  const wideCardStyle = {
    ...cardStyle,
    minWidth: 380,
    maxWidth: 520,
  };

  const panelStyle = {
    background: "#222",
    color: "white",
    padding: 20,
    borderRadius: 8,
    marginBottom: 30,
    textAlign: "left",
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
    padding: "8px 12px",
    borderRadius: 6,
    border: "1px solid #444",
    background: "#111",
    color: "white",
    cursor: "pointer",
  };

  const buttonDisabledStyle = {
    ...buttonStyle,
    opacity: 0.5,
    cursor: "not-allowed",
  };

  // Table should fill page width
  const tableWrapStyle = {
    width: "100%",
    overflowX: "auto",
    marginTop: 8,
    textAlign: "left",
  };

  const tableStyle = {
    width: "100%",
    borderCollapse: "collapse",
  };

  return (
    <div style={outerWrapStyle}>
      <div style={contentStyle}>
        <h1 style={{ marginTop: 0 }}>Fraud Detection Dashboard</h1>

        <div style={cardRowStyle}>
          <div style={cardStyle}>
            <h3>Total Transactions</h3>
            <p>{totalTransactions}</p>
          </div>

          {/* ✅ NEW CARD */}
          <div style={wideCardStyle}>
            <h3>Transactions by State (Total)</h3>
            <p style={{ margin: 0, lineHeight: 1.5 }}>
              {transactionsByState.length === 0
                ? "Loading…"
                : transactionsByState
                    .map((s) => `${s.location}: ${s.count}`)
                    .join(" | ")}
            </p>
          </div>

          <div style={cardStyle}>
            <h3>Fraud Count</h3>
            <p>{fraudCount}</p>
          </div>

          <div style={cardStyle}>
            <h3>Fraud Rate</h3>
            <p>{fraudRate}%</p>
          </div>

          <div style={cardStyle}>
            <h3>Total Amount</h3>
            <p>${totalAmount.toLocaleString()}</p>
          </div>
        </div>

        <h2>Fraud by Location</h2>
        <div style={panelStyle}>
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={fraudByLocation}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="location" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="fraudCount" fill="#4ade80" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <h2>Transactions</h2>

        {/* Pagination Controls */}
        <div style={buttonRowStyle}>
          <button
            style={safePage === 1 ? buttonDisabledStyle : buttonStyle}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
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
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
          >
            Next
          </button>
        </div>

        {/* Full width table */}
        <div style={tableWrapStyle}>
          <table border="1" cellPadding="8" style={tableStyle}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Merchant</th>
                <th>Location</th>
                <th>Amount</th>
                <th>Date (MM/DD/YYYY)</th>
                <th>Time (AM/PM)</th>
                <th>Fraud?</th>
              </tr>
            </thead>
            <tbody>
              {pagedRows.map((r) => (
                <tr key={r._rowId}>
                  <td>{r.transaction_id}</td>
                  <td>{r.merchant}</td>
                  <td>{r.location}</td>
                  <td>${r.amount}</td>
                  <td>{formatDateMDY(r.timestamp)}</td>
                  <td>{formatTimeAMPM(r.timestamp)}</td>
                  <td style={{ color: r.is_potential_fraud ? "red" : "green" }}>
                    {r.is_potential_fraud ? "YES" : "NO"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}