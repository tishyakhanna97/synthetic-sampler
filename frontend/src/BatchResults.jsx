import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const ANSWER_ORDER = ['Yes', 'No', 'Unknown'];
const ANSWER_COLORS = { Yes: '#059669', No: '#dc2626', Unknown: '#6b7280' };

export default function BatchResults({ batchData }) {
  if (!batchData) {
    return (
      <section className="panel">
        <p className="muted">Run a batch to see results here.</p>
      </section>
    );
  }

  const { batch_id, runs, summary } = batchData;
  const { total, answer_counts, error_count } = summary;

  const chartData = ANSWER_ORDER.map((answer) => ({
    answer,
    count: answer_counts[answer] || 0,
  }));

  const nonZeroAnswers = chartData.filter((d) => d.count > 0).length;

  return (
    <>
      {/* Summary stats */}
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
            <span className="stat-value mono" style={{ fontSize: '0.75rem' }}>{batch_id}</span>
            <span className="stat-label">Batch ID</span>
          </div>
        </div>
      </section>

      {/* Charts */}
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

      {/* Detailed runs table */}
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
