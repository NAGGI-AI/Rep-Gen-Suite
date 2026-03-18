import React, { useState, useMemo, useRef, Fragment } from 'react';
import { Link } from 'react-router-dom';
import './App.css'; // We can reuse the same great styles

// --- API Configuration ---
const API_BASE_URL = import.meta.env.VITE_API_URL;

// --- Placeholder Data for MASA ---
const MASA_RISK_RATINGS = ['Critical', 'High', 'Medium', 'Low', 'Informational'];
const MASA_SOP_OPTIONS = ['High', 'Medium', 'Low', 'N/A'];
const MASA_REM_OPTIONS = ['> 40 hours', '10-40 hours', '< 10 hours', 'N/A'];
const MASA_STATUS_OPTIONS = ['Open', 'Fixed'];

const initialFindingState = {
  risk: MASA_RISK_RATINGS[1], // Default to High
  observation: '',
  sop: MASA_SOP_OPTIONS[1], // Default to Medium
  impact: '',
  rem: MASA_REM_OPTIONS[1], // Default to 10-40 hours
  recommendation: '',
  status: 'Open', // Default status for a new finding
  // --- Nested evidence for a single finding ---
  screenshots: [],
  tools: [],
  externalLinks: [],
  internalLinks: [],
};

function MasaGenerator() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Ref for resetting the screenshot file input
  const screenshotFileInputRef = useRef(null);

  // State for MASA assessment details
  const [masaDetails, setMasaDetails] = useState({
    applicationId: '',
    applicationName: '',
    version: '1.0',
    author: '',
    reviewedBy: '',
    approvedBy: '',
    date: new Date().toISOString().split('T')[0],
    applicationUrl: '',
    scopeUrl: '',
    scopeUserRoles: '',
  });

  // State for findings
  const [findings, setFindings] = useState([]);
  const [currentFinding, setCurrentFinding] = useState(initialFindingState);

  // --- Temporary states for sub-forms within the main finding form ---
  const [tempScreenshot, setTempScreenshot] = useState({ title: '', files: [] });
  const [tempTool, setTempTool] = useState({ tool: '', classification: '', purpose: '' });
  const [tempExternalLink, setTempExternalLink] = useState({ link: '', remarks: '' });
  const [tempInternalLink, setTempInternalLink] = useState({ link: '', remarks: '' });

  const [assessmentHistory, setAssessmentHistory] = useState([]);
  const [tempHistoryEntry, setTempHistoryEntry] = useState({
    version: '1.0',
    scanDetails: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    assessedBy: '',
  });


  const handleDetailsChange = (e) => {
    const { id, value } = e.target;
    setMasaDetails(prev => ({ ...prev, [id]: value }));
  };
  
  const handleCurrentFindingChange = (e) => {
    const { name, value } = e.target;
    setCurrentFinding(prev => ({ ...prev, [name]: value }));
  };

  const handleAddFinding = (e) => {
    e.preventDefault();
    setFindings(prev => [...prev, { ...currentFinding, id: Date.now() }]);
    // Reset the entire finding form to its initial state
    setCurrentFinding(initialFindingState);
  };

  // --- Handlers for adding items to the CURRENT finding being built ---
  const handleAddScreenshot = (e) => {
    e.preventDefault();
    if (!tempScreenshot.title || tempScreenshot.files.length === 0) return;
    setCurrentFinding(prev => ({ ...prev, screenshots: [...prev.screenshots, { ...tempScreenshot, id: Date.now() }] }));
    setTempScreenshot({ title: '', files: [] });
    if (screenshotFileInputRef.current) {
      screenshotFileInputRef.current.value = '';
    }
  };

  const handleAddTool = (e) => {
    e.preventDefault();
    if (!tempTool.tool) return;
    setCurrentFinding(prev => ({ ...prev, tools: [...prev.tools, { ...tempTool, id: Date.now() }] }));
    setTempTool({ tool: '', classification: '', purpose: '' });
  };

  const handleAddExternalLink = (e) => {
    e.preventDefault();
    if (!tempExternalLink.link) return;
    setCurrentFinding(prev => ({ ...prev, externalLinks: [...prev.externalLinks, { ...tempExternalLink, id: Date.now() }] }));
    setTempExternalLink({ link: '', remarks: '' });
  };

  const handleAddInternalLink = (e) => {
    e.preventDefault();
    if (!tempInternalLink.link) return;
    setCurrentFinding(prev => ({ ...prev, internalLinks: [...prev.internalLinks, { ...tempInternalLink, id: Date.now() }] }));
    setTempInternalLink({ link: '', remarks: '' });
  };

  // --- Handlers for removing items from the CURRENT finding ---
  const removeScreenshot = (id) => setCurrentFinding(p => ({ ...p, screenshots: p.screenshots.filter(s => s.id !== id) }));
  const removeTool = (id) => setCurrentFinding(p => ({ ...p, tools: p.tools.filter(t => t.id !== id) }));
  const removeExternalLink = (id) => setCurrentFinding(p => ({ ...p, externalLinks: p.externalLinks.filter(l => l.id !== id) }));
  const removeInternalLink = (id) => setCurrentFinding(p => ({ ...p, internalLinks: p.internalLinks.filter(l => l.id !== id) }));

  const handleAddHistory = (e) => {
    e.preventDefault();
    if (!tempHistoryEntry.scanDetails) return;
    setAssessmentHistory(prev => [...prev, { ...tempHistoryEntry, id: Date.now() }]);
    setTempHistoryEntry({
      version: '1.0',
      scanDetails: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      assessedBy: '',
    });
  };

  const removeHistory = (id) => {
    setAssessmentHistory(prev => prev.filter(h => h.id !== id));
  };

    // Calculate a summary of findings by risk rating
  const findingSummary = useMemo(() => {
    const summary = {
      Total: findings.length,
      Open: 0,
      Fixed: 0,
      Critical: 0,
      High: 0,
      Medium: 0,
      Low: 0,
      Informational: 0,
    };
    findings.forEach(f => {
      if (summary.hasOwnProperty(f.risk)) {
        summary[f.risk]++;
      }
      if (f.status === 'Fixed') {
        summary.Fixed++;
      } else { // Default to Open if status is missing or not 'Fixed'
        summary.Open++;
      }
    });
    return ({
      total: summary.Total,
      open: summary.Open,
      fixed: summary.Fixed,
      breakdown: `C: ${summary.Critical}, H: ${summary.High}, M: ${summary.Medium}, L: ${summary.Low}, I: ${summary.Informational}`
    });
  }, [findings]);

  const handleGenerateMasaReport = async () => {
    setIsLoading(true);
    setError('');

    try {
      const formData = new FormData();

      // 1. Append all text data as JSON strings
      formData.append('masaDetails', JSON.stringify(masaDetails));
      formData.append('assessmentHistory', JSON.stringify(assessmentHistory));

      // Create a version of findings without file objects for the JSON part
      const findingsTextData = findings.map(finding => {
        const { screenshots, ...findingRest } = finding;
        const screenshotsTextData = screenshots.map(({ files, ...ssRest }) => ssRest);
        return { ...findingRest, screenshots: screenshotsTextData };
      });
      formData.append('findings', JSON.stringify(findingsTextData));

      // 2. Append all screenshot files, keyed by their unique ID
      findings.forEach(finding => {
        finding.screenshots.forEach(screenshot => {
          screenshot.files.forEach((file, fileIndex) => {
            formData.append(`screenshot_${screenshot.id}_${fileIndex}`, file);
          });
        });
      });

      // 3. Make the API call to the new endpoint
      const response = await fetch(`${API_BASE_URL}/api/generate-masa-report`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) { throw new Error(`Server responded with status: ${response.status}`); }

      // 4. Handle the PDF download
      const pdfBlob = await response.blob();
      const url = window.URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'masa-report.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error generating MASA report:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>MASA Report Generator</h1>
        <Link to="/" style={{ color: 'white', textDecoration: 'none', marginLeft: 'auto' }}>
          &larr; Back to Home
        </Link>
      </header>

      <main className="main-content">
        <section className="card details-section">
          <h2>MASA Assessment Details</h2>
          <form className="report-form">
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="applicationId">Application ID</label>
                <input type="text" id="applicationId" value={masaDetails.applicationId} onChange={handleDetailsChange} placeholder="e.g., MASA-APP-001" />
              </div>
              <div className="form-group">
                <label htmlFor="applicationName">Application Name</label>
                <input type="text" id="applicationName" value={masaDetails.applicationName} onChange={handleDetailsChange} placeholder="e.g., Mobile Banking App" />
              </div>
              {/* New fields based on Word doc */}
              <div className="form-group">
                <label htmlFor="version">Version</label>
                <input type="text" id="version" value={masaDetails.version} onChange={handleDetailsChange} />
              </div>
              <div className="form-group">
                <label htmlFor="date">Date</label>
                <input type="date" id="date" value={masaDetails.date} onChange={handleDetailsChange} />
              </div>
              <div className="form-group">
                <label htmlFor="author">Author</label>
                <input type="text" id="author" value={masaDetails.author} onChange={handleDetailsChange} placeholder="Author's Name" />
              </div>
              <div className="form-group">
                <label htmlFor="reviewedBy">Reviewed By</label>
                <input type="text" id="reviewedBy" value={masaDetails.reviewedBy} onChange={handleDetailsChange} placeholder="Reviewer's Name" />
              </div>
              <div className="form-group">
                <label htmlFor="approvedBy">Approved By</label>
                <input type="text" id="approvedBy" value={masaDetails.approvedBy} onChange={handleDetailsChange} placeholder="Approver's Name" />
              </div>
              <div className="form-group">
                <label htmlFor="applicationUrl">Application URL</label>
                <input type="text" id="applicationUrl" value={masaDetails.applicationUrl} onChange={handleDetailsChange} placeholder="e.g., https://app.example.com" />
              </div>
              <div className="form-group full-width">
                <label htmlFor="scopeUrl">Scope (URLs)</label>
                <textarea id="scopeUrl" value={masaDetails.scopeUrl} onChange={handleDetailsChange} rows="2" placeholder="List of URLs in scope, one per line" />
              </div>
              <div className="form-group full-width">
                <label htmlFor="scopeUserRoles">Scope (User Roles)</label>
                <textarea id="scopeUserRoles" value={masaDetails.scopeUserRoles} onChange={handleDetailsChange} rows="2" placeholder="List of user roles tested, e.g., Admin, User, Guest" />
              </div>
            </div>
          </form>
        </section>

        <section className="card details-section history-section">
          <h2>Assessment History</h2>
          <div className="report-form">
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="h-version">Version</label>
                <input type="text" id="h-version" value={tempHistoryEntry.version} onChange={(e) => setTempHistoryEntry(p => ({...p, version: e.target.value}))} />
              </div>
              <div className="form-group">
                <label htmlFor="h-scanDetails">Scan Details</label>
                <input type="text" id="h-scanDetails" placeholder="e.g., Initial Scan" value={tempHistoryEntry.scanDetails} onChange={(e) => setTempHistoryEntry(p => ({...p, scanDetails: e.target.value}))} />
              </div>
              <div className="form-group"><label htmlFor="h-startDate">Start Date</label><input type="date" id="h-startDate" value={tempHistoryEntry.startDate} onChange={(e) => setTempHistoryEntry(p => ({...p, startDate: e.target.value}))} /></div>
              <div className="form-group"><label htmlFor="h-endDate">End Date</label><input type="date" id="h-endDate" value={tempHistoryEntry.endDate} onChange={(e) => setTempHistoryEntry(p => ({...p, endDate: e.target.value}))} /></div>
              <div className="form-group"><label htmlFor="h-assessedBy">Assessed By</label><input type="text" id="h-assessedBy" placeholder="Analyst Name" value={tempHistoryEntry.assessedBy} onChange={(e) => setTempHistoryEntry(p => ({...p, assessedBy: e.target.value}))} /></div>
            </div>
            <button type="button" onClick={handleAddHistory} className="history-add-btn">Add History Entry</button>
          </div>
          <div className="evidence-table">
            {assessmentHistory.map(h => <div className="evidence-row" key={h.id}><span>{h.version}</span><span>{h.scanDetails}</span><span>{h.assessedBy}</span><button type="button" onClick={() => removeHistory(h.id)} className="remove-btn">Remove</button></div>)}
          </div>
        </section>

        <div className="workspace-section">
          <section className="card form-panel">
            <h2>Add a New Finding</h2>
            <form onSubmit={handleAddFinding} className="report-form" noValidate>
              {/* Main Finding Details */}
              <div className="form-grid">
                <div className="form-group full-width">
                  <label htmlFor="observation">Observation</label>
                  <textarea id="observation" name="observation" value={currentFinding.observation} onChange={handleCurrentFindingChange} rows="3" required />
                </div>
                <div className="form-group">
                  <label htmlFor="risk">Risk Rating</label>
                  <select id="risk" name="risk" value={currentFinding.risk} onChange={handleCurrentFindingChange}>
                    {MASA_RISK_RATINGS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="sop">Sophistication (Sop)</label>
                  <select id="sop" name="sop" value={currentFinding.sop} onChange={handleCurrentFindingChange}>
                    {MASA_SOP_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div className="form-group full-width">
                  <label htmlFor="impact">Impact to Cognizant</label>
                  <textarea id="impact" name="impact" value={currentFinding.impact} onChange={handleCurrentFindingChange} rows="3" />
                </div>
                <div className="form-group">
                  <label htmlFor="rem">Remediation Effort (Rem)</label>
                  <select id="rem" name="rem" value={currentFinding.rem} onChange={handleCurrentFindingChange}>
                    {MASA_REM_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="status">Status</label>
                  <select id="status" name="status" value={currentFinding.status} onChange={handleCurrentFindingChange}>
                    {MASA_STATUS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div className="form-group full-width">
                  <label htmlFor="recommendation">Recommendation</label>
                  <textarea id="recommendation" name="recommendation" value={currentFinding.recommendation} onChange={handleCurrentFindingChange} rows="3" />
                </div>
              </div>

              {/* Sub-sections for evidence, moved inside the main form */}
              <div className="evidence-container">
                <div className="sub-section">
                  <h4 className="ss-header">Screen shots</h4>
                  <div className="sub-form">
                    <input type="text" placeholder="Title" value={tempScreenshot.title} onChange={(e) => setTempScreenshot(p => ({...p, title: e.target.value}))} />
                    <input type="file" multiple ref={screenshotFileInputRef} onChange={(e) => setTempScreenshot(p => ({...p, files: Array.from(e.target.files)}))} />
                    <button type="button" onClick={handleAddScreenshot} className="ss-add-btn">Add</button>
                  </div>
                  <div className="evidence-table">
                    {currentFinding.screenshots.map((ss, index) => (
                      <div className="evidence-row" key={ss.id}>
                        <span>{index + 1}</span>
                        <span>{ss.title}</span>
                        <span className="file-list">{ss.files.map(f => f.name).join(', ')}</span>
                        <button type="button" onClick={() => removeScreenshot(ss.id)} className="remove-btn">Remove</button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="sub-section">
                  <h4 className="tools-header">Tools Used</h4>
                  <p style={{ fontStyle: 'italic', fontSize: '0.9em', color: '#555', margin: '0.5rem 0' }}>
                    Note: Add new information only if there are changes or additions not previously documented.
                  </p>
                  <div className="sub-form">
                    <input type="text" placeholder="Tool (e.g., Burp Suite)" value={tempTool.tool} onChange={(e) => setTempTool(p => ({...p, tool: e.target.value}))} />
                    <input type="text" placeholder="Classification (e.g., Proxy)" value={tempTool.classification} onChange={(e) => setTempTool(p => ({...p, classification: e.target.value}))} />
                    <input type="text" placeholder="Purpose (e.g., Traffic Interception)" value={tempTool.purpose} onChange={(e) => setTempTool(p => ({...p, purpose: e.target.value}))} />
                    <button type="button" onClick={handleAddTool} className="tools-add-btn">Add</button>
                  </div>
                  <div className="evidence-table">
                    {currentFinding.tools.map(t => <div className="evidence-row" key={t.id}><span>{t.tool}</span><span>{t.classification}</span><span>{t.purpose}</span><button type="button" onClick={() => removeTool(t.id)} className="remove-btn">Remove</button></div>)}
                  </div>
                </div>

                <div className="sub-section">
                  <h4 className="links-header">Reference Links</h4>
                  <p style={{ fontStyle: 'italic', fontSize: '0.9em', color: '#555', margin: '0.5rem 0' }}>
                    Note: Add new information only if there are changes or additions not previously documented.
                  </p>
                  <div className="details-grid">
                    <div>
                      <h5>External Links</h5>
                      <div className="sub-form">
                        <input type="text" placeholder="Link URL" value={tempExternalLink.link} onChange={(e) => setTempExternalLink(p => ({...p, link: e.target.value}))} />
                        <input type="text" placeholder="Remarks" value={tempExternalLink.remarks} onChange={(e) => setTempExternalLink(p => ({...p, remarks: e.target.value}))} />
                        <button type="button" onClick={handleAddExternalLink} className="links-add-btn">Add</button>
                      </div>
                      <div className="evidence-table">{currentFinding.externalLinks.map(l => <div className="evidence-row" key={l.id}><span>{l.link}</span><span>{l.remarks}</span><button type="button" onClick={() => removeExternalLink(l.id)} className="remove-btn">Remove</button></div>)}</div>
                    </div>
                    <div>
                      <h5>Internal Links</h5>
                      <div className="sub-form">
                        <input type="text" placeholder="Link URL" value={tempInternalLink.link} onChange={(e) => setTempInternalLink(p => ({...p, link: e.target.value}))} />
                        <input type="text" placeholder="Remarks" value={tempInternalLink.remarks} onChange={(e) => setTempInternalLink(p => ({...p, remarks: e.target.value}))} />
                        <button type="button" onClick={handleAddInternalLink} className="links-add-btn">Add</button>
                      </div>
                      <div className="evidence-table">{currentFinding.internalLinks.map(l => <div className="evidence-row" key={l.id}><span>{l.link}</span><span>{l.remarks}</span><button type="button" onClick={() => removeInternalLink(l.id)} className="remove-btn">Remove</button></div>)}</div>
                    </div>
                  </div>
                </div>
              </div>

              <button type="submit" className="add-finding-btn">Add Complete Finding to Report</button>
            </form>
          </section>

          <section className="card list-panel">
            <h2 className="findings-header">Findings and Recommendations</h2>
            <div className="summary-bar">
              <span>Total: {findingSummary.total} | Open: {findingSummary.open} | Fixed: {findingSummary.fixed}</span>
              <small>{findingSummary.breakdown}</small>
            </div>
            <div className="vuln-list-container">
              {findings.length > 0 ? (
                <table className="findings-table">
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>Risk</th>
                      <th>Status</th>
                      <th>Observation</th>
                      <th>Sop</th>
                      <th>Impact</th>
                      <th>Rem</th>
                      <th>Recommendation</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {findings.map((finding, index) => (
                      <tr key={finding.id}>
                        <td>{index + 1}</td>
                        <td>{finding.risk}</td>
                        <td>{finding.status}</td>
                        <td>{finding.observation.substring(0, 40)}...</td>
                        <td>{finding.sop}</td>
                        <td>{finding.impact.substring(0, 40)}...</td>
                        <td>{finding.rem}</td>
                        <td>{finding.recommendation.substring(0, 40)}...</td>
                        <td><button onClick={() => setFindings(f => f.filter(item => item.id !== finding.id))} className="remove-btn">Remove</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>No findings added yet.</p>
              )}
            </div>
            <div className="generate-section">
              <button onClick={handleGenerateMasaReport} disabled={isLoading || findings.length === 0}>
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

export default MasaGenerator;
