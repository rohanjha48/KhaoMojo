'use client';

import React, { useState, useRef } from 'react';
import { X, UploadCloud, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { uploadPrintDocument } from '../utils/dataService';
import { useCart } from './CartContext';

export default function PrintUploadModal({ product, isOpen, onClose }) {
  const { addToCart } = useCart();
  const fileInputRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [pagesCount, setPagesCount] = useState(1);
  const [instructions, setInstructions] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  if (!isOpen || !product) return null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size (25MB limit)
    if (file.size > 25 * 1024 * 1024) {
      setUploadError('File size exceeds 25MB limit. Please upload a smaller document.');
      return;
    }

    setUploadError('');
    setSelectedFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.size > 25 * 1024 * 1024) {
        setUploadError('File size exceeds 25MB limit.');
        return;
      }
      setUploadError('');
      setSelectedFile(file);
    }
  };

  const handleConfirm = async () => {
    if (!selectedFile) {
      setUploadError('Please select or upload a document first.');
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(40);

      // Upload to Supabase Storage bucket 'print-files'
      const uploadResult = await uploadPrintDocument(selectedFile);
      setUploadProgress(100);

      // Add to cart with attached document URL and quantity (pages)
      addToCart(product, {
        quantity: Math.max(1, pagesCount),
        printFileUrl: uploadResult.url,
        printFileName: `${uploadResult.fileName} (${pagesCount} pages${instructions ? ` • ${instructions}` : ''})`,
      });

      // Reset and close
      setIsUploading(false);
      setSelectedFile(null);
      setPagesCount(1);
      setInstructions('');
      onClose();
    } catch (err) {
      console.error('File upload failed:', err);
      setUploadError('Failed to upload file. Please try again.');
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-zinc-900 border border-zinc-800 p-6 sm:p-8 shadow-2xl overflow-hidden">
        {/* Glow corner accent */}
        <div className="absolute top-0 right-0 h-32 w-32 bg-cyan-500/10 blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                Print Service
              </span>
              <span className="text-xs text-zinc-400 font-mono">
                ₹{Number(product.price).toFixed(0)}/page
              </span>
            </div>
            <h2 className="text-lg font-bold text-white mt-1">
              Upload Document for {product.name}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Upload Zone */}
        <div className="mt-5 space-y-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.txt"
            className="hidden"
          />

          {!selectedFile ? (
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-700 hover:border-cyan-400/80 rounded-2xl p-8 cursor-pointer bg-zinc-950/50 hover:bg-zinc-950/80 transition group text-center"
            >
              <div className="h-14 w-14 rounded-2xl bg-zinc-800/80 border border-zinc-700 group-hover:border-cyan-500/50 flex items-center justify-center mb-3 group-hover:scale-105 transition">
                <UploadCloud className="w-7 h-7 text-cyan-400 group-hover:text-cyan-300" />
              </div>
              <p className="text-sm font-semibold text-white mb-1">
                Click to browse or drop your assignment/document
              </p>
              <p className="text-xs text-zinc-400">
                PDF, DOCX, Images, PPT up to 25MB
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-700 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-11 w-11 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0">
                  <FileText className="w-6 h-6 text-cyan-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-zinc-400 font-mono">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedFile(null)}
                className="text-xs text-rose-400 hover:text-rose-300 font-semibold px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20"
              >
                Change
              </button>
            </div>
          )}

          {/* Number of Pages / Copies */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Number of Pages / Copies
              </label>
              <div className="flex items-center border border-zinc-700 bg-zinc-950 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setPagesCount((p) => Math.max(1, p - 1))}
                  className="px-3.5 py-2.5 text-zinc-400 hover:text-white hover:bg-zinc-800 text-sm font-bold"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={pagesCount}
                  onChange={(e) => setPagesCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full text-center bg-transparent text-white font-mono font-bold focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setPagesCount((p) => p + 1)}
                  className="px-3.5 py-2.5 text-zinc-400 hover:text-white hover:bg-zinc-800 text-sm font-bold"
                >
                  +
                </button>
              </div>
            </div>

            {/* Price Preview */}
            <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 flex flex-col justify-center">
              <span className="text-[11px] text-zinc-400 font-medium">Estimated Cost</span>
              <span className="text-lg font-bold font-mono text-cyan-400">
                ₹{(Number(product.price) * pagesCount).toFixed(0)}{' '}
                <span className="text-xs text-zinc-500 font-normal">
                  ({pagesCount} × ₹{product.price})
                </span>
              </span>
            </div>
          </div>

          {/* Special Print Instructions */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Print Instructions <span className="text-zinc-500 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g., Double-sided, only pages 1-4, staple top left..."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400 transition"
            />
          </div>

          {uploadError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {isUploading && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-zinc-400">
                <span>Uploading to Supabase Storage...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-400 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="mt-6 pt-4 border-t border-zinc-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isUploading || !selectedFile}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-lg ${
              !selectedFile || isUploading
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                : 'bg-cyan-500 hover:bg-cyan-400 text-zinc-950 shadow-cyan-500/20 hover:scale-[1.02] active:scale-[0.98]'
            }`}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Uploading Document...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Attach & Add to Cart</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
