import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../config/Api';
import { Upload as UploadIcon, Check, Database, Lock } from 'lucide-react';

const Upload = () => {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();
  const { user, isProfessor, isAdmin } = useAuth();

  if (!isProfessor && !isAdmin) {
    return (
      <div className="flex min-h-[calc(100vh-70px)] items-center justify-center bg-[radial-gradient(640px_380px_at_20%_16%,rgba(47,245,168,0.26),transparent_72%),linear-gradient(145deg,#27332e_0%,#1f2925_100%)] px-4 py-8">
        <div className="w-full max-w-2xl rounded-lg border-l-4 border-red-500 bg-red-100 px-4 py-3 font-medium text-red-900">
          Only Professors and HODs can upload documents.
        </div>
      </div>
    );
  }

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setError('');
    } else {
      setError('Please select a valid PDF file');
      setFile(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!file || !title) {
      setError('Please provide both title and PDF file');
      return;
    }

    setLoading(true);

    try {
      const response = await api.upload.uploadFile(file, title);
      
      if (response.error) {
        setError(response.error);
      } else {
        setSuccess('Document uploaded and published successfully!');
        setTitle('');
        setFile(null);
        
        // Reset form
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      }
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-70px)] items-center justify-center bg-[radial-gradient(640px_380px_at_20%_16%,rgba(47,245,168,0.26),transparent_72%),linear-gradient(145deg,#27332e_0%,#1f2925_100%)] px-4 py-8">
      <div className="w-full max-w-2xl rounded-2xl border border-[#2ff5a838] bg-white/10 p-8 text-[#e8f2ed] shadow-2xl backdrop-blur">
        <h1 className="mb-2 text-3xl font-bold text-[#e8f2ed]">Upload Document</h1>
        <p className="mb-8 text-[#bfd0c8]">Publish your course materials</p>

        {error && <div className="mb-4 rounded-lg border-l-4 border-red-500 bg-red-100 px-4 py-3 font-medium text-red-900">{error}</div>}
        {success && <div className="mb-4 rounded-lg border-l-4 border-emerald-500 bg-emerald-100 px-4 py-3 font-medium text-emerald-900">{success}</div>}

        <form onSubmit={handleSubmit} className="my-8">
          <div className="mb-6 flex flex-col">
            <label htmlFor="title" className="mb-3 text-sm font-semibold text-[#d8ebe3]">Document Title</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Advanced Algorithms Lecture Notes"
              required
              className="w-full rounded-lg border border-[#2ff5a838] bg-[#1f2925cc] px-4 py-3 text-[#e8f2ed] outline-none transition placeholder:text-[#9ec0b2] focus:border-[#2ff5a8] focus:ring-2 focus:ring-[#2ff5a866]"
            />
          </div>

          <div className="mb-6 flex flex-col">
            <label htmlFor="file" className="my-4 flex cursor-pointer flex-col items-center rounded-xl border border-dashed border-[#2ff5a857] bg-[#1f292580] px-8 py-12 transition hover:border-[#2ff5a8] hover:bg-linear-to-br hover:from-[#2ff5a829] hover:to-[#2ff5a814]">
              <UploadIcon size={48} className="mb-4 text-[#2ff5a8]" />
              <span className="text-center font-semibold text-[#e8f2ed]">
                {file ? `Selected: ${file.name}` : 'Click to select PDF file'}
              </span>
              <input
                id="file"
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </label>
          </div>

          <div className="my-8 rounded-lg border border-[#2ff5a857] bg-linear-to-br from-[#2ff5a829] to-[#2ff5a814] p-6">
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[#e8f2ed]">Document Processing</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-sm text-[#d8ebe3]"><Check size={18} className="text-[#8cf0c8]" /> Document analyzed by AI for summaries and tags</li>
              <li className="flex items-center gap-3 text-sm text-[#d8ebe3]"><Database size={18} className="text-[#8cf0c8]" /> Document stored on Duality for permanent access</li>
              <li className="flex items-center gap-3 text-sm text-[#d8ebe3]"><Lock size={18} className="text-[#8cf0c8]" /> Publication proof minted on Algorand blockchain</li>
              <li className="flex items-center gap-3 text-sm text-[#d8ebe3]"><Check size={18} className="text-[#8cf0c8]" /> Document auto-approved (you are a {user?.role})</li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={loading || !file}
            className="mt-6 inline-flex w-full items-center justify-center rounded-lg border border-[#2ff5a8] bg-[#2ff5a8] px-4 py-3 text-sm font-bold text-[#142019] transition hover:-translate-y-0.5 hover:bg-[#24d993] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? 'Uploading and Processing...' : 'Upload Document'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Upload;
