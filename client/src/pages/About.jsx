import React from "react";
import { Link } from "react-router-dom";

const About = () => {
  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="rounded-lg border border-[#2ff5a838] bg-[#0f1613d9] p-8 text-center">
        <h1 className="text-4xl font-bold text-[#2ff5a8] mb-3">TraceHub</h1>
        <p className="text-xl text-[#bcd2c9] mb-2">
          A Decentralized Academic Archive
        </p>
        <p className="text-base text-[#8cf0c8]">
          Institutional Memory Engine for Universities
        </p>
      </section>

      {/* Problem Section */}
      <section className="rounded-lg border border-white/10 bg-[#1f292580] p-6">
        <h2 className="text-2xl font-bold text-[#e8f2ed] mb-4">
          The Problem We Solve
        </h2>
        <div className="space-y-4 text-[#bcd2c9]">
          <p className="leading-relaxed">
            By the time a student graduates, every project they built has vanished onto a local hard drive. Every syllabus a professor uploaded to a temporary link is dead.
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded border border-[#2ff5a833] bg-[#0f1613a6] p-4">
              <h3 className="font-semibold text-[#2ff5a8] mb-2">For Professors</h3>
              <p className="text-sm">
                No immutable record of what was published on Day 1 — leading to disputes over deadlines and rubrics.
              </p>
            </div>
            <div className="rounded border border-[#2ff5a833] bg-[#0f1613a6] p-4">
              <h3 className="font-semibold text-[#2ff5a8] mb-2">For Students</h3>
              <p className="text-sm">
                No way to prove to a recruiter that their project is original and timestamped.
              </p>
            </div>
            <div className="rounded border border-[#2ff5a833] bg-[#0f1613a6] p-4">
              <h3 className="font-semibold text-[#2ff5a8] mb-2">For Institutions</h3>
              <p className="text-sm">
                Years of intellectual capital lost to server crashes and expired accounts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="rounded-lg border border-white/10 bg-[#1f292580] p-6">
        <h2 className="text-2xl font-bold text-[#e8f2ed] mb-4">
          Our Solution
        </h2>
        <div className="space-y-4">
          <p className="text-[#bcd2c9] leading-relaxed">
            TraceHub is a unified platform for academic institutions. When a professor or student uploads a document:
          </p>
          <div className="space-y-3">
            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#2ff5a8] flex items-center justify-center text-[#142019] font-bold">
                1
              </div>
              <div>
                <h3 className="font-semibold text-[#e8f2ed]">Decentralized Storage</h3>
                <p className="text-[#bcd2c9] text-sm">
                  Files are stored on Pinata — no single point of failure.
                </p>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#2ff5a8] flex items-center justify-center text-[#142019] font-bold">
                2
              </div>
              <div>
                <h3 className="font-semibold text-[#e8f2ed]">Blockchain Proof</h3>
                <p className="text-[#bcd2c9] text-sm">
                  A transaction is minted on Algorand Testnet, encoding the file hash, uploader name, and timestamp as an immutable record.
                </p>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#2ff5a8] flex items-center justify-center text-[#142019] font-bold">
                3
              </div>
              <div>
                <h3 className="font-semibold text-[#e8f2ed]">AI Analysis</h3>
                <p className="text-[#bcd2c9] text-sm">
                  Document text is routed through Requesty to generate AI summaries, flashcards for professors, or tech-stack analysis for students.
                </p>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#2ff5a8] flex items-center justify-center text-[#142019] font-bold">
                4
              </div>
              <div>
                <h3 className="font-semibold text-[#e8f2ed]">Permanent Archive</h3>
                <p className="text-[#bcd2c9] text-sm">
                  Everything is saved to MongoDB Atlas and surfaced on a clean public dashboard.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="rounded-lg border border-white/10 bg-[#1f292580] p-6">
        <h2 className="text-2xl font-bold text-[#e8f2ed] mb-4">
          Key Features
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded border border-[#2ff5a833] bg-[#0f1613a6] p-4">
            <h3 className="font-semibold text-[#2ff5a8] mb-3">👨‍🎓 Student Features</h3>
            <ul className="space-y-2 text-sm text-[#bcd2c9]">
              <li className="flex items-start gap-2">
                <span className="text-[#2ff5a8]">•</span>
                <span>Upload project submissions and assignments</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#2ff5a8]">•</span>
                <span>Blockchain-timestamped verification</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#2ff5a8]">•</span>
                <span>AI-generated tech-stack analysis</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#2ff5a8]">•</span>
                <span>Public profile with "Blockchain Verified" badge</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#2ff5a8]">•</span>
                <span>Track submission history</span>
              </li>
            </ul>
          </div>

          <div className="rounded border border-[#2ff5a833] bg-[#0f1613a6] p-4">
            <h3 className="font-semibold text-[#2ff5a8] mb-3">👨‍🏫 Professor Features</h3>
            <ul className="space-y-2 text-sm text-[#bcd2c9]">
              <li className="flex items-start gap-2">
                <span className="text-[#2ff5a8]">•</span>
                <span>Upload syllabi and lecture materials</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#2ff5a8]">•</span>
                <span>Permanent publication timestamp</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#2ff5a8]">•</span>
                <span>AI-generated summaries and flashcards</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#2ff5a8]">•</span>
                <span>Manage classrooms and assignments</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#2ff5a8]">•</span>
                <span>Approve student submissions</span>
              </li>
            </ul>
          </div>

          <div className="rounded border border-[#2ff5a833] bg-[#0f1613a6] p-4 md:col-span-2">
            <h3 className="font-semibold text-[#2ff5a8] mb-3">🏛️ Institutional Features</h3>
            <ul className="space-y-2 text-sm text-[#bcd2c9]">
              <li className="flex items-start gap-2">
                <span className="text-[#2ff5a8]">•</span>
                <span>Immutable record of all academic work</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#2ff5a8]">•</span>
                <span>Decentralized storage — no single point of failure</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#2ff5a8]">•</span>
                <span>AI-powered academic analytics</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#2ff5a8]">•</span>
                <span>Blockchain verification for authentic diplomas and transcripts</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Tech Stack Section */}
      <section className="rounded-lg border border-white/10 bg-[#1f292580] p-6">
        <h2 className="text-2xl font-bold text-[#e8f2ed] mb-4">
          Technology Stack
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded border border-[#2ff5a833] bg-[#0f1613a6] p-4">
            <h3 className="font-semibold text-[#2ff5a8] mb-2">Frontend</h3>
            <ul className="space-y-1 text-sm text-[#bcd2c9]">
              <li>React 18</li>
              <li>Vite</li>
              <li>TailwindCSS</li>
            </ul>
          </div>

          <div className="rounded border border-[#2ff5a833] bg-[#0f1613a6] p-4">
            <h3 className="font-semibold text-[#2ff5a8] mb-2">Backend</h3>
            <ul className="space-y-1 text-sm text-[#bcd2c9]">
              <li>Node.js</li>
              <li>Express.js</li>
              <li>MongoDB Atlas</li>
            </ul>
          </div>

          <div className="rounded border border-[#2ff5a833] bg-[#0f1613a6] p-4">
            <h3 className="font-semibold text-[#2ff5a8] mb-2">Integrations</h3>
            <ul className="space-y-1 text-sm text-[#bcd2c9]">
              <li>Algorand Blockchain</li>
              <li>Pinata (IPFS)</li>
              <li>Requesty AI</li>
            </ul>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="rounded-lg border border-[#2ff5a838] bg-[#0f1613d9] p-8 text-center">
        <h2 className="text-2xl font-bold text-[#e8f2ed] mb-4">
          Ready to Join TraceHub?
        </h2>
        <p className="text-[#bcd2c9] mb-6 max-w-2xl mx-auto">
          Start using our platform to securely upload, verify, and preserve your academic work with blockchain proof.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link
            to="/register/student"
            className="rounded-md border border-[#2ff5a8] bg-[#2ff5a8] px-6 py-2.5 text-sm font-semibold text-[#142019] transition btn-animated"
          >
            Sign Up as Student
          </Link>
          <Link
            to="/register/teacher"
            className="rounded-md border border-[#2ff5a8] px-6 py-2.5 text-sm font-semibold text-[#2ff5a8] transition btn-animated"
          >
            Sign Up as Professor
          </Link>
        </div>
      </section>

      {/* Footer Info */}
      <section className="text-center text-sm text-[#8cf0c8] py-4">
        <p>
          TraceHub is an institutional memory engine powered by blockchain technology, decentralized storage, and AI.
        </p>
      </section>
    </div>
  );
};

export default About;
