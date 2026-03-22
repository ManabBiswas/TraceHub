import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, MapPin, Github, Linkedin, Twitter } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-24 border-t border-[#2ff5a833] bg-[#1b2521] text-slate-50">
      <div className="mx-auto grid w-full max-w-360 grid-cols-1 gap-8 px-4 pb-8 pt-10 md:px-8 lg:grid-cols-4">
        {/* Brand Section */}
        <div className="flex flex-col lg:col-auto">
          <h3 className="mb-3 text-2xl font-bold text-white">TraceHub</h3>
          <p className="mb-4 max-w-md text-sm leading-7 text-slate-300">A secure platform for publishing and verifying academic resources with blockchain proof.</p>
          <div className="mt-2 flex gap-4">
            <a href="#github" title="GitHub" className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[#33433c] bg-[#23302a] text-slate-50 transition hover:-translate-y-1 hover:bg-[#2d3d36]">
              <Github size={20} />
            </a>
            <a href="#linkedin" title="LinkedIn" className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[#33433c] bg-[#23302a] text-slate-50 transition hover:-translate-y-1 hover:bg-[#2d3d36]">
              <Linkedin size={20} />
            </a>
            <a href="#twitter" title="Twitter" className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[#33433c] bg-[#23302a] text-slate-50 transition hover:-translate-y-1 hover:bg-[#2d3d36]">
              <Twitter size={20} />
            </a>
          </div>
        </div>

        {/* Quick Links */}
        <div className="flex flex-col">
          <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-100">Quick Links</h4>
          <ul className="space-y-2">
            <li><Link to="/" className="text-sm text-slate-300 transition hover:text-white hover:underline">Home</Link></li>
            <li><Link to="/resources" className="text-sm text-slate-300 transition hover:text-white hover:underline">Resources</Link></li>
            <li><Link to="/dashboard" className="text-sm text-slate-300 transition hover:text-white hover:underline">Dashboard</Link></li>
            <li><Link to="/profile" className="text-sm text-slate-300 transition hover:text-white hover:underline">Profile</Link></li>
          </ul>
        </div>

        {/* Features */}
        <div className="flex flex-col">
          <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-100">Features</h4>
          <ul className="space-y-2">
            <li><a href="#document-upload" className="text-sm text-slate-300 transition hover:text-white hover:underline">Secure Upload</a></li>
            <li><a href="#verification" className="text-sm text-slate-300 transition hover:text-white hover:underline">AI Analysis</a></li>
            <li><a href="#blockchain" className="text-sm text-slate-300 transition hover:text-white hover:underline">Blockchain Proof</a></li>
            <li><a href="#access-control" className="text-sm text-slate-300 transition hover:text-white hover:underline">Access Control</a></li>
          </ul>
        </div>

        {/* Contact */}
        <div className="flex flex-col">
          <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-100">Contact</h4>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <Mail size={18} />
              <a href="mailto:support@tracehub.com" className="text-slate-300 transition hover:text-white">support@tracehub.com</a>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <MapPin size={18} />
              <span>Education Platform</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-[#2a3932] bg-[#16201c] px-4 py-4 text-center md:px-8">
        <p className="mb-2 text-sm text-slate-300">&copy; {currentYear} TraceHub. All rights reserved.</p>
        <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-400">
          <a href="#privacy" className="transition hover:text-white">Privacy Policy</a>
          <span>•</span>
          <a href="#terms" className="transition hover:text-white">Terms of Service</a>
          <span>•</span>
          <a href="#cookies" className="transition hover:text-white">Cookie Policy</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
