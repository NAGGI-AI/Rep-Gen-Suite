import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './App.css';

// --- API Configuration ---
const API_BASE_URL = import.meta.env.VITE_API_URL;

// --- Data for Dropdowns ---
const APP_ID_OPTIONS = ['APP-001', 'APP-002', 'CORP-WEB-01', 'API-GATEWAY'];
const APP_TYPE_OPTIONS = ['Web Application', 'API', 'Mobile Backend'];
const STATUS_OPTIONS = ['Open', 'Fixed', 'In Progress', 'Accepted Risk'];
const SCAN_REPORT_OPTIONS = ['Initial', 'Rescan-1', 'Rescan-2', 'Rescan-3', 'Rescan-4', 'Rescan-5', 'Final'];
const ENVIRONMENT_OPTIONS = ['SIT', 'UAT'];
const SEVERITY_OPTIONS = ['High', 'Medium', 'Low', 'Informational'];

const initialVulnerabilityState = {
  vulnerabilityName: '',
  severity: 'High',
  status: STATUS_OPTIONS[0],
  description: 'Select a vulnerability to see details.',
  remediation: 'Select a vulnerability to see details.',
  remark: '',
  affectedUrl: '',
  evidence: [], // Array of { id, title, files[] }
};

function App() {
  const evidenceFileInputRef = useRef(null);

  const [applicationDetails, setApplicationDetails] = useState({
    appId: APP_ID_OPTIONS[0],
    applicationName: 'Corporate Portal',
    requestorPocId: 'user123',
    appsecPocId: 'sec_analyst_456',
    assessmentStartDate: new Date().toISOString().split('T')[0],
    assessmentEndDate: new Date().toISOString().split('T')[0],
    scanReportType: SCAN_REPORT_OPTIONS[0],
    testedEnvironment: ENVIRONMENT_OPTIONS[0],
    appType: APP_TYPE_OPTIONS[0],
    applicationUrl: '',
  });

  const [vulnerabilities, setVulnerabilities] = useState([]);
  const [vulnerabilityOptions, setVulnerabilityOptions] = useState([]);
  const [currentVulnerability, setCurrentVulnerability] = useState(initialVulnerabilityState);
  const [tempEvidence, setTempEvidence] = useState({ title: '', files: [] });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch vulnerabilities from backend on mount
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/vulnerabilities`)
      .then(res => res.json())
      .then(response => {
        if (response.data) {
          setVulnerabilityOptions(response.data);
          if (response.data.length > 0) {
            setCurrentVulnerability(curr => ({ ...curr, vulnerabilityName: response.data[0].name }));
          }
        }
      })
      .catch(err => console.error("Failed to fetch vulnerabilities:", err));
  }, []);

  // Auto-fill description and remediation when vulnerability name changes
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

  const handleAppDetailsChange = (e) => {
    const { id, value } = e.target;
    setApplicationDetails(prev => ({ ...prev, [id]: value }));
  };

  const handleVulnerabilityChange = (e) => {
    const { id, value } = e.target;
    setCurrentVulnerability(prev => ({ ...prev, [id]: value }));
  };

  // Add a screenshot entry to the current vulnerability's evidence list
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

  // Remove a screenshot entry from the current vulnerability
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
    if (vulnerabilities.length === 0) {
      setError('Please add at least one vulnerability before generating a report.');
      return;
    }
    setIsLoading(true);
    setError('');

    try {
      const formData = new FormData();

      formData.append('applicationDetails', JSON.stringify(applicationDetails));

      // Strip File objects from evidence — send only id + title as text
      const vulnerabilityTextData = vulnerabilities.map(({ evidence, ...rest }) => {
        const evidenceTextData = evidence.map(({ files, ...evRest }) => evRest);
        return { ...rest, evidence: evidenceTextData };
      });
      formData.append('vulnerabilities', JSON.stringify(vulnerabilityTextData));

      // Append each file keyed by its evidence entry id
      vulnerabilities.forEach((vuln) => {
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
        } catch (e) {
          // Response was not JSON
        }
        throw new Error(errorMessage);
      }

      const pdfBlob = await response.blob();
      const url = window.URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
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

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>DAST Report Generator</h1>
        <Link to="/" style={{ color: 'white', textDecoration: 'none', marginLeft: 'auto' }}>
          &larr; Back to Home
        </Link>
      </header>

      <main className="main-content">
        <section className="card details-section">
          <h2>Application &amp; Assessment Details</h2>
          <form className="report-form">
            <div className="form-grid">
              <div className="form-group"><label htmlFor="appId">Application ID</label><select id="appId" value={applicationDetails.appId} onChange={handleAppDetailsChange}>{APP_ID_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
              <div className="form-group"><label htmlFor="applicationName">Application Name</label><input type="text" id="applicationName" value={applicationDetails.applicationName} onChange={handleAppDetailsChange} /></div>
              <div className="form-group"><label htmlFor="appType">Application Type</label><select id="appType" value={applicationDetails.appType} onChange={handleAppDetailsChange}>{APP_TYPE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
              <div className="form-group"><label htmlFor="requestorPocId">Requestor POC ID</label><input type="text" id="requestorPocId" value={applicationDetails.requestorPocId} onChange={handleAppDetailsChange} /></div>
              <div className="form-group"><label htmlFor="appsecPocId">AppSec POC ID</label><input type="text" id="appsecPocId" value={applicationDetails.appsecPocId} onChange={handleAppDetailsChange} /></div>
              <div className="form-group"><label htmlFor="scanReportType">Scan Report</label><select id="scanReportType" value={applicationDetails.scanReportType} onChange={handleAppDetailsChange}>{SCAN_REPORT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
              <div className="form-group"><label htmlFor="testedEnvironment">Tested Environment</label><select id="testedEnvironment" value={applicationDetails.testedEnvironment} onChange={handleAppDetailsChange}>{ENVIRONMENT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
              <div className="form-group"><label htmlFor="applicationUrl">Application URL</label><input type="text" id="applicationUrl" value={applicationDetails.applicationUrl} onChange={handleAppDetailsChange} /></div>
              <div className="form-group"><label htmlFor="assessmentStartDate">Assessment Start Date</label><input type="date" id="assessmentStartDate" value={applicationDetails.assessmentStartDate} onChange={handleAppDetailsChange} /></div>
              <div className="form-group"><label htmlFor="assessmentEndDate">Assessment End Date</label><input type="date" id="assessmentEndDate" value={applicationDetails.assessmentEndDate} onChange={handleAppDetailsChange} /></div>
            </div>
          </form>
        </section>

        <div className="workspace-section">
          <section className="card form-panel">
            <h2>Add a Vulnerability</h2>
            <form onSubmit={handleAddVulnerability} className="report-form">
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="vulnerabilityName">Vulnerability Name</label>
                  <select id="vulnerabilityName" value={currentVulnerability.vulnerabilityName} onChange={handleVulnerabilityChange}>
                    {vulnerabilityOptions.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="severity">Severity</label>
                  <select id="severity" value={currentVulnerability.severity} onChange={handleVulnerabilityChange}>
                    {SEVERITY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div className="form-group full-width">
                  <label htmlFor="description">Description</label>
                  <textarea id="description" value={currentVulnerability.description} onChange={handleVulnerabilityChange} rows="3" />
                </div>
                <div className="form-group full-width">
                  <label htmlFor="remediation">Remediation</label>
                  <textarea id="remediation" value={currentVulnerability.remediation} onChange={handleVulnerabilityChange} rows="3" />
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

              {/* Evidence Screenshots Sub-section */}
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

          <section className="card list-panel">
            <h2>Report Vulnerabilities ({vulnerabilities.length})</h2>
            <div className="vuln-list-container">
              {vulnerabilities.length > 0 ? (
                <ul className="vuln-list">
                  {vulnerabilities.map((vuln) => (
                    <li key={vuln.id}>
                      <div className="vuln-info">
                        <strong>{vuln.vulnerabilityName}</strong> ({vuln.severity})
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
            <div className="generate-section">
              <button onClick={handleGenerateReport} disabled={isLoading || vulnerabilities.length === 0}>
                {isLoading ? 'Generating...' : 'Generate Final PDF Report'}
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
