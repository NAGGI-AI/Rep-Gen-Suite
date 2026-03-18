import { createRequire } from 'node:module';

// --- Database Setup ---
// Use `require` to directly import the JSON data. This is the most robust and
// efficient way to handle static, read-only data. It avoids all runtime file
// I/O operations, which is crucial for stable cloud deployments.
const require = createRequire(import.meta.url);
const vulnerabilityData = require('./vulnerabilities.json');

console.log(`✅ Successfully loaded ${vulnerabilityData.length} vulnerabilities from vulnerabilities.json.`);

// We will export an object that mimics the structure of the old `db` object.
// This ensures that no changes are needed in `server.js`. The `server.js` file
// can continue to access the data via `db.data.vulnerabilities`.
const db = {
  data: {
    vulnerabilities: vulnerabilityData
  }
};

export default db;
