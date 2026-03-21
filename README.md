# TraceHub 🧠
### Institutional Memory Engine for Universities

> A decentralized, AI-powered academic archive that solves two real problems in modern universities: fragile storage and unverifiable student work.

Built for **Binary V2 Hackathon** — 36-hour sprint.

---

## The Problem

By the time a B.Tech student graduates, every project they built has vanished onto a local hard drive. Every syllabus a professor uploaded to a temporary Google Drive link is dead.

- **For professors:** No immutable record of what was published on Day 1 — leading to disputes over deadlines and rubrics.
- **For students:** No way to prove to a recruiter that their GitHub project is original and timestamped.
- **For institutions:** Years of intellectual capital lost to server crashes and expired accounts.

---

## The Solution

TraceHub is a unified upload platform for academic institutions. When a professor or student uploads a document:

1. The file is stored on **Duality** (decentralized storage) — no single point of failure.
2. A 0-ALGO transaction is minted on **Algorand Testnet**, encoding the file hash, uploader name, and timestamp into the blockchain as an immutable record.
3. The document text is routed through **Requesty** to a large language model, which auto-generates AI summaries, flashcards (for professors), or a tech-stack analysis (for students).
4. Everything is saved to **MongoDB Atlas** and surfaced on a clean public dashboard.

The result: a permanent, AI-enriched, blockchain-timestamped academic archive.

---

## Tracks Targeted

| Track | Prize | How we qualify |
|---|---|---|
| Education | ₹10K | Reimagining project submission and the college LMS |
| Algorand | $500 | Blockchain as a tamper-proof publication notary |
| Duality | $200 | Decentralized storage for academic files |
| Requesty | $150 | Dynamic AI routing for document analysis |
| AI/ML | ₹10K | Semantic analysis of academic documents |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TailwindCSS |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas + Mongoose |
| AI Routing | Requesty API |
| Decentralized Storage | Duality Network |
| Blockchain Notary | Algorand Testnet (algosdk) |
| File Parsing | multer, pdf-parse |

---

## Features (MVP)

### Professor Flow
- Upload a PDF syllabus or lecture notes
- File stored permanently on Duality
- Algorand TXID generated as proof of publication timestamp
- AI auto-generates a 3-sentence summary and 5 flashcards for students

### Student Flow
- Upload a project README or abstract as PDF
- File stored on Duality, timestamped on Algorand
- AI extracts the tech stack and writes an architecture summary
- Public profile page with an "Algorand Verified" badge linking to the testnet explorer

---

## Project Structure

```
tracehub-hackathon/
├── client/                   # React + Vite frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── UploadForm.jsx
│   │   │   ├── ResourceCard.jsx
│   │   │   ├── FlashcardViewer.jsx
│   │   │   └── AlgorandBadge.jsx
│   │   ├── pages/
│   │   │   ├── Home.jsx        # Global library feed
│   │   │   └── ResourceDetail.jsx
│   │   └── App.jsx
│   └── package.json
│
├── server/                   # Node.js + Express backend
│   ├── models/
│   │   └── Resource.js        # Mongoose schema
│   ├── routes/
│   │   └── upload.js          # POST /api/upload
│   ├── services/
│   │   ├── requesty.service.js
│   │   ├── algorand.service.js
│   │   └── duality.service.js
│   ├── middleware/
│   │   └── upload.middleware.js  # multer config
│   ├── utils/
│   │   └── pdfParser.js
│   ├── .env                   # NOT committed to git
│   └── index.js
│
└── README.md
```

---

## Quick Start

See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for full step-by-step instructions including environment variables, Algorand wallet setup, and running both servers.

**Short version:**
```bash
# Clone
git clone <repo-url> && cd tracehub-hackathon

# Server
cd server && npm install && npm run dev

# Client (new terminal)
cd client && npm install && npm run dev
```

Frontend runs on `http://localhost:5173`, backend on `http://localhost:3000`.

---

## Demo

> Upload flow → AI analysis → Algorand verification

1. Open the app and select role: **Professor** or **Student**
2. Fill in your name, title, and upload a PDF (max 5MB)
3. Watch the pipeline run: file parsed → AI analysis → Duality upload → Algorand mint
4. View your resource card with the green **Verified on Algorand** badge
5. Click the badge to open the live transaction on the Algorand Testnet Explorer

---

## Limitations (Hackathon MVP)

- PDF uploads only, max 5MB
- Algorand Testnet only (not Mainnet)
- No user authentication — uploader name is a plain text field
- No forking/lineage system in this release (planned for v2)
- AI originality score is based on architectural analysis of the abstract, not a plagiarism check

---
