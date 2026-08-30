'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  FaBook, FaSearch, FaPlus, FaEdit, FaTrash, 
  FaTimes, FaCalendarAlt, FaLink, FaSpinner, 
  FaCheckCircle, FaUser, FaTag, FaVideo, FaFileAlt, FaExternalLinkAlt, FaUpload
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

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

interface ClassData {
  id: number;
  name: string;
}

export default function AdminResourcesPage() {
  const { data: session } = useSession();
  const [resources, setResources] = useState<Resource[]>([]);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Search and filter state
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('All');

  // Modals state
  const [mounted, setMounted] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);

  // File upload state
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedFilename, setUploadedFilename] = useState('');

  // Form states (Resource)
  const [formType, setFormType] = useState<'add' | 'edit'>('add');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    resource_type: 'video' as 'video' | 'document' | 'link',
    file_url: '',
    class_id: ''
  });

  const [formSubmitting, setFormSubmitting] = useState(false);

  const loadResources = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await fetch('/api/admin/resources');
      const data = await res.json();
      if (data.success) {
        setResources(data.resources || []);
      } else {
        setErrorMsg(data.error || 'Failed to retrieve resources.');
      }
    } catch (err) {
      setErrorMsg('Failed to communicate with the database.');
    } finally {
      setLoading(false);
    }
  };

  const loadClasses = async () => {
    try {
      const res = await fetch('/api/admin/classes');
      const data = await res.json();
      if (data.success) {
        setClasses(data.classes || []);
      }
    } catch (err) {
      console.error('Failed to load classes', err);
    }
  };

  useEffect(() => {
    setMounted(true);
    loadResources();
    loadClasses();
  }, []);

  const handleOpenAddModal = () => {
    setFormData({
      title: '',
      description: '',
      resource_type: 'video',
      file_url: '',
      class_id: ''
    });
    setUploadedFilename('');
    setFormType('add');
    setAddModalOpen(true);
  };

  const handleOpenEditModal = (res: Resource) => {
    setSelectedResource(res);
    setFormData({
      title: res.title,
      description: res.description || '',
      resource_type: res.resource_type,
      file_url: res.file_url,
      class_id: res.class_id ? String(res.class_id) : ''
    });
    setUploadedFilename(res.resource_type === 'document' && res.file_url.startsWith('/uploads/') ? 'Existing PDF Document' : '');
    setFormType('edit');
    setEditModalOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    setErrorMsg('');
    setUploadedFilename('');

    const uploadData = new FormData();
    uploadData.append('file', file);

    try {
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: uploadData
      });
      const data = await res.json();
      if (data.success) {
        setFormData(prev => ({ ...prev, file_url: data.fileUrl }));
        setUploadedFilename(data.originalFilename || 'Uploaded PDF');
      } else {
        setErrorMsg(data.error || 'Failed to upload document.');
      }
    } catch (err) {
      setErrorMsg('File upload failed.');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const isEdit = formType === 'edit';
      const endpoint = '/api/admin/resources';
      const method = isEdit ? 'PUT' : 'POST';
      const payload = isEdit ? { ...formData, id: selectedResource?.id } : formData;

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(isEdit ? 'Resource updated successfully.' : 'Resource uploaded successfully.');
        setAddModalOpen(false);
        setEditModalOpen(false);
        loadResources();
      } else {
        setErrorMsg(data.error || 'Failed to process resource.');
      }
    } catch (err) {
      setErrorMsg('Failed to save resource details.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async (res: Resource) => {
    if (!confirm(`Are you sure you want to delete the resource "${res.title}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/resources?id=${res.id}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.success) {
        setSuccessMsg('Resource removed successfully.');
        loadResources();
      } else {
        setErrorMsg(data.error || 'Failed to delete resource.');
      }
    } catch (err) {
      setErrorMsg('Failed to process deletion.');
    }
  };

  const filteredResources = resources.filter(res => {
    const matchesSearch = res.title.toLowerCase().includes(search.toLowerCase()) ||
                          (res.description && res.description.toLowerCase().includes(search.toLowerCase()));
    const matchesFilter = filterType === 'All' || res.resource_type === filterType;
    return matchesSearch && matchesFilter;
  });

  const getResourceTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <FaVideo className="text-red-500" />;
      case 'document':
        return <FaFileAlt className="text-sky-500" />;
      case 'link':
      default:
        return <FaLink className="text-emerald-500" />;
    }
  };

  const getResourceTypeBadge = (type: string) => {
    switch (type) {
      case 'video':
        return 'bg-red-50 text-red-700 border-red-100';
      case 'document':
        return 'bg-sky-50 text-sky-700 border-sky-100';
      case 'link':
      default:
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
            <FaBook className="text-indigo-650" /> Training Resources
          </h2>
          <p className="text-xs text-slate-500 mt-1">Share belt-rank syllabus documentations, video tutorials, and reference links with dojo students</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
        >
          <FaPlus /> Upload Resource
        </button>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-700 font-semibold">
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-700 font-semibold flex items-center gap-2">
          <FaCheckCircle /> {successMsg}
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.02)] flex flex-col md:flex-row gap-4 items-center">
        {/* Search */}
        <div className="relative w-full md:flex-1">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <FaSearch size={12} />
          </span>
          <input
            type="text"
            placeholder="Search by title or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200/60 rounded-xl text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-300 transition-all"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 w-full md:w-auto">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full md:w-44 px-3.5 py-2 bg-slate-50 border border-slate-200/60 rounded-xl text-xs font-semibold text-slate-650 focus:outline-none focus:bg-white transition-all"
          >
            <option value="All">All Resource Types</option>
            <option value="video">Videos</option>
            <option value="document">Documents</option>
            <option value="link">Links</option>
          </select>
        </div>
      </div>

      {/* Resources Cards Grid */}
      {loading ? (
        <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-3">
          <FaSpinner className="animate-spin text-lg" />
          <span className="text-xs font-semibold">Loading training library...</span>
        </div>
      ) : filteredResources.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResources.map((res) => (
            <motion.div
              key={res.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-slate-100 rounded-2xl p-5 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.02)] flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="space-y-4">
                {/* Header Badge */}
                <div className="flex items-center gap-2">
                  <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border flex items-center gap-1.5 ${getResourceTypeBadge(res.resource_type)}`}>
                    {getResourceTypeIcon(res.resource_type)} {res.resource_type}
                  </span>
                  {res.class_name && (
                    <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border bg-slate-50 text-slate-600 border-slate-200 flex items-center gap-1">
                      <FaTag size={8} /> {res.class_name}
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-black text-slate-800 leading-tight">
                    {res.title}
                  </h3>
                  <p className="text-[10px] text-slate-450 mt-1.5 leading-relaxed line-clamp-3">
                    {res.description || 'No summary details provided.'}
                  </p>
                </div>

                {/* Meta details */}
                <div className="space-y-1.5 pt-1 text-[10px] text-slate-500">
                  <div className="flex items-center gap-2">
                    <FaUser size={10} className="text-slate-400" />
                    <span>Uploaded by: <span className="font-bold text-slate-700">@{res.uploader_name}</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FaCalendarAlt size={10} className="text-slate-400" />
                    <span>Shared Date: {res.upload_date}</span>
                  </div>
                </div>
              </div>

              {/* Actions & Launch */}
              <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between">
                <a
                  href={res.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-[10px] font-black text-indigo-600 hover:text-indigo-850 transition-colors"
                >
                  Launch Resource <FaExternalLinkAlt size={8} />
                </a>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEditModal(res)}
                    className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                    title="Edit Resource"
                  >
                    <FaEdit size={11} />
                  </button>
                  <button
                    onClick={() => handleDelete(res)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete Resource"
                  >
                    <FaTrash size={11} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="p-12 bg-white rounded-xl border border-slate-100 text-center">
          <p className="text-xs font-semibold text-slate-450">No training resources found matching current criteria.</p>
        </div>
      )}

      {/* Add / Edit Resource Modal */}
      {mounted && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {(addModalOpen || editModalOpen) && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-[4px] transition-all">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white w-full max-w-md rounded-2xl shadow-2xl flex flex-col"
              >
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800">
                    {formType === 'add' ? 'Upload Dojo Resource' : 'Modify Resource Details'}
                  </h3>
                  <button
                    onClick={() => {
                      setAddModalOpen(false);
                      setEditModalOpen(false);
                    }}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg"
                  >
                    <FaTimes size={12} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  {/* Title */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Resource Title
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                      placeholder="e.g. Heian Shodan Walkthrough Guide"
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-805 focus:outline-none focus:bg-white transition-all"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Summary description
                    </label>
                    <textarea
                      rows={2}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Short notes on contents..."
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:bg-white transition-all resize-none"
                    />
                  </div>

                  {/* Resource Type */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Resource Type
                    </label>
                    <select
                      value={formData.resource_type}
                      onChange={(e) => setFormData({ ...formData, resource_type: e.target.value as any })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-850 focus:outline-none focus:bg-white transition-all"
                    >
                      <option value="video">Video Link</option>
                      <option value="document">PDF Document</option>
                      <option value="link">Reference Link</option>
                    </select>
                  </div>

                  {/* File Upload Zone (For documents) */}
                  {formData.resource_type === 'document' && (
                    <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl space-y-2 text-left">
                      <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <FaUpload /> Upload PDF File
                      </label>
                      <div className="flex flex-wrap items-center gap-3">
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={handleFileUpload}
                          className="text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3.5 file:rounded-xl file:border-0 file:text-[10px] file:font-extrabold file:bg-slate-900 file:text-white hover:file:bg-slate-800 transition-all cursor-pointer"
                        />
                        {uploadingFile && (
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <FaSpinner className="animate-spin text-indigo-500" /> Uploading...
                          </span>
                        )}
                        {uploadedFilename && (
                          <span className="text-[10px] text-emerald-600 font-extrabold flex items-center gap-1">
                            <FaCheckCircle /> {uploadedFilename}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* File URL Input */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      {formData.resource_type === 'document' ? 'PDF Document URL (auto-filled on upload)' : 'Reference Link / Video URL'}
                    </label>
                    <input
                      type="text"
                      value={formData.file_url}
                      onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
                      required
                      placeholder={formData.resource_type === 'video' ? 'e.g. https://youtube.com/watch?v=...' : 'e.g. https://resource-link.com'}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-805 focus:outline-none focus:bg-white transition-all"
                    />
                  </div>

                  {/* Target Class Selection */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Target Class Link (Optional)
                    </label>
                    <select
                      value={formData.class_id}
                      onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-850 focus:outline-none focus:bg-white transition-all"
                    >
                      <option value="">Generic / General Dojo Resource</option>
                      {classes.map(cls => (
                        <option key={cls.id} value={cls.id}>{cls.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Submit Panel */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setAddModalOpen(false);
                        setEditModalOpen(false);
                      }}
                      className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl text-xs font-semibold transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={formSubmitting || uploadingFile}
                      className="px-5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-65 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center gap-2"
                    >
                      {formSubmitting ? <FaSpinner className="animate-spin" size={10} /> : null} Save Resource
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

    </div>
  );
}
