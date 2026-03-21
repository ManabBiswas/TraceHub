import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../config/Api';
import { LinkIcon, Link2 } from 'lucide-react';

const MyResources = () => {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    fetchMyResources();
  }, [user]);

  const fetchMyResources = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.resources.getAll(user?._id);
      setResources(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Failed to load your resources');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-360 rounded-2xl bg-[radial-gradient(640px_360px_at_22%_6%,rgba(47,245,168,0.23),transparent_72%),linear-gradient(145deg,#27332e_0%,#1f2925_100%)] p-4 md:p-8">
      <div className="mb-10 border-b-2 border-[#3f5148] pb-8">
        <h1 className="text-4xl font-bold text-slate-100 md:text-5xl">My Resources</h1>
      </div>

      {error && <div className="mb-4 rounded-lg border-l-4 border-red-500 bg-red-100 px-4 py-3 font-medium text-red-900">{error}</div>}

      {loading ? (
        <div className="py-12 text-center text-slate-300">Loading your resources...</div>
      ) : resources.length === 0 ? (
        <div className="py-16 text-center text-slate-300">
          <p>You haven't uploaded any resources yet</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {resources.map(resource => (
            <div key={resource._id} className="flex flex-col overflow-hidden rounded-2xl border border-[#2ff5a838] bg-white/10 shadow-2xl backdrop-blur transition hover:-translate-y-1 hover:border-[#2ff5a866]">
              <div className="flex items-start justify-between gap-4 border-b border-[#2ff5a838] p-6">
                <h3 className="flex-1 wrap-break-word text-xl font-semibold text-[#e8f2ed]">{resource.title}</h3>
                <span className={`whitespace-nowrap rounded-md px-4 py-2 text-xs font-semibold uppercase tracking-wide ${resource.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {resource.status}
                </span>
              </div>

              <div className="flex-1 p-6">
                <p className="mb-3 text-sm text-[#bfd0c8]"><strong className="font-semibold text-[#e8f2ed]">Status:</strong> {resource.status}</p>
                {resource.approvedBy && (
                  <p className="text-sm text-[#bfd0c8]"><strong className="font-semibold text-[#e8f2ed]">Approved by:</strong> {resource.approvedBy}</p>
                )}
              </div>

              {resource.aiSummary && (
                <div className="border-t border-[#2ff5a838] px-6 py-4">
                  <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-[#9fc0b2]">Summary</h4>
                  <p className="text-sm leading-7 text-[#bfd0c8]">{resource.aiSummary}</p>
                </div>
              )}

              {resource.dualityUrl && (
                <div className="border-t border-[#2ff5a838] px-6 py-4">
                  <a 
                    href={resource.dualityUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-[#d8ebe3] transition hover:text-white"
                  >
                    <LinkIcon size={18} />
                    View Document
                  </a>
                </div>
              )}

              {resource.algorandTxId && (
                <div className="border border-[#2ff5a838] bg-linear-to-br from-[#2a3b34] to-[#24322d] px-6 py-4 text-[#8cf0c8]">
                  <div className="inline-flex items-center gap-2 text-sm">
                    <Link2 size={20} />
                    <p>Published on Algorand</p>
                  </div>
                </div>
              )}

              <div className="mt-auto border-t border-[#2ff5a838] bg-[#1f292580] px-6 py-5 text-right">
                <small className="text-xs text-[#9fc0b2]">Uploaded: {new Date(resource.createdAt).toLocaleDateString()}</small>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyResources;
