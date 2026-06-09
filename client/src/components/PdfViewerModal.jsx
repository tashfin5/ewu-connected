import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, Download } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const PdfViewerModal = ({ isOpen, onClose, fileUrl, title, category }) => {
  const [numPages, setNumPages] = useState(null);
  const [containerWidth, setContainerWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setContainerWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isOpen || !fileUrl) return null;

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isPdf = fileUrl.toLowerCase().includes('.pdf');

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
  }

  const handleDownloadPdf = () => {
    try {
      const urlParts = fileUrl.split('?')[0].split('/');
      let rawFilename = urlParts[urlParts.length - 1] || 'Document.pdf'; 
      rawFilename = decodeURIComponent(rawFilename);
      rawFilename = rawFilename.replace(/^\d+-/, ''); // Strip timestamp prefix
      
      const safeOriginalName = rawFilename.replace(/[^a-zA-Z0-9_-]/g, '_');
      const finalUrl = fileUrl.replace('/upload/', `/upload/fl_attachment:${safeOriginalName}/`);
      
      if (Capacitor.isNativePlatform()) {
        window.open(finalUrl, '_system');
      } else {
        const link = document.createElement('a');
        link.href = finalUrl;
        link.download = rawFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      window.open(fileUrl, '_blank');
    }
  };

  const handleExternalLink = () => {
    window.open(fileUrl, '_blank');
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-0">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          onClick={onClose} 
          className="fixed inset-0 bg-slate-900/90 dark:bg-black/90 backdrop-blur-xl" 
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }} 
          animate={{ opacity: 1, scale: 1, y: 0 }} 
          exit={{ opacity: 0, scale: 0.95, y: 20 }} 
          className="bg-white dark:bg-[#121212] w-full h-full relative z-10 flex flex-col overflow-hidden"
        >
          <div className="flex flex-wrap items-center justify-between p-4 md:p-6 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-[#0a0a0a]/50">
            <div className="flex items-center gap-4">
              <div>
                <h3 className="font-black text-slate-900 dark:text-white text-lg md:text-xl line-clamp-1 pr-4">{title || 'Document View'}</h3>
                {category && <p className="text-xs font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest">{category}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2 sm:mt-0">
              <button 
                onClick={handleExternalLink} 
                className="p-2.5 bg-slate-100 dark:bg-zinc-800 hover:bg-blue-50 hover:text-blue-500 dark:bg-blue-900/30 dark:hover:text-blue-400 text-slate-600 dark:text-zinc-300 rounded-xl transition-colors"
                title="Open in new tab"
              >
                <ExternalLink className="w-5 h-5" />
              </button>
              <button 
                onClick={handleDownloadPdf} 
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 hover:-translate-y-0.5"
              >
                <Download className="w-4 h-4" /> <span className="hidden sm:inline">Download</span>
              </button>
              <button 
                onClick={onClose} 
                className="p-2.5 bg-slate-100 dark:bg-zinc-800 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/30 dark:hover:text-red-400 text-slate-600 dark:text-zinc-300 rounded-xl transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 bg-slate-100 dark:bg-black relative flex flex-col min-h-0 overflow-hidden">
            {(fileUrl.match(/\.(jpeg|jpg|gif|png|webp)(\?|$)/i) || fileUrl.includes('/image/upload/')) ? (
              <div className="flex items-center justify-center w-full h-full p-2 sm:p-0">
                <img 
                  src={fileUrl} 
                  alt={title || "Image"} 
                  className="w-full h-full object-contain sm:rounded-xl"
                />
              </div>
            ) : (isMobile && isPdf) ? (
              <div className="w-full h-full overflow-y-auto bg-slate-100 dark:bg-[#121212] flex flex-col items-center py-4 px-2">
                <Document 
                  file={fileUrl} 
                  onLoadSuccess={onDocumentLoadSuccess}
                  className="flex flex-col items-center w-full"
                  loading={
                    <div className="flex justify-center items-center py-20">
                      <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                    </div>
                  }
                >
                  {numPages && Array.from(new Array(numPages), (el, index) => (
                    <div key={`page_${index + 1}`} className="mb-6 shadow-xl bg-white overflow-hidden" style={{ borderRadius: '8px' }}>
                      <Page 
                        pageNumber={index + 1} 
                        renderTextLayer={false} 
                        renderAnnotationLayer={false} 
                        width={containerWidth > 768 ? 700 : containerWidth - 32}
                      />
                    </div>
                  ))}
                </Document>
              </div>
            ) : (
              <div className="w-full h-full overflow-hidden relative bg-white dark:bg-[#121212]">
                <iframe 
                  src={fileUrl} 
                  className="w-full h-full border-0 bg-white"
                  title={title || "PDF Viewer"}
                />
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default PdfViewerModal;
