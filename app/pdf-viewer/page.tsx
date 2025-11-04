'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, Suspense } from 'react';

function PDFViewerContent() {
  const searchParams = useSearchParams();
  const pdfUrl = searchParams.get('file');
  const initialPage = parseInt(searchParams.get('page') || '1');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [numPages, setNumPages] = useState(0);

  useEffect(() => {
    if (!pdfUrl) return;

    const loadPDF = async () => {
      const pdfjsLib = await import('pdfjs-dist');
      
      // Set worker
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

      const loadingTask = pdfjsLib.getDocument(pdfUrl);
      const pdf = await loadingTask.promise;
      
      setPdfDoc(pdf);
      setNumPages(pdf.numPages);
      setCurrentPage(initialPage);
    };

    loadPDF();
  }, [pdfUrl, initialPage]);

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    const renderPage = async () => {
      const page = await pdfDoc.getPage(currentPage);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = canvasRef.current!;
      const context = canvas.getContext('2d')!;

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      await page.render(renderContext).promise;
    };

    renderPage();
  }, [pdfDoc, currentPage]);

  // Listen for page change messages from parent
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'changePage') {
        setCurrentPage(event.data.page);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div style={{ width: '100%', height: '100vh', overflow: 'auto', background: '#525252' }}>
      <canvas ref={canvasRef} style={{ display: 'block', margin: '0 auto' }} />
      <div style={{ textAlign: 'center', color: 'white', padding: '10px' }}>
        Page {currentPage} of {numPages}
      </div>
    </div>
  );
}

export default function PDFViewerPage() {
  return (
    <Suspense fallback={<div style={{ width: '100%', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#525252', color: 'white' }}>Loading PDF...</div>}>
      <PDFViewerContent />
    </Suspense>
  );
}
