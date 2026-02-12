import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Auth state
  const [credential, setCredential] = useState(null);
  const [userEmail, setUserEmail] = useState('');
  const [authError, setAuthError] = useState('');
  const googleButtonRef = useRef(null);

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
        setAuthError('Your email is not on the allowlist.');
      }
    } catch {
      setAuthError('Failed to verify credentials. Please try again.');
    }
  }, []);

  const handleLogout = useCallback(() => {
    setCredential(null);
    setUserEmail('');
    setAuthError('');
  }, []);

  // Initialize Google Sign-In button
  useEffect(() => {
    if (authDisabled || !googleClientId) return;

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

  const runOnce = async () => {
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (credential) {
        headers['Authorization'] = `Bearer ${credential}`;
      }
      const response = await fetch(`${apiBase}/runs`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          persona: form.persona,
          situation: form.situation,
          information: form.information,
          question: form.question,
        }),
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
      setResult(data);
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
          Run once to see the output.
          {userEmail && (
            <span style={{ marginLeft: '1rem', fontSize: '0.85em', opacity: 0.8 }}>
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
          <div className="buttons">
            <button
              className="primary"
              disabled={!canSubmit || loading}
              onClick={runOnce}
            >
              Run Once
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
    </div>
  );
}
