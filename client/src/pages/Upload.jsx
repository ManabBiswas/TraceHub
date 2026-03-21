import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../config/Api';
import { Upload as UploadIcon, Check, Database, Lock, Image, FileText } from 'lucide-react';

const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ACCEPTED_EXT   = '.pdf,.jpg,.jpeg,.png,.webp';
const MAX_FILE_SIZE  = 5 * 1024 * 1024; // 5MB limit matching backend

const Upload = () => {
  const [file, setFile]       = useState(null);
  const [preview, setPreview] = useState(null); // image preview URL
  const [title, setTitle]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
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
    const selected = e.target.files[0];
    if (!selected) return;

    // Validate file type
    if (!ACCEPTED_TYPES.includes(selected.type)) {
      setError('Please select a PDF or an image file (JPEG, PNG, WEBP)');
      setFile(null);
      setPreview(null);
      return;
    }

    // Validate file size
    if (selected.size > MAX_FILE_SIZE) {
      setError(`File size must be less than 5MB. Your file is ${(selected.size / (1024 * 1024)).toFixed(2)}MB`);
      setFile(null);
      setPreview(null);
      return;
    }

    setFile(selected);
    setError('');

    // Show preview for images
    if (selected.type.startsWith('image/')) {
      const url = URL.createObjectURL(selected);
      setPreview(url);
    } else {
      setPreview(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!file || !title) {
      setError('Please provide both a title and a file');
      return;
    }

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Invalid file type. Please select a PDF or image (JPEG, PNG, WEBP)');
      setFile(null);
      setPreview(null);
      return;
    }

    setLoading(true);

    try {
      const response = await api.upload.uploadFile(file, title);

      if (response.error) {
        setError(response.error);
        console.error('Upload error:', response.error);
      } else if (response.message) {
        setSuccess(response.message || 'Document uploaded and published successfully!');
        setTitle('');
        setFile(null);
        setPreview(null);
        setTimeout(() => navigate('/dashboard'), 2000);
      } else {
        setError('Unexpected response from server');
        console.error('Unexpected response:', response);
      }
    } catch (err) {
      const errorMessage = err.message || 'Upload failed. Please try again.';
      setError(errorMessage);
      console.error('Upload exception:', err);
    } finally {
      setLoading(false);
    }
  };

  const isPdf   = file?.type === 'application/pdf';
  // const isImg   = file?.type?.startsWith('image/');

  return (
    <div className="flex min-h-[calc(100vh-70px)] items-center justify-center bg-[radial-gradient(640px_380px_at_20%_16%,rgba(47,245,168,0.26),transparent_72%),linear-gradient(145deg,#27332e_0%,#1f2925_100%)] px-4 py-8">
      <div className="w-full max-w-2xl rounded-2xl border border-[#2ff5a838] bg-white/10 p-8 text-[#e8f2ed] shadow-2xl backdrop-blur">
        <h1 className="mb-2 text-3xl font-bold text-[#e8f2ed]">Upload Document</h1>
        <p className="mb-8 text-[#bfd0c8]">Publish your course materials — PDF or image</p>

        {error   && <div className="mb-4 rounded-lg border-l-4 border-red-500 bg-red-100 px-4 py-3 font-medium text-red-900">{error}</div>}
        {success && <div className="mb-4 rounded-lg border-l-4 border-emerald-500 bg-emerald-100 px-4 py-3 font-medium text-emerald-900">{success}</div>}

        <form onSubmit={handleSubmit} className="my-8">
          {/* Title */}
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

          {/* File picker */}
          <div className="mb-6 flex flex-col">
            <label
              htmlFor="file"
              className="my-4 flex cursor-pointer flex-col items-center rounded-xl border border-dashed border-[#2ff5a857] bg-[#1f292580] px-8 py-12 transition hover:border-[#2ff5a8] hover:bg-linear-to-br hover:from-[#2ff5a829] hover:to-[#2ff5a814]"
            >
              {preview ? (
                <img src={preview} alt="preview" className="mb-4 max-h-40 rounded-lg object-contain" />
              ) : isPdf ? (
                <FileText size={48} className="mb-4 text-[#2ff5a8]" />
              ) : (
                <UploadIcon size={48} className="mb-4 text-[#2ff5a8]" />
              )}

              <span className="text-center font-semibold text-[#e8f2ed]">
                {file
                  ? `Selected: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`
                  : 'Click to select PDF or image file'}
              </span>

              {/* accepted type badges */}
              <div className="mt-3 flex gap-2 text-xs text-[#9ec0b2]">
                <span className="inline-flex items-center gap-1 rounded-full border border-[#2ff5a838] px-2 py-0.5">
                  <FileText size={12} /> PDF
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-[#2ff5a838] px-2 py-0.5">
                  <Image size={12} /> JPG / PNG / WEBP
                </span>
              </div>

              <input
                id="file"
                type="file"
                accept={ACCEPTED_EXT}
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </label>
          </div>

          {/* Processing info */}
          <div className="my-8 rounded-lg border border-[#2ff5a857] bg-linear-to-br from-[#2ff5a829] to-[#2ff5a814] p-6">
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[#e8f2ed]">Document Processing</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-sm text-[#d8ebe3]"><Check size={18} className="text-[#8cf0c8]" /> AI analysis — summaries &amp; tags generated automatically</li>
              <li className="flex items-center gap-3 text-sm text-[#d8ebe3]"><Database size={18} className="text-[#8cf0c8]" /> File stored on Duality decentralised network</li>
              <li className="flex items-center gap-3 text-sm text-[#d8ebe3]"><Lock size={18} className="text-[#8cf0c8]" /> Publication proof minted on Algorand blockchain</li>
              <li className="flex items-center gap-3 text-sm text-[#d8ebe3]"><Check size={18} className="text-[#8cf0c8]" /> Auto-approved (you are a {user?.role})</li>
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