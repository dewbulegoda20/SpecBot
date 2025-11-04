'use client';

import { useState, useEffect, useRef } from 'react';
import { FileText } from 'lucide-react';
import { useAppStore } from '@/lib/store';

interface PDFViewerProps {
  onUploadClick: () => void;
}

export default function PDFViewer({ onUploadClick }: PDFViewerProps) {
  const { currentDocument, highlightedReference, currentPage, setCurrentPage } = useAppStore();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pageNum, setPageNum] = useState<number>(1);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  useEffect(() => {
    if (currentDocument) {
      const baseUrl = `/api/documents/${currentDocument.id}/pdf`;
      setPdfUrl(baseUrl);
      setPageNum(1);
      setIframeLoaded(false);
    } else {
      setPdfUrl(null);
      setPageNum(1);
    }
  }, [currentDocument]);

  // Handle reference click navigation
  useEffect(() => {
    if (highlightedReference && highlightedReference.pageNumber && iframeRef.current && pdfUrl) {
      const targetPage = highlightedReference.pageNumber;
      setPageNum(targetPage);
      setCurrentPage(targetPage);
      
      console.log('Navigating PDF to page:', targetPage);
      
      // Force iframe to reload with new page number in URL
      // Using a timestamp to force reload
      const timestamp = new Date().getTime();
      const newUrl = `${pdfUrl}?t=${timestamp}#page=${targetPage}`;
      console.log('New URL:', newUrl);
      
      iframeRef.current.src = newUrl;
    }
  }, [highlightedReference, pdfUrl, setCurrentPage]);

  const handleIframeLoad = () => {
    setIframeLoaded(true);
  };

  if (!currentDocument) {
    return (
      <div className="flex flex-col h-full w-full bg-white dark:bg-background-dark">
        <div className="flex flex-col p-4 flex-1">
          <div className="flex flex-col items-center justify-center gap-6 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 px-6 py-14 h-full">
            <div className="text-gray-400 dark:text-gray-600">
              <FileText className="w-16 h-16" />
            </div>
            <div className="flex max-w-[480px] flex-col items-center gap-2">
              <p className="text-gray-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] max-w-[480px] text-center">
                Document Viewer
              </p>
              <p className="text-gray-700 dark:text-gray-300 text-sm font-normal leading-normal max-w-[480px] text-center">
                Your uploaded electrical specification will appear here once you upload a file.
              </p>
            </div>
            <button
              onClick={onUploadClick}
              className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
            >
              <span className="truncate">Upload Document</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-white dark:bg-background-dark">
      {/* Header - Only show when reference is highlighted */}
      {highlightedReference && (
        <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-800 bg-primary/5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              Navigated to reference
            </span>
          </div>
          <div className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-semibold">
            Page {highlightedReference.pageNumber}
          </div>
        </div>
      )}
      
      {/* PDF Viewer */}
      <div className="flex-1 w-full min-h-0">
        {pdfUrl && (
          <iframe
            ref={iframeRef}
            src={`${pdfUrl}#view=FitH&pagemode=none`}
            onLoad={handleIframeLoad}
            className="w-full h-full border-0"
            title="PDF Viewer"
          />
        )}
      </div>
    </div>
  );
}
