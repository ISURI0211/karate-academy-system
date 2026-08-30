'use client';

import React, { useState, useEffect } from 'react';
import { 
  FaBook, FaSearch, FaCalendarAlt, FaLink, FaSpinner, 
  FaUser, FaTag, FaVideo, FaFileAlt, FaExternalLinkAlt, FaInfoCircle
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

interface Resource {
  id: number;
  title: string;
  description: string;
  resource_type: 'video' | 'document' | 'link';
  file_url: string;
  uploaded_by: number;
  class_id: number | null;
  upload_date: string;
  uploader_name: string;
  class_name: string | null;
}

export default function StudentResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Search and filter state
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'video' | 'document' | 'link'>('all');

  const loadResources = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await fetch('/api/student/resources');
      const data = await res.json();
      if (data.success) {
        setResources(data.resources || []);
      } else {
        setErrorMsg(data.error || 'Failed to retrieve training resources.');
      }
    } catch (err) {
      setErrorMsg('Failed to communicate with the training database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResources();
  }, []);

  const getResourceTypeBadge = (type: 'video' | 'document' | 'link') => {
    switch (type) {
      case 'video':
        return 'bg-violet-50 text-violet-700 border-violet-100';
      case 'document':
        return 'bg-sky-50 text-sky-700 border-sky-100';
      case 'link':
      default:
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    }
  };

  const getResourceTypeIcon = (type: 'video' | 'document' | 'link') => {
    switch (type) {
      case 'video':
        return <FaVideo size={10} />;
      case 'document':
        return <FaFileAlt size={10} />;
      case 'link':
      default:
        return <FaLink size={10} />;
    }
  };

  const getLaunchButtonLabel = (type: 'video' | 'document' | 'link') => {
    switch (type) {
      case 'video':
        return 'Watch Video';
      case 'document':
        return 'Read Document';
      case 'link':
      default:
        return 'Launch Link';
    }
  };

  const filteredResources = resources.filter(res => {
    const matchesSearch = 
      res.title.toLowerCase().includes(search.toLowerCase()) ||
      (res.description && res.description.toLowerCase().includes(search.toLowerCase())) ||
      (res.class_name && res.class_name.toLowerCase().includes(search.toLowerCase()));

    const matchesTab = activeTab === 'all' || res.resource_type === activeTab;

    return matchesSearch && matchesTab;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
            <FaBook className="text-indigo-600" /> Dojo Training Resources
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Access curriculum guides, kata demonstration videos, and karate training materials customized for your classes
          </p>
        </div>
      </div>

      {/* Toolbar - Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.02)]">
        {/* Category Tabs */}
        <div className="flex gap-1 bg-slate-100/70 p-1 rounded-xl w-full sm:w-auto">
          {([
            { key: 'all', label: 'All Resources' },
            { key: 'video', label: 'Videos' },
            { key: 'document', label: 'Documents' },
            { key: 'link', label: 'Links' },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200 ${
                activeTab === tab.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:max-w-xs">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <FaSearch size={12} />
          </span>
          <input
            type="text"
            placeholder="Search resources..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200/60 rounded-xl text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-300 transition-all"
          />
        </div>
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
          <FaInfoCircle /> {errorMsg}
        </div>
      )}

      {/* Grid List */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-450 gap-3">
          <FaSpinner className="animate-spin text-xl text-indigo-500" />
          <span className="text-xs font-semibold">Loading training library...</span>
        </div>
      ) : filteredResources.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResources.map((res, index) => (
            <motion.div
              key={res.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className="bg-white border border-slate-200/60 border-t-2 border-t-indigo-500 rounded-2xl p-5 shadow-[0_1px_4px_-2px_rgba(0,0,0,0.04)] flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="space-y-4">
                {/* Badges Row */}
                <div className="flex items-center gap-2">
                  <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border flex items-center gap-1.5 ${getResourceTypeBadge(res.resource_type)}`}>
                    {getResourceTypeIcon(res.resource_type)} {res.resource_type}
                  </span>
                  {res.class_name && (
                    <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border bg-slate-50 text-slate-600 border-slate-200 flex items-center gap-1">
                      <FaTag size={8} className="text-slate-400" /> {res.class_name}
                    </span>
                  )}
                </div>

                {/* Info Text */}
                <div>
                  <h3 className="text-sm font-bold text-slate-800 leading-tight">
                    {res.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-2 leading-relaxed line-clamp-3">
                    {res.description || 'No instructional summary provided.'}
                  </p>
                </div>

                {/* Metadata details */}
                <div className="space-y-1.5 pt-2 text-[10px] text-slate-500 border-t border-slate-50">
                  <div className="flex items-center gap-2">
                    <FaUser size={10} className="text-slate-450" />
                    <span>Uploaded by: <span className="font-semibold text-slate-700">{res.uploader_name}</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FaCalendarAlt size={10} className="text-slate-450" />
                    <span>Shared Date: {res.upload_date}</span>
                  </div>
                </div>
              </div>

              {/* Action Trigger */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
                <a
                  href={res.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-indigo-650 hover:shadow-sm text-[10px] font-bold text-white uppercase tracking-wider rounded-xl transition-all"
                >
                  {getLaunchButtonLabel(res.resource_type)} <FaExternalLinkAlt size={8} />
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="py-16 bg-white rounded-2xl border border-dashed border-slate-200 text-center">
          <FaBook className="mx-auto text-2xl text-slate-300 mb-3" />
          <p className="text-xs font-bold text-slate-500">No resources found.</p>
          <p className="text-[10px] text-slate-400 mt-1">
            {search || activeTab !== 'all' 
              ? 'Try modifying your search query or switching resource category filters.'
              : 'Your instructors have not shared any resources for your enrolled classes yet.'}
          </p>
        </div>
      )}
    </div>
  );
}
