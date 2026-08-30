'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  FaBook, FaSearch, FaPlus, FaEdit, FaTrash, 
  FaTimes, FaCalendarAlt, FaLink, FaSpinner, 
  FaCheckCircle, FaUser, FaTag, FaVideo, FaFileAlt, FaExternalLinkAlt, FaUpload, FaLock
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

export default function InstructorResourcesPage() {
  const { data: session } = useSession();
  const [resources, setResources] = useState<Resource[]>([]);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Search and filter state
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [viewMode, setViewMode] = useState<'all' | 'mine'>('all');

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
        setErrorMsg(data.error || 'Failed to upload file.');
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
    
    const matchesType = filterType === 'All' || res.resource_type === filterType;
    
    // Ownership check (using session user ID)
    const matchesOwnership = viewMode === 'all' || String(res.uploaded_by) === String(session?.user?.id);

    return matchesSearch && matchesType && matchesOwnership;
  });

  const getResourceTypeIcon = (type: string) => {
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

  const getResourceTypeBadge = (type: string) => {
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

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
            <FaBook className="text-amber-500" /> Upload Resources
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Manage instructional content, videos, handouts, and external syllabus references
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors shadow-sm self-start sm:self-auto"
        >
          <FaPlus size={10} /> Add Resource
        </button>
      </div>

      {/* Alert Notices */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-700 font-semibold flex items-center gap-2 shadow-sm">
          <FaCheckCircle className="text-emerald-500" /> {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2 shadow-sm">
          <FaTimes className="text-rose-500" /> {errorMsg}
        </div>
      )}

      {/* Toolbar / Search Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.02)]">
        
        {/* Toggle View Tabs */}
        <div className="flex gap-1 bg-slate-150/60 p-1 rounded-xl w-full md:w-auto">
          <button
            onClick={() => setViewMode('all')}
            className={`flex-1 md:flex-none px-3.5 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-200 ${
              viewMode === 'all' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            All Dojo Resources
          </button>
          <button
            onClick={() => setViewMode('mine')}
            className={`flex-1 md:flex-none px-3.5 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-200 ${
              viewMode === 'mine' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            My Uploads
          </button>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          {/* Search bar */}
          <div className="relative flex-1 md:w-64">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <FaSearch size={11} />
            </span>
            <input
              type="text"
              placeholder="Search resource..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200/60 rounded-xl text-xs font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-300 transition-all"
            />
          </div>

          {/* Type selector */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200/60 rounded-xl text-xs font-bold text-slate-600 focus:outline-none"
          >
            <option value="All">All Types</option>
            <option value="video">Videos</option>
            <option value="document">Documents</option>
            <option value="link">Links</option>
          </select>
        </div>
      </div>

      {/* Grid of Resource Cards */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
          <FaSpinner className="animate-spin text-xl text-amber-500" />
          <span className="text-xs font-bold tracking-wider">Loading training library...</span>
        </div>
      ) : filteredResources.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResources.map((res) => {
            const isOwner = String(res.uploaded_by) === String(session?.user?.id);
            return (
              <motion.div
                key={res.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-slate-100 rounded-2xl p-5 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.02)] flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="space-y-4">
                  {/* Category badging */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border flex items-center gap-1.5 ${getResourceTypeBadge(res.resource_type)}`}>
                        {getResourceTypeIcon(res.resource_type)} {res.resource_type}
                      </span>
                      {res.class_name && (
                        <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border bg-slate-50 text-slate-600 border-slate-200 flex items-center gap-1">
                          <FaTag size={8} className="text-slate-400" /> {res.class_name}
                        </span>
                      )}
                    </div>
                    
                    {!isOwner && (
                      <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border bg-slate-100 text-slate-400 border-slate-200 flex items-center gap-1">
                        <FaLock size={7} /> Read-only
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-800 leading-tight">
                      {res.title}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-2 leading-relaxed line-clamp-3">
                      {res.description || 'No summary details provided.'}
                    </p>
                  </div>

                  {/* Metadata */}
                  <div className="space-y-1.5 pt-2 text-[10px] text-slate-500 border-t border-slate-50">
                    <div className="flex items-center gap-2">
                      <FaUser size={10} className="text-slate-400" />
                      <span>Uploaded by: <span className="font-semibold text-slate-700">@{res.uploader_name}</span></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FaCalendarAlt size={10} className="text-slate-400" />
                      <span>Shared Date: {res.upload_date}</span>
                    </div>
                  </div>
                </div>

                {/* Launch and Edit actions */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <a
                    href={res.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[10px] font-bold text-amber-600 hover:text-amber-700 uppercase tracking-wider"
                  >
                    Open Resource <FaExternalLinkAlt size={8} />
                  </a>

                  {isOwner && (
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
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="py-16 bg-white rounded-2xl border border-slate-100 text-center">
          <p className="text-xs font-bold text-slate-400">No resources found matching current criteria.</p>
        </div>
      )}

      {/* Add / Edit Portal Modal */}
      {mounted && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {(addModalOpen || editModalOpen) && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px] transition-all">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-2xl w-full max-w-lg shadow-xl border border-slate-100 overflow-hidden flex flex-col"
              >
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                    {formType === 'edit' ? 'Edit Resource' : 'Add New Resource'}
                  </h3>
                  <button 
                    onClick={() => { setAddModalOpen(false); setEditModalOpen(false); }}
                    className="text-slate-450 hover:text-slate-700 p-1"
                  >
                    <FaTimes size={12} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs font-semibold text-slate-600">
                  {/* Title */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-450">Resource Title</label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g. Heian Shodan Kata Guide"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-450">Description / Summary</label>
                    <textarea
                      value={formData.description}
                      onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Provide a brief explanation or breakdown..."
                      rows={3}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  {/* Grid fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Resource Type */}
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-450">Resource Type</label>
                      <select
                        value={formData.resource_type}
                        onChange={e => setFormData(prev => ({ ...prev, resource_type: e.target.value as any }))}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white"
                      >
                        <option value="video">Video Tutorial</option>
                        <option value="document">PDF / Document</option>
                        <option value="link">External Link</option>
                      </select>
                    </div>

                    {/* Target Class Context */}
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-450">Target Dojo Class (Optional)</label>
                      <select
                        value={formData.class_id}
                        onChange={e => setFormData(prev => ({ ...prev, class_id: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white"
                      >
                        <option value="">General (All Classes)</option>
                        {classes.map(cls => (
                          <option key={cls.id} value={cls.id}>{cls.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* File Upload / URL field */}
                  <div className="space-y-1 pt-1">
                    <label className="text-[10px] uppercase font-bold text-slate-450">
                      {formData.resource_type === 'link' ? 'Web Link URL' : 'File Reference URL / Path'}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        required
                        value={formData.file_url}
                        onChange={e => setFormData(prev => ({ ...prev, file_url: e.target.value }))}
                        placeholder={formData.resource_type === 'link' ? 'https://example.com/kata-guide' : 'https://example.com/video.mp4'}
                        className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-1 focus:ring-amber-500"
                      />
                      
                      {formData.resource_type !== 'link' && (
                        <div className="relative">
                          <input
                            type="file"
                            accept={formData.resource_type === 'document' ? 'application/pdf,.doc,.docx' : 'video/*'}
                            onChange={handleFileUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <button
                            type="button"
                            className="px-3.5 py-2 bg-slate-900 text-white hover:bg-slate-850 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                          >
                            {uploadingFile ? <FaSpinner className="animate-spin" size={10} /> : <FaUpload size={10} />}
                            Upload
                          </button>
                        </div>
                      )}
                    </div>
                    {uploadedFilename && (
                      <p className="text-[9px] text-amber-600 font-bold mt-1">
                        Active File: {uploadedFilename}
                      </p>
                    )}
                  </div>

                  {/* Submitting Actions */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => { setAddModalOpen(false); setEditModalOpen(false); }}
                      className="px-4 py-2 border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-all font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={formSubmitting || uploadingFile}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm font-bold"
                    >
                      {formSubmitting && <FaSpinner className="animate-spin" size={10} />}
                      {formType === 'edit' ? 'Update Resource' : 'Add Resource'}
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
