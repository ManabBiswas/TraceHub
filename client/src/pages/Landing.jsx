import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Database, GraduationCap, ShieldCheck, Workflow, Wrench } from 'lucide-react';

const Landing = () => {
  const sectionShell = 'mx-auto w-full max-w-[1240px] px-4 md:px-8';

  return (
    <div className="overflow-hidden bg-[#1f2925] text-slate-100">
      <div className="bg-[radial-gradient(740px_460px_at_22%_24%,rgba(35,248,170,0.3),transparent_72%),radial-gradient(980px_520px_at_74%_76%,rgba(35,248,170,0.15),transparent_70%),linear-gradient(135deg,#26312d_0%,#1f2925_58%,#25302b_100%)] py-16 md:py-24">
        <div className={sectionShell}>
          <span className="mb-4 inline-block text-xs font-bold uppercase tracking-[0.14em] text-[#a7b3ad]">Data-First Academic Infrastructure</span>
          <h1 className="mb-6 max-w-[16ch] text-4xl font-extrabold leading-[1.08] tracking-tight md:text-6xl">Cultivate your resources, harvest verified outcomes.</h1>
          <p className="mb-8 max-w-3xl text-lg leading-8 text-[#b7c3be]">
            TraceHub helps institutions publish, validate, and access learning resources with secure workflows,
            AI-assisted analysis, and immutable blockchain evidence.
          </p>

          <div className="mb-12 flex flex-wrap gap-4">
            <Link to="/register" className="inline-flex items-center gap-2 rounded-lg border border-[#2ff5a8] bg-[#2ff5a8] px-6 py-3 font-semibold text-[#142019] shadow-[0_8px_28px_rgba(47,245,168,0.28)] transition hover:bg-[#24d993]">
              Start With TraceHub
              <ArrowRight size={18} />
            </Link>
            <Link to="/resources" className="inline-flex items-center rounded-lg border border-white/20 bg-white/10 px-6 py-3 font-semibold text-slate-100 transition hover:bg-white/20">
              Explore Resources
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-3 rounded-full border border-[#2ff5a857] bg-[#2ff5a8] px-4 py-3 text-[#132019]">
              <strong className="text-3xl leading-none">91%</strong>
              <span className="text-sm leading-tight">users rate verified documents as more reliable</span>
            </div>
            <div className="flex items-center gap-3 rounded-full border border-[#2ff5a857] bg-[#2ff5a8] px-4 py-3 text-[#132019]">
              <strong className="text-3xl leading-none">32%</strong>
              <span className="text-sm leading-tight">faster review cycles with structured approval flow</span>
            </div>
            <div className="flex items-center gap-3 rounded-full border border-[#2ff5a857] bg-[#2ff5a8] px-4 py-3 text-[#132019]">
              <strong className="text-3xl leading-none">24/7</strong>
              <span className="text-sm leading-tight">access to indexed, permission-controlled resources</span>
            </div>
          </div>
        </div>
      </div>

      <section className="bg-[radial-gradient(700px_420px_at_18%_20%,rgba(35,248,170,0.24),transparent_72%),radial-gradient(920px_520px_at_78%_80%,rgba(35,248,170,0.12),transparent_70%),linear-gradient(138deg,#24312c_0%,#1f2925_60%,#24312c_100%)] py-20">
        <div className={sectionShell}>
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-[#9ec0b2]">Expertise</p>
          <h2 className="mb-10 max-w-[20ch] text-4xl font-extrabold leading-tight tracking-tight text-slate-100 md:text-5xl">Discover the full extent of TraceHub capabilities</h2>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-2xl border border-[#2ff5a838] bg-white/10 p-6 shadow-2xl backdrop-blur">
              <GraduationCap size={28} className="mb-4 text-[#8cf0c8]" />
              <h3 className="mb-3 text-xl font-semibold text-[#e8f2ed]">Skill Development</h3>
              <p className="leading-7 text-[#bfd0c8]">Build data literacy and document governance habits across student and faculty teams.</p>
            </div>

            <div className="rounded-2xl border border-[#2ff5a838] bg-white/10 p-6 shadow-2xl backdrop-blur">
              <Workflow size={28} className="mb-4 text-[#8cf0c8]" />
              <h3 className="mb-3 text-xl font-semibold text-[#e8f2ed]">Smart Workflows</h3>
              <p className="leading-7 text-[#bfd0c8]">Guide uploads through role-aware validation paths and transparent approval stages.</p>
            </div>

            <div className="rounded-2xl border border-[#2ff5a838] bg-white/10 p-6 shadow-2xl backdrop-blur">
              <ShieldCheck size={28} className="mb-4 text-[#8cf0c8]" />
              <h3 className="mb-3 text-xl font-semibold text-[#e8f2ed]">Blockchain Confidence</h3>
              <p className="leading-7 text-[#bfd0c8]">Anchor publication proofs on Algorand to preserve integrity and traceability.</p>
            </div>

            <div className="rounded-2xl border border-[#2ff5a838] bg-white/10 p-6 shadow-2xl backdrop-blur">
              <Database size={28} className="mb-4 text-[#8cf0c8]" />
              <h3 className="mb-3 text-xl font-semibold text-[#e8f2ed]">Data Engineering</h3>
              <p className="leading-7 text-[#bfd0c8]">Securely store and organize resources with resilient structures designed for scale.</p>
            </div>

            <div className="rounded-2xl border border-[#2ff5a838] bg-white/10 p-6 shadow-2xl backdrop-blur">
              <Wrench size={28} className="mb-4 text-[#8cf0c8]" />
              <h3 className="mb-3 text-xl font-semibold text-[#e8f2ed]">Operational Control</h3>
              <p className="leading-7 text-[#bfd0c8]">Track submissions, approvals, and access patterns with actionable operational insight.</p>
            </div>

            <div className="rounded-2xl border border-[#2ff5a838] bg-white/10 p-6 shadow-2xl backdrop-blur">
              <CheckCircle2 size={28} className="mb-4 text-[#8cf0c8]" />
              <h3 className="mb-3 text-xl font-semibold text-[#e8f2ed]">Quality Governance</h3>
              <p className="leading-7 text-[#bfd0c8]">Apply clear governance rules so every shared asset meets institutional standards.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[radial-gradient(680px_400px_at_28%_12%,rgba(35,248,170,0.26),transparent_72%),linear-gradient(140deg,#25302b_0%,#1f2925_62%,#1f2925_100%)] py-20">
        <div className={sectionShell}>
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-[#9fc0b2]">Methodology</p>
          <h2 className="mb-10 max-w-[20ch] text-4xl font-extrabold leading-tight tracking-tight text-slate-100 md:text-5xl">From diagnosis to implementation</h2>
          <div className="grid gap-5 md:grid-cols-3">
            <div className="rounded-2xl border border-[#2ff5a838] bg-white/10 p-8 shadow-2xl backdrop-blur">
              <h3 className="mb-3 text-[34px] font-semibold text-[#e8f2ed] md:text-3xl">Understand the current state</h3>
              <p className="leading-8 text-[#bfd0c8]">Assess processes, document quality, and collaboration gaps to define a clear baseline.</p>
            </div>

            <div className="rounded-2xl border border-[#2ff5a838] bg-white/10 p-8 shadow-2xl backdrop-blur">
              <h3 className="mb-3 text-[34px] font-semibold text-[#e8f2ed] md:text-3xl">Define a target model</h3>
              <p className="leading-8 text-[#bfd0c8]">Align policy, ownership, and platform goals with your academic strategy and governance needs.</p>
            </div>

            <div className="rounded-2xl border border-[#2ff5a838] bg-white/10 p-8 shadow-2xl backdrop-blur">
              <h3 className="mb-3 text-[34px] font-semibold text-[#e8f2ed] md:text-3xl">Execute with a guided roadmap</h3>
              <p className="leading-8 text-[#bfd0c8]">Deploy workflows, AI analysis, and blockchain proof in a practical, impact-driven sequence.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#1f2925] py-20">
        <div className={sectionShell}>
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-[#9fc0b2]">Where to start</p>
          <h2 className="mb-6 max-w-[20ch] text-4xl font-extrabold leading-tight tracking-tight text-slate-100 md:text-5xl">Move from scattered files to accountable knowledge systems</h2>
          <p className="mb-8 max-w-3xl text-lg leading-8 text-slate-300">Launch your institution on a platform where every resource is structured, discoverable, and verifiable.</p>
          <Link to="/register" className="inline-flex items-center gap-2 rounded-lg border border-[#2ff5a8] bg-[#2ff5a8] px-6 py-3 font-semibold text-[#142019] transition hover:bg-[#24d993]">
            Create Your Workspace
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Landing;
