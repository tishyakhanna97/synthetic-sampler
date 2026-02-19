import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import BatchResults from './BatchResults.jsx';
import RunHistory from './RunHistory.jsx';

const apiBase =
  import.meta.env.VITE_API_BASE || 'https://synthetic-sampler.onrender.com';

const authDisabled = import.meta.env.VITE_AUTH_DISABLED === 'true';
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

const initialState = {
  persona:
    'I only care about minimizing regulatory exposure and avoiding any action that could violate compliance standards, even if it reduces commercial upside.',
  situation:
    'You are a cautious compliance officer at a regulated financial institution, accountable to regulators, internal audit, and senior management for any approval decision.',
  information:
    'You have only 10 minutes to review a high-risk contract before a deadline, and you are aware that past compliance failures at the firm led to penalties and personal scrutiny.',
  question: 'Should I approve the contract?',
};

export default function App() {
  const [form, setForm] = useState(initialState);
  const [iterations, setIterations] = useState(1);
  const [result, setResult] = useState(null);
  const [batchData, setBatchData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('run'); // 'run' | 'history' | 'results'

  // Auth state
  const [credential, setCredential] = useState(null);
  const [userEmail, setUserEmail] = useState('');
  const [authError, setAuthError] = useState('');
  const [backendReady, setBackendReady] = useState(false);
  const googleButtonRef = useRef(null);

  // Ping the backend on load to wake it up (Render cold start)
  useEffect(() => {
    fetch(`${apiBase}/health`)
      .then(() => setBackendReady(true))
      .catch(() => setBackendReady(false));
  }, []);

  const isAuthenticated = authDisabled || !!credential;

  const handleGoogleResponse = useCallback(async (response) => {
    setAuthError('');
    try {
      const res = await fetch(`${apiBase}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      });
      const data = await res.json();
      if (data.allowed) {
        setCredential(response.credential);
        setUserEmail(data.email);
      } else {
        setAuthError('Sign-in failed. Please try again.');
      }
    } catch {
      setAuthError('Could not reach the server — it may be waking up. Please try signing in again in a moment.');
    }
  }, []);

  const handleLogout = useCallback(() => {
    setCredential(null);
    setUserEmail('');
    setAuthError('');
  }, []);

  // Initialize Google Sign-In button (only when not authenticated)
  useEffect(() => {
    if (authDisabled || !googleClientId || credential) return;

    let cancelled = false;
    const initGoogle = () => {
      if (cancelled) return;
      if (!window.google?.accounts?.id) {
        setTimeout(initGoogle, 200);
        return;
      }
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleResponse,
      });
      if (googleButtonRef.current) {
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
        });
      }
    };
    initGoogle();
    return () => { cancelled = true; };
  }, [handleGoogleResponse, credential]);

  const canSubmit = useMemo(() => {
    return form.persona && form.situation && form.information && form.question;
  }, [form]);

  const updateField = (key) => (event) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const handleRun = async () => {
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (credential) {
        headers['Authorization'] = `Bearer ${credential}`;
      }

      const isBatch = iterations > 1;
      const url = isBatch ? `${apiBase}/runs/batch` : `${apiBase}/runs`;
      const body = {
        persona: form.persona,
        situation: form.situation,
        information: form.information,
        question: form.question,
      };
      if (isBatch) body.iterations = iterations;

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      if (response.status === 401 || response.status === 403) {
        setCredential(null);
        setUserEmail('');
        throw new Error('Session expired. Please sign in again.');
      }
      if (!response.ok) {
        throw new Error(`Run failed (${response.status})`);
      }
      const data = await response.json();
      if (isBatch) {
        setBatchData(data);
        setTab('results');
      } else {
        setResult(data);
      }
    } catch (err) {
      setError(err.message || 'Run failed');
    } finally {
      setLoading(false);
    }
  };

  // --- Login screen ---
  if (!isAuthenticated) {
    return (
      <div className="page">
        <header className="hero">
          <h1>Synthetic Sampler</h1>
          <p className="subtitle">Sign in to continue.</p>
        </header>
        <section className="panel" style={{ textAlign: 'center', padding: '2rem' }}>
          {!backendReady && (
          <p className="muted" style={{ marginBottom: '1rem' }}>Server is warming up, please wait a moment…</p>
        )}
          <div ref={googleButtonRef} style={{ display: 'inline-block' }} />
          {authError && <div className="error" style={{ marginTop: '1rem' }}>{authError}</div>}
        </section>
      </div>
    );
  }

  // --- Main app ---
  return (
    <div className="page">
      <header className="hero">
        <h1>Synthetic Sampler</h1>
        <p className="subtitle">
          {userEmail && (
            <span style={{ fontSize: '0.85em', opacity: 0.8 }}>
              Signed in as {userEmail}{' '}
              <button
                onClick={handleLogout}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'inherit',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  fontSize: 'inherit',
                  padding: 0,
                }}
              >
                Sign out
              </button>
            </span>
          )}
        </p>
      </header>

      <nav className="tabs">
        <button
          className={tab === 'run' ? 'tab active' : 'tab'}
          onClick={() => setTab('run')}
        >
          New Run
        </button>
        <button
          className={tab === 'results' ? 'tab active' : 'tab'}
          onClick={() => setTab('results')}
        >
          Results
        </button>
        <button
          className={tab === 'history' ? 'tab active' : 'tab'}
          onClick={() => setTab('history')}
        >
          History
        </button>
      </nav>

      {tab === 'run' && (
        <>
          <section className="panel">
            <div className="field-grid">
              <label>
                Worldview (values / social preferences)
                <textarea
                  rows="3"
                  value={form.persona}
                  onChange={updateField('persona')}
                  placeholder="e.g. A cautious compliance officer"
                />
                <span className="helper">Worldview: Values that are key to the LLM</span>
              </label>
              <label>
                Social context (role / identity)
                <textarea
                  rows="3"
                  value={form.situation}
                  onChange={updateField('situation')}
                  placeholder="e.g. Reviewing a high-risk vendor contract"
                />
                <span className="helper">
                  Social context: Social context relates to the identity the LLM should assume
                </span>
              </label>
              <label>
                Psychological factors (situational state)
                <textarea
                  rows="3"
                  value={form.information}
                  onChange={updateField('information')}
                  placeholder="e.g. Vendor lacks SOC2, data is PII"
                />
                <span className="helper">
                  Psychological context: Psychological context relates to the situation the LLM is
                  supposed to be in
                </span>
              </label>
              <label>
                Question
                <textarea
                  rows="2"
                  value={form.question}
                  onChange={updateField('question')}
                  placeholder="e.g. Approve the contract?"
                />
              </label>
            </div>

            <div className="controls">
              <label style={{ flexDirection: 'row', alignItems: 'center', gap: '8px', color: 'var(--ink)' }}>
                Iterations
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={iterations}
                  onChange={(e) => setIterations(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
                  style={{ width: '70px' }}
                />
              </label>
              <div className="buttons">
                <button
                  className="primary"
                  disabled={!canSubmit || loading}
                  onClick={handleRun}
                >
                  {loading ? 'Running…' : iterations > 1 ? `Run ${iterations}x` : 'Run Once'}
                </button>
              </div>
            </div>

            {error && <div className="error">{error}</div>}
          </section>

          <section className="results">
            <div className="card">
              <h2>Result</h2>
              {result ? (
                <div className="result-block">
                  <p className="answer">{result.answer || 'No answer'}</p>
                  <p className="reason">{result.reason}</p>
                </div>
              ) : (
                <p className="muted">Run once to see the output.</p>
              )}
            </div>
          </section>
        </>
      )}

      {tab === 'results' && <BatchResults batchData={batchData} credential={credential} />}

      {tab === 'history' && <RunHistory credential={credential} />}
    </div>
  );
}
