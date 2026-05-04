import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './App.css';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const APP_TYPE_OPTIONS = ['Web Application', 'API', 'Mobile Backend'];
const STATUS_OPTIONS   = ['Open', 'Fixed', 'In Progress', 'Accepted Risk'];
const SCAN_REPORT_OPTIONS = ['Initial', 'Rescan-1', 'Rescan-2', 'Rescan-3', 'Rescan-4', 'Rescan-5', 'Final'];
const ENVIRONMENT_OPTIONS = ['SIT', 'UAT', 'Production'];
const SEVERITY_OPTIONS    = ['High', 'Medium', 'Low', 'Informational'];

const initialVulnerabilityState = {
  vulnerabilityName: '',
  severity: 'High',
  status: STATUS_OPTIONS[0],
  description: '',
  remediation: '',
  remark: '',
  affectedUrl: '',
  evidence: [],
};

function App() {
  const evidenceFileInputRef = useRef(null);

  const [applicationOptions, setApplicationOptions] = useState([]);
  const [vulnerabilityOptions, setVulnerabilityOptions] = useState([]);

  const [applicationDetails, setApplicationDetails] = useState({
    appId: '',
    applicationName: '',
    requestorPocId: '',
    appsecPocId: '',
    assessmentStartDate: new Date().toISOString().split('T')[0],
    assessmentEndDate:   new Date().toISOString().split('T')[0],
    scanReportType:      SCAN_REPORT_OPTIONS[0],
    testedEnvironment:   ENVIRONMENT_OPTIONS[0],
    appType:             APP_TYPE_OPTIONS[0],
    applicationUrl:      '',
  });

  const [vulnerabilities, setVulnerabilities]       = useState([]);
  const [currentVulnerability, setCurrentVulnerability] = useState(initialVulnerabilityState);
  const [tempEvidence, setTempEvidence]             = useState({ title: '', files: [] });

  // Severity filter for report generation (all selected by default)
  const [severityFilter, setSeverityFilter] = useState(['High', 'Medium', 'Low', 'Informational']);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState('');
  const [backendStatus, setBackendStatus] = useState(null); // null=checking, true=ok, false=down

  // Fetch application list and vulnerability list on mount
  useEffect(() => {
    Promise.allSettled([
      fetch(`${API_BASE_URL}/api/applications`).then(r => r.json()),
      fetch(`${API_BASE_URL}/api/vulnerabilities`).then(r => r.json()),
    ]).then(([appsResult, vulnsResult]) => {
      if (appsResult.status === 'fulfilled') {
        setApplicationOptions(appsResult.value);
      }
      if (vulnsResult.status === 'fulfilled' && vulnsResult.value.data) {
        setVulnerabilityOptions(vulnsResult.value.data);
      }
      setBackendStatus(
        appsResult.status === 'fulfilled' || vulnsResult.status === 'fulfilled'
      );
    });
  }, []);

  // Auto-fill description/remediation when vulnerability selection changes
  useEffect(() => {
    const selected = vulnerabilityOptions.find(v => v.name === currentVulnerability.vulnerabilityName);
    if (selected) {
      setCurrentVulnerability(curr => ({
        ...curr,
        description: selected.description,
        remediation: selected.remediation,
      }));
    }
  }, [currentVulnerability.vulnerabilityName, vulnerabilityOptions]);

  // When user picks an application from the dropdown, auto-fill ID + name
  const handleApplicationSelect = (e) => {
    const val = e.target.value;
    if (!val) return;
    const [id, ...nameParts] = val.split('|||');
    setApplicationDetails(prev => ({ ...prev, appId: id, applicationName: nameParts.join('|||') }));
  };

  const handleAppDetailsChange = (e) => {
    const { id, value } = e.target;
    setApplicationDetails(prev => ({ ...prev, [id]: value }));
  };

  const handleVulnerabilityChange = (e) => {
    const { id, value } = e.target;
    setCurrentVulnerability(prev => ({ ...prev, [id]: value }));
  };

  const toggleSeverityFilter = (sev) => {
    setSeverityFilter(prev =>
      prev.includes(sev) ? prev.filter(s => s !== sev) : [...prev, sev]
    );
  };

  const handleAddEvidence = (e) => {
    e.preventDefault();
    if (tempEvidence.files.length === 0) return;
    setCurrentVulnerability(prev => ({
      ...prev,
      evidence: [...prev.evidence, { ...tempEvidence, id: Date.now() }],
    }));
    setTempEvidence({ title: '', files: [] });
    if (evidenceFileInputRef.current) evidenceFileInputRef.current.value = '';
  };

  const removeEvidence = (id) => {
    setCurrentVulnerability(prev => ({
      ...prev,
      evidence: prev.evidence.filter(ev => ev.id !== id),
    }));
  };

  const handleAddVulnerability = (e) => {
    e.preventDefault();
    setVulnerabilities(prev => [...prev, { ...currentVulnerability, id: Date.now() }]);
    setCurrentVulnerability(initialVulnerabilityState);
    setTempEvidence({ title: '', files: [] });
    if (evidenceFileInputRef.current) evidenceFileInputRef.current.value = '';
  };

  const handleGenerateReport = async () => {
    // Filter vulnerabilities by the selected severity checkboxes
    const filtered = severityFilter.length === 0
      ? vulnerabilities
      : vulnerabilities.filter(v => severityFilter.includes(v.severity));

    if (filtered.length === 0) {
      setError('No vulnerabilities match the selected severity filter. Please adjust the filter or add matching vulnerabilities.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('applicationDetails', JSON.stringify(applicationDetails));

      const vulnerabilityTextData = filtered.map(({ evidence, ...rest }) => {
        const evidenceTextData = evidence.map(({ files, ...evRest }) => evRest);
        return { ...rest, evidence: evidenceTextData };
      });
      formData.append('vulnerabilities', JSON.stringify(vulnerabilityTextData));

      filtered.forEach((vuln) => {
        vuln.evidence.forEach((ev) => {
          ev.files.forEach((file, fileIndex) => {
            formData.append(`evidence_${ev.id}_${fileIndex}`, file);
          });
        });
      });

      const response = await fetch(`${API_BASE_URL}/api/generate-report`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = `Failed to generate report. Status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (_) {}
        throw new Error(errorMessage);
      }

      const pdfBlob = await response.blob();
      const url = window.URL.createObjectURL(pdfBlob);
      const a   = document.createElement('a');
      a.href     = url;
      a.download = 'dast-report.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Count how many added vulnerabilities match the current severity filter
  const filteredCount = severityFilter.length === 0
    ? vulnerabilities.length
    : vulnerabilities.filter(v => severityFilter.includes(v.severity)).length;

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>DAST Report Generator</h1>
        <Link to="/" style={{ color: 'white', textDecoration: 'none', marginLeft: 'auto' }}>
          &larr; Back to Home
        </Link>
      </header>

      {backendStatus === false && (
        <div className="backend-warning">
          Backend server is not running. Open a terminal in <code>my-backend-app</code> and run <code>npm start</code>, then refresh this page.
        </div>
      )}

      <main className="main-content">

        {/* ── Application & Assessment Details ── */}
        <section className="card details-section">
          <h2>Application &amp; Assessment Details</h2>
          <form className="report-form">

            {/* Application quick-select */}
            <div className="form-group full-width" style={{ marginBottom: '1rem' }}>
              <label htmlFor="appSelect">Select Application</label>
              <select id="appSelect" defaultValue="" onChange={handleApplicationSelect}>
                <option value="" disabled>— Choose application to auto-fill ID &amp; Name —</option>
                {applicationOptions.map((app, i) => (
                  <option key={i} value={`${app.id}|||${app.name}`}>
                    {app.id} — {app.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="appId">Application ID</label>
                <input type="text" id="appId" value={applicationDetails.appId} onChange={handleAppDetailsChange} placeholder="e.g. 343" />
              </div>
              <div className="form-group">
                <label htmlFor="applicationName">Application Name</label>
                <input type="text" id="applicationName" value={applicationDetails.applicationName} onChange={handleAppDetailsChange} placeholder="e.g. One Communicator" />
              </div>
              <div className="form-group">
                <label htmlFor="appType">Application Type</label>
                <select id="appType" value={applicationDetails.appType} onChange={handleAppDetailsChange}>
                  {APP_TYPE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="requestorPocId">Requestor POC ID</label>
                <input type="text" id="requestorPocId" value={applicationDetails.requestorPocId} onChange={handleAppDetailsChange} />
              </div>
              <div className="form-group">
                <label htmlFor="appsecPocId">AppSec POC ID</label>
                <input type="text" id="appsecPocId" value={applicationDetails.appsecPocId} onChange={handleAppDetailsChange} />
              </div>
              <div className="form-group">
                <label htmlFor="scanReportType">Scan Report Type</label>
                <select id="scanReportType" value={applicationDetails.scanReportType} onChange={handleAppDetailsChange}>
                  {SCAN_REPORT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="testedEnvironment">Tested Environment</label>
                <select id="testedEnvironment" value={applicationDetails.testedEnvironment} onChange={handleAppDetailsChange}>
                  {ENVIRONMENT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div className="form-group full-width">
                <label htmlFor="applicationUrl">Application URL</label>
                <input type="text" id="applicationUrl" value={applicationDetails.applicationUrl} onChange={handleAppDetailsChange} />
              </div>
              <div className="form-group">
                <label htmlFor="assessmentStartDate">Assessment Start Date</label>
                <input type="date" id="assessmentStartDate" value={applicationDetails.assessmentStartDate} onChange={handleAppDetailsChange} />
              </div>
              <div className="form-group">
                <label htmlFor="assessmentEndDate">Assessment End Date</label>
                <input type="date" id="assessmentEndDate" value={applicationDetails.assessmentEndDate} onChange={handleAppDetailsChange} />
              </div>
            </div>
          </form>
        </section>

        <div className="workspace-section">

          {/* ── Add Vulnerability ── */}
          <section className="card form-panel">
            <h2>Add a Vulnerability</h2>
            <form onSubmit={handleAddVulnerability} className="report-form">
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="vulnerabilityName">Vulnerability Name</label>
                  <input
                    type="text"
                    id="vulnerabilityName"
                    list="vuln-suggestions"
                    value={currentVulnerability.vulnerabilityName}
                    onChange={handleVulnerabilityChange}
                    placeholder={vulnerabilityOptions.length > 0 ? 'Type or select from list…' : 'Start backend and refresh to load list…'}
                    autoComplete="off"
                  />
                  <datalist id="vuln-suggestions">
                    {vulnerabilityOptions.map(v => <option key={v.id} value={v.name} />)}
                  </datalist>
                </div>
                <div className="form-group">
                  <label htmlFor="severity">Severity</label>
                  <select id="severity" value={currentVulnerability.severity} onChange={handleVulnerabilityChange}>
                    {SEVERITY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div className="form-group full-width">
                  <label htmlFor="description">Description</label>
                  <textarea id="description" value={currentVulnerability.description} onChange={handleVulnerabilityChange} rows="3" placeholder="Auto-filled when a known vulnerability is selected, or type manually." />
                </div>
                <div className="form-group full-width">
                  <label htmlFor="remediation">Remediation</label>
                  <textarea id="remediation" value={currentVulnerability.remediation} onChange={handleVulnerabilityChange} rows="3" placeholder="Auto-filled when a known vulnerability is selected, or type manually." />
                </div>
                <div className="form-group">
                  <label htmlFor="affectedUrl">Affected URL</label>
                  <input type="text" id="affectedUrl" value={currentVulnerability.affectedUrl} onChange={handleVulnerabilityChange} />
                </div>
                <div className="form-group">
                  <label htmlFor="status">Status</label>
                  <select id="status" value={currentVulnerability.status} onChange={handleVulnerabilityChange}>
                    {STATUS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div className="form-group full-width">
                  <label htmlFor="remark">Remark (Optional)</label>
                  <input type="text" id="remark" value={currentVulnerability.remark} onChange={handleVulnerabilityChange} />
                </div>
              </div>

              <div className="sub-section">
                <h4 className="ss-header">Evidence Screenshots</h4>
                <div className="sub-form">
                  <input
                    type="text"
                    placeholder="Screenshot title (optional)"
                    value={tempEvidence.title}
                    onChange={(e) => setTempEvidence(p => ({ ...p, title: e.target.value }))}
                  />
                  <input
                    type="file"
                    ref={evidenceFileInputRef}
                    accept="image/*"
                    multiple
                    onChange={(e) => setTempEvidence(p => ({ ...p, files: Array.from(e.target.files) }))}
                  />
                  <button type="button" onClick={handleAddEvidence} className="ss-add-btn">Add</button>
                </div>
                <div className="evidence-table">
                  {currentVulnerability.evidence.map((ev, index) => (
                    <div className="evidence-row" key={ev.id}>
                      <span>{index + 1}</span>
                      <span>{ev.title || '(no title)'}</span>
                      <span className="file-list">{ev.files.map(f => f.name).join(', ')}</span>
                      <button type="button" onClick={() => removeEvidence(ev.id)} className="remove-btn">Remove</button>
                    </div>
                  ))}
                </div>
              </div>

              <button type="submit">Add Vulnerability to Report</button>
            </form>
          </section>

          {/* ── Report Vulnerabilities + Generate ── */}
          <section className="card list-panel">
            <h2>Report Vulnerabilities ({vulnerabilities.length})</h2>
            <div className="vuln-list-container">
              {vulnerabilities.length > 0 ? (
                <ul className="vuln-list">
                  {vulnerabilities.map((vuln) => (
                    <li key={vuln.id}>
                      <div className="vuln-info">
                        <strong>{vuln.vulnerabilityName}</strong>
                        <span style={{
                          marginLeft: '8px',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: '#fff',
                          background: { High: '#c0392b', Medium: '#e67e22', Low: '#27ae60', Informational: '#2980b9' }[vuln.severity] || '#888'
                        }}>{vuln.severity}</span>
                        {vuln.evidence.length > 0 && (
                          <span className="file-name"> — {vuln.evidence.length} screenshot(s)</span>
                        )}
                      </div>
                      <button onClick={() => setVulnerabilities(v => v.filter(v_ => v_.id !== vuln.id))} className="remove-btn">Remove</button>
                    </li>
                  ))}
                </ul>
              ) : <p>No vulnerabilities added yet.</p>}
            </div>

            {/* Severity filter */}
            <div className="generate-section">
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>
                  Generate Report For Severity:
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {SEVERITY_OPTIONS.map(sev => {
                    const colors = { High: '#c0392b', Medium: '#e67e22', Low: '#d4ac0d', Informational: '#2980b9' };
                    const checked = severityFilter.includes(sev);
                    return (
                      <label key={sev} style={{
                        display: 'flex', alignItems: 'center', gap: '5px',
                        padding: '5px 12px', borderRadius: '20px', cursor: 'pointer',
                        border: `2px solid ${colors[sev]}`,
                        background: checked ? colors[sev] : 'transparent',
                        color: checked ? '#fff' : colors[sev],
                        fontWeight: 600, fontSize: '0.85rem', userSelect: 'none'
                      }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSeverityFilter(sev)}
                          style={{ display: 'none' }}
                        />
                        {sev}
                      </label>
                    );
                  })}
                </div>
                {vulnerabilities.length > 0 && (
                  <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#666' }}>
                    {filteredCount} of {vulnerabilities.length} vulnerabilities will be included.
                  </p>
                )}
              </div>

              <button onClick={handleGenerateReport} disabled={isLoading || filteredCount === 0}>
                {isLoading ? 'Generating...' : `Generate PDF Report (${filteredCount})`}
              </button>
              {error && <p className="error-message">{error}</p>}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default App;
