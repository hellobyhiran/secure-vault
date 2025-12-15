
# Security Policy

## Supported Versions

As this is a portfolio project, we currently support the latest version deployed to the main branch.

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take security seriously, even for demonstration projects. If you discover a vulnerability, please report it via email instead of opening a public issue.

### Where to Report
Please email your findings to *hiranbiswasth@gmail.com*.

### What to Include
* Description of the vulnerability.
* Steps to reproduce the issue.
* Any relevant code snippets or screenshots.

### Response Timeline
* You can expect an acknowledgement of your report within **48 hours**.
* We will review the issue and notify you if it is accepted as a valid vulnerability within **1 week**.

### Important Note on Scope
Please note that **SecureVault** is a front-end demonstration of Firebase integration. The following are **known architectural limitations** and do not need to be reported as vulnerabilities:
* Passwords stored in plain text in the Firebase Realtime Database (client-side encryption is not currently implemented).
* Exposure of Firebase API keys in `script.js` (this is standard for client-side Firebase apps, relying on security rules).
