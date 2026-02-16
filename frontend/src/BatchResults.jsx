import { useCallback, useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const apiBase =
  import.meta.env.VITE_API_BASE || 'https://synthetic-sampler.onrender.com';

const ANSWER_ORDER = ['Yes', 'No', 'Unknown'];
const ANSWER_COLORS = { Yes: '#059669', No: '#dc2626', Unknown: '#6b7280' };

function computeSummary(runs) {
  const answer_counts = {};
  for (const r of runs) {
    answer_counts[r.answer] = (answer_counts[r.answer] || 0) + 1;
  }
  return {
    total: runs.length,
    answer_counts,
    error_count: runs.filter((r) => r.answer === 'ERROR').length,
  };
}

function BatchCharts({ batchId, runs, summary }) {
  const { total, answer_counts, error_count } = summary;

  const chartData = ANSWER_ORDER.map((answer) => ({
    answer,
    count: answer_counts[answer] || 0,
  }));

  const nonZeroAnswers = chartData.filter((d) => d.count > 0).length;

  return (
    <>
      <section className="panel">
        <h2 style={{ marginTop: 0 }}>Batch Summary</h2>
        <div className="summary-stats">
          <div className="stat">
            <span className="stat-value">{total}</span>
            <span className="stat-label">Total Runs</span>
          </div>
          <div className="stat">
            <span className="stat-value">{nonZeroAnswers}</span>
            <span className="stat-label">Unique Answers</span>
          </div>
          <div className="stat">
            <span className="stat-value">{error_count}</span>
            <span className="stat-label">Errors</span>
          </div>
          <div className="stat">
            <span className="stat-value mono" style={{ fontSize: '0.75rem' }}>{batchId}</span>
            <span className="stat-label">Batch ID</span>
          </div>
        </div>
      </section>

      <section className="panel">
        <h2 style={{ marginTop: 0 }}>Answer Distribution</h2>
        <div className="charts-grid">
          <div className="chart-container">
            <h3>Count</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="answer" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry) => (
                    <Cell key={entry.answer} fill={ANSWER_COLORS[entry.answer]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-container">
            <h3>Proportion</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData.filter((d) => d.count > 0)}
                  dataKey="count"
                  nameKey="answer"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ answer, percent }) => `${answer} (${(percent * 100).toFixed(0)}%)`}
                >
                  {chartData.filter((d) => d.count > 0).map((entry) => (
                    <Cell key={entry.answer} fill={ANSWER_COLORS[entry.answer]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="panel">
        <h2 style={{ marginTop: 0 }}>All Runs</h2>
        <div className="table-wrap">
          <table className="runs-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Answer</th>
                <th>Reason</th>
                <th>Run ID</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run, i) => (
                <tr key={run.id}>
                  <td>{i + 1}</td>
                  <td className="answer-cell">{run.answer}</td>
                  <td>{run.reason}</td>
                  <td className="mono">{run.id.slice(0, 8)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

export default function BatchResults({ batchData, credential }) {
  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState(null);
  const [loadedData, setLoadedData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch the list of previous batches
  useEffect(() => {
    const headers = {};
    if (credential) headers['Authorization'] = `Bearer ${credential}`;

    fetch(`${apiBase}/runs/batches`, { headers })
      .then((r) => r.ok ? r.json() : [])
      .then(setBatches)
      .catch(() => setBatches([]));
  }, [credential, batchData]);

  // When batchData arrives from a new run, show it and select it
  useEffect(() => {
    if (batchData) {
      setSelectedBatchId(batchData.batch_id);
      setLoadedData(batchData);
    }
  }, [batchData]);

  const loadBatch = useCallback(async (batchId) => {
    setSelectedBatchId(batchId);
    if (batchData && batchData.batch_id === batchId) {
      setLoadedData(batchData);
      return;
    }
    setLoading(true);
    try {
      const headers = {};
      if (credential) headers['Authorization'] = `Bearer ${credential}`;
      const res = await fetch(`${apiBase}/runs?batch_id=${batchId}&limit=500`, { headers });
      if (!res.ok) throw new Error('Failed to load batch');
      const runs = await res.json();
      const summary = computeSummary(runs);
      setLoadedData({ batch_id: batchId, runs, summary });
    } catch {
      setLoadedData(null);
    } finally {
      setLoading(false);
    }
  }, [credential, batchData]);

  const activeBatchId = loadedData?.batch_id || null;

  return (
    <>
      {/* Batch selector */}
      <section className="panel">
        <h2 style={{ marginTop: 0 }}>Select Batch</h2>
        {batches.length === 0 && !batchData ? (
          <p className="muted">No batches yet. Run a batch from the New Run tab.</p>
        ) : (
          <div className="batch-list">
            {batches.map((b) => (
              <button
                key={b.batch_id}
                className={`batch-item ${activeBatchId === b.batch_id ? 'batch-item-active' : ''}`}
                onClick={() => loadBatch(b.batch_id)}
              >
                <span className="batch-item-question">{b.question || 'No question'}</span>
                <span className="batch-item-meta">
                  {b.run_count} runs &middot; {new Date(b.created_at).toLocaleString()}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      {loading && <section className="panel"><p className="muted">Loading batch...</p></section>}

      {!loading && loadedData && (
        <BatchCharts
          batchId={loadedData.batch_id}
          runs={loadedData.runs}
          summary={loadedData.summary}
        />
      )}

      {!loading && !loadedData && batches.length > 0 && (
        <section className="panel">
          <p className="muted">Select a batch above to view results.</p>
        </section>
      )}
    </>
  );
}
