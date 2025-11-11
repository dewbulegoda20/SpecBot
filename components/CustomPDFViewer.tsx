'use client';

import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { FileText, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';

interface CustomPDFViewerProps {
  onUploadClick: () => void;
}

export default function CustomPDFViewer({ onUploadClick }: CustomPDFViewerProps) {
  const { currentDocument, highlightedReference } = useAppStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.5);
  const [loading, setLoading] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [pdfjsLib, setPdfjsLib] = useState<any>(null);
  const [error, setError] = useState<string>('');

  // Load PDF.js library
  useEffect(() => {
    const loadPdfJs = async () => {
      try {
        const pdfjs = await import('pdfjs-dist');
        // Set worker source - using unpkg CDN as it's more reliable
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
        setPdfjsLib(pdfjs);
        console.log('PDF.js loaded successfully, version:', pdfjs.version);
      } catch (err) {
        console.error('Failed to load PDF.js:', err);
        setError('Failed to load PDF viewer library');
      }
    };
    loadPdfJs();
  }, []);

  // Load PDF document
  useEffect(() => {
    if (!currentDocument || !pdfjsLib) return;

    const loadPDF = async () => {
      setLoading(true);
      setError('');
      try {
        const url = `/api/documents/${currentDocument.id}/pdf`;
        console.log('Loading PDF from:', url);
        
        const loadingTask = pdfjsLib.getDocument({
          url,
          cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
          cMapPacked: true,
        });
        
        const pdf = await loadingTask.promise;
        
        setPdfDoc(pdf);
        setNumPages(pdf.numPages);
        setCurrentPage(1);
        console.log('PDF loaded successfully:', pdf.numPages, 'pages');
      } catch (err: any) {
        console.error('Error loading PDF:', err);
        setError(`Failed to load PDF: ${err.message || 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };

    loadPDF();
  }, [currentDocument, pdfjsLib]);

  // Render current page with bounding box highlighting
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current || rendering) return;

    const renderPage = async () => {
      setRendering(true);
      try {
        const page = await pdfDoc.getPage(currentPage);
        const canvas = canvasRef.current!;
        const context = canvas.getContext('2d', { alpha: false })!;

        const viewport = page.getViewport({ scale });

        // Set canvas dimensions
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // Prepare canvas for rendering
        context.clearRect(0, 0, canvas.width, canvas.height);

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
          enableWebGL: false,
          renderInteractiveForms: false,
        };

        await page.render(renderContext).promise;
        console.log('Rendered page', currentPage, 'at scale', scale);

        // Draw bounding box highlight if reference is on this page
        if (highlightedReference && 
            highlightedReference.pageNumber === currentPage && 
            highlightedReference.boundingBox) {
          
          try {
            const boundingBox = typeof highlightedReference.boundingBox === 'string' 
              ? JSON.parse(highlightedReference.boundingBox)
              : highlightedReference.boundingBox;

            if (Array.isArray(boundingBox) && boundingBox.length >= 8) {
              // Azure returns [x1, y1, x2, y2, x3, y3, x4, y4] in PDF coordinates
              // PDF.js uses bottom-left origin, Azure uses top-left
              const pageHeight = viewport.height / scale;
              
              // Convert Azure coordinates to viewport coordinates
              const x1 = boundingBox[0] * scale;
              const y1 = (pageHeight - boundingBox[1]) * scale;
              const x2 = boundingBox[2] * scale;
              const y2 = (pageHeight - boundingBox[3]) * scale;
              const x3 = boundingBox[4] * scale;
              const y3 = (pageHeight - boundingBox[5]) * scale;
              const x4 = boundingBox[6] * scale;
              const y4 = (pageHeight - boundingBox[7]) * scale;

              // Calculate rectangle bounds
              const minX = Math.min(x1, x2, x3, x4);
              const minY = Math.min(y1, y2, y3, y4);
              const maxX = Math.max(x1, x2, x3, x4);
              const maxY = Math.max(y1, y2, y3, y4);
              const width = maxX - minX;
              const height = maxY - minY;

              // Draw semi-transparent yellow highlight
              context.fillStyle = 'rgba(255, 235, 59, 0.3)'; // Yellow with 30% opacity
              context.fillRect(minX, minY, width, height);

              // Draw dashed border (like Adobe Acrobat)
              context.strokeStyle = '#F57C00'; // Orange border
              context.lineWidth = 2;
              context.setLineDash([5, 3]); // Dashed line pattern
              context.strokeRect(minX, minY, width, height);
              context.setLineDash([]); // Reset line dash

              console.log('Drew bounding box highlight:', {
                page: currentPage,
                coords: { minX, minY, width, height },
                originalBoundingBox: boundingBox
              });

              // Scroll to the highlighted area
              if (containerRef.current) {
                const scrollTop = Math.max(0, minY - 100); // Scroll with 100px padding
                containerRef.current.scrollTo({
                  top: scrollTop,
                  behavior: 'smooth'
                });
              }
            } else {
              console.warn('Invalid bounding box format:', boundingBox);
            }
          } catch (err) {
            console.error('Error drawing bounding box:', err);
          }
        }
      } catch (err) {
        console.error('Error rendering page:', err);
        setError(`Failed to render page ${currentPage}`);
      } finally {
        setRendering(false);
      }
    };

    renderPage();
  }, [pdfDoc, currentPage, scale, rendering, highlightedReference]);

  // Handle reference navigation
  useEffect(() => {
    if (highlightedReference && highlightedReference.pageNumber && pdfDoc) {
      const targetPage = highlightedReference.pageNumber;
      
      // Ensure target page is within valid range
      if (targetPage >= 1 && targetPage <= numPages) {
        console.log('Navigating to reference page:', targetPage);
        setCurrentPage(targetPage);
        
        // Scroll canvas into view
        if (containerRef.current) {
          containerRef.current.scrollTo({
            top: 0,
            behavior: 'smooth'
          });
        }
      } else {
        console.warn(`Invalid page number ${targetPage}, must be between 1 and ${numPages}`);
      }
    }
  }, [highlightedReference, pdfDoc, numPages]);

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < numPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const zoomIn = () => {
    setScale(prevScale => Math.min(prevScale + 0.25, 3));
  };

  const zoomOut = () => {
    setScale(prevScale => Math.max(prevScale - 0.25, 0.5));
  };

  const fitToWidth = () => {
    if (containerRef.current && canvasRef.current) {
      const containerWidth = containerRef.current.clientWidth - 32; // Account for padding
      const canvasWidth = canvasRef.current.width / scale;
      const newScale = containerWidth / canvasWidth;
      setScale(Math.min(Math.max(newScale, 0.5), 3));
    }
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
      {/* Header with reference indicator */}
      {highlightedReference && (
        <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-800 bg-primary/5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              Showing referenced section
            </span>
          </div>
          <div className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-semibold">
            Page {highlightedReference.pageNumber}
          </div>
        </div>
      )}

      {/* PDF Controls */}
      <div className="flex items-center justify-between gap-2 p-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center gap-2">
          <button
            onClick={goToPreviousPage}
            disabled={currentPage <= 1 || loading}
            className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Previous page"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-medium text-gray-900 dark:text-white min-w-[100px] text-center">
            Page {currentPage} of {numPages || '...'}
          </span>
          <button
            onClick={goToNextPage}
            disabled={currentPage >= numPages || loading}
            className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Next page"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={zoomOut}
            disabled={scale <= 0.5 || loading}
            className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <span className="text-sm font-medium text-gray-900 dark:text-white min-w-[60px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={zoomIn}
            disabled={scale >= 3 || loading}
            className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <button
            onClick={fitToWidth}
            disabled={loading}
            className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Fit to width"
          >
            <Maximize2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* PDF Canvas */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-900"
        style={{ scrollBehavior: 'smooth' }}
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <div className="text-gray-600 dark:text-gray-400 font-medium">Loading PDF...</div>
          </div>
        ) : (
          <div className="flex justify-center p-4 min-h-full">
            <canvas
              ref={canvasRef}
              className="shadow-2xl bg-white"
              style={{ 
                maxWidth: '100%', 
                height: 'auto',
                display: rendering ? 'none' : 'block'
              }}
            />
            {rendering && (
              <div className="flex items-center justify-center" style={{ width: canvasRef.current?.width, height: canvasRef.current?.height }}>
                <div className="text-gray-500 dark:text-gray-400">Rendering page...</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
