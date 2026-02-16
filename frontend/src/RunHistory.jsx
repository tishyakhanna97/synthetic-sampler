import { useEffect, useState } from 'react';

const apiBase =
  import.meta.env.VITE_API_BASE || 'https://synthetic-sampler.onrender.com';

export default function RunHistory({ credential }) {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchRuns = async () => {
      setLoading(true);
      setError('');
      try {
        const headers = {};
        if (credential) {
          headers['Authorization'] = `Bearer ${credential}`;
        }
        const res = await fetch(`${apiBase}/runs?limit=10`, { headers });
        if (!res.ok) throw new Error(`Failed to fetch runs (${res.status})`);
        const data = await res.json();
        setRuns(data);
      } catch (err) {
        setError(err.message || 'Failed to load runs');
      } finally {
        setLoading(false);
      }
    };
    fetchRuns();
  }, [credential]);

  if (loading) return <p className="muted">Loading runs...</p>;
  if (error) return <div className="error">{error}</div>;
  if (runs.length === 0) return <p className="muted">No runs yet.</p>;

  return (
    <div className="table-wrap">
      <table className="runs-table">
        <thead>
          <tr>
            <th>Created</th>
            <th>User</th>
            <th>Persona</th>
            <th>Situation</th>
            <th>Information</th>
            <th>Question</th>
            <th>Answer</th>
            <th>Reason</th>
            <th>Batch ID</th>
            <th>Run ID</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr key={run.id}>
              <td className="nowrap">
                {new Date(run.created_at).toLocaleString()}
              </td>
              <td>{run.user_email}</td>
              <td>{run.inputs?.persona}</td>
              <td>{run.inputs?.situation}</td>
              <td>{run.inputs?.information}</td>
              <td>{run.inputs?.question}</td>
              <td className="answer-cell">{run.answer}</td>
              <td>{run.reason}</td>
              <td className="mono">{run.batch_id || '\u2014'}</td>
              <td className="mono">{run.id.slice(0, 8)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
