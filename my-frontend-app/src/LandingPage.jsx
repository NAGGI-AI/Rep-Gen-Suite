import React from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';

function LandingPage() {
  return (
    <div className="landing-container">
      <div className="landing-content">
        <h1 className="landing-title">Report Generator Suite</h1>
        <p className="landing-subtitle">Please select the type of assessment report you wish to create.</p>
        <div className="card-container">
          <Link to="/dast" className="report-card dast-card">
            <div className="card-icon">🚀</div>
            <h2>DAST Report</h2>
            <p>Dynamic Application Security Testing</p>
          </Link>
          <Link to="/masa" className="report-card masa-card">
            <div className="card-icon">📱</div>
            <h2>MASA Report</h2>
            <p>Manual Application Security Assessment</p>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default LandingPage;