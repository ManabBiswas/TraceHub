# TraceHub : A Decentralized Academic Archive
### Institutional Memory Engine for Universities

> A decentralized, AI-powered academic archive that solves two real problems in modern universities: fragile storage and unverifiable student work.

---
Project maintained by Souradeep Roy

## The Problem

By the time a B.Tech student graduates, every project they built has vanished onto a local hard drive. Every syllabus a professor uploaded to a temporary Google Drive link is dead.

- **For professors:** No immutable record of what was published on Day 1 — leading to disputes over deadlines and rubrics.
- **For students:** No way to prove to a recruiter that their GitHub project is original and timestamped.
- **For institutions:** Years of intellectual capital lost to server crashes and expired accounts.

---

## The Solution

TraceHub is a unified upload platform for academic institutions. When a professor or student uploads a document:

1. The file is stored on **Pinata (IPFS)** — content-addressed, decentralized storage where the file's URL is its own hash, making tampering self-evident.
2. A 0-ALGO transaction is minted on **Algorand Testnet**, encoding a SHA-256 content hash, uploader name, and timestamp into the blockchain as an immutable record.
3. Everything is saved to **MongoDB Atlas** and surfaced on a clean dashboard.

The result: a permanent, blockchain-timestamped academic archive where any tampering with MongoDB is cryptographically detectable — the on-chain hash won't match.

---

## Tracks Targeted

| Track |  How we qualify |
|---|---|
| Education | Reimagining project submission and the college LMS |
| Algorand| Blockchain as a tamper-proof publication notary with content hash verification |


---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, TailwindCSS |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas + Mongoose |
| Decentralized Storage | Pinata (IPFS pinning service) |
| Blockchain Notary | Algorand Testnet (algosdk) |
| File Parsing | multer, pdf-parse |

---

## Features (MVP)

### Professor Flow
- Upload a PDF syllabus or lecture notes (up to 10MB)
- File pinned permanently to IPFS via Pinata; content-addressed URL stored
- Algorand TXID generated as cryptographic proof of publication timestamp
- SHA-256 content hash written to the blockchain for tamper detection


### Student Flow
- Submit a GitHub repository URL for project analysis
- Professor approves → file pinned to IPFS → Algorand verification TX minted → project visible in public gallery
- Blockchain-verified portfolio artifact shareable with recruiters

### Tamper Detection
- On approval, a SHA-256 hash of the resource metadata is written into the Algorand transaction note field
- `GET /api/verify/:txid` fetches the live transaction from Algorand's indexer, recomputes the hash from MongoDB, and returns `VALID`, `TAMPERED`, or `NOT_FOUND`
- Any modification to MongoDB after approval is cryptographically detectable

---

## Project Structure

```
tracehub-hackathon/
├── client/                        # React + Vite frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navigation.jsx
│   │   │   ├── VersionHistory.jsx
│   │   │   ├── ProjectAnalysisCard.jsx
│   │   │   └── LatexEditor.jsx
│   │   ├── pages/
│   │   │   ├── Landing.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Resources.jsx
│   │   │   ├── Classrooms.jsx
│   │   │   ├── ClassroomPostDetails.jsx
│   │   │   ├── ClassroomProjectDetails.jsx
│   │   │   ├── Upload.jsx
│   │   │   ├── Projects.jsx
│   │   │   └── Profile.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   └── config/
│   │       └── Api.jsx
│   └── package.json
│
├── server/                        # Node.js + Express backend
│   ├── src/
│   │   ├── models/
│   │   │   ├── User.js
│   │   │   ├── Resource.js
│   │   │   ├── Classroom.js
│   │   │   ├── ClassPost.js
│   │   │   ├── Submission.js
│   │   │   └── ProjectMetadata.js
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── upload.js
│   │   │   ├── resources.js
│   │   │   ├── classrooms.js
│   │   │   ├── pending.js
│   │   │   ├── verify.js
│   │   │   └── projectSubmissions.js
│   │   ├── services/
│   │   │   ├── algorand.service.js   # Blockchain notary
│   │   │   ├── storage.service.js    # Pinata/IPFS upload
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.js
│   │   │   ├── upload.middleware.js
│   │   │   └── submissionUpload.middleware.js
│   │   └── utils/
│   │       ├── pdfParser.js
│   │       ├── githubFetcher.js
│   │       └── contentHash.js        # SHA-256 tamper detection
│   ├── scripts/
│   │   └── seedUsersWithResources.js
│   ├── .env.example
│   └── server.js
│
└── README.md
```

---

## Quick Start

```bash
# Clone
git clone <repo-url> && cd tracehub-hackathon

# Server
cd server && npm install && npm run dev

# Client (new terminal)
cd client && npm install && npm run dev
```

Frontend: `http://localhost:5173` — Backend: `http://localhost:3000`

---

## Environment Variables

Create `server/.env` — see `server/.env.example` for the full template.

```env
# Core
PORT=3000
MONGODB_URL=mongodb+srv://<user>:<password>@cluster.mongodb.net/tracehub
JWT_SECRET=your_jwt_secret

# Decentralized Storage (Pinata/IPFS)
PINATA_JWT=your_pinata_jwt_here

# Blockchain (Algorand Testnet)
ALGORAND_ADMIN_MNEMONIC=word1 word2 ... word25
ALGOD_SERVER=https://testnet-api.algonode.cloud
ALGOD_PORT=443
ALGOD_TOKEN=xxxx

# Demo mode (skips real blockchain calls for fast demo)
ALGORAND_DEMO_FALLBACK=false
```

**Getting your keys:**

- **Pinata:** Free tier at [app.pinata.cloud](https://app.pinata.cloud) → API Keys → New Key → copy the JWT
- **Algorand wallet:** Generate a testnet keypair, fund it at the [Algorand Testnet Dispenser](https://testnet.algoexplorer.io/dispenser)

---

## How Tamper Detection Works

```
Upload → SHA-256 hash of metadata → written to Algorand TX note field
                                              ↓
GET /api/verify/:txid → fetch TX from Algorand indexer
                      → recompute hash from MongoDB
                      → compare → VALID / TAMPERED / NOT_FOUND
Project maintained by Souradeep Roy
```

Any change to MongoDB after the blockchain record is created produces a hash mismatch, proving tampering. The blockchain record itself is immutable.
