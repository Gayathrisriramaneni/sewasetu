import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  RotateCw,
} from 'lucide-react';
import { pdfjsLib } from '../utils/pdfWorkerConfig';
import { dataUriToUint8Array } from '../utils/documentViewerHelper';

interface PdfCanvasViewerProps {
  dataUri?: string;
  blobUrl?: string | null;
  docName?: string;
  zoom?: number;
  rotation?: number;
  onPageChange?: (page: number, total: number) => void;
}

export const PdfCanvasViewer: React.FC<PdfCanvasViewerProps> = ({
  dataUri,
  blobUrl,
  docName,
  zoom = 1,
  rotation = 0,
  onPageChange,
}) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [renderError, setRenderError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pdfDocRef = useRef<any>(null);
  const renderTaskRef = useRef<any>(null);

  // Load PDF Document
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setRenderError(null);

    async function loadPdf() {
      try {
        let loadingTask: any = null;

        if (dataUri && dataUri.startsWith('data:')) {
          const bytes = dataUriToUint8Array(dataUri);
          if (bytes) {
            loadingTask = pdfjsLib.getDocument({ data: bytes });
          }
        }

        if (!loadingTask && blobUrl) {
          loadingTask = pdfjsLib.getDocument({ url: blobUrl });
        }

        if (!loadingTask) {
          throw new Error('No valid PDF payload available for canvas rendering.');
        }

        const pdf = await loadingTask.promise;
        if (isCancelled) return;

        pdfDocRef.current = pdf;
        setNumPages(pdf.numPages);
        setCurrentPage(1);
        if (onPageChange) {
          onPageChange(1, pdf.numPages);
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error('PDF.js document load error:', err);
          setRenderError(err.message || 'Failed to parse and render PDF document.');
          setLoading(false);
        }
      }
    }

    loadPdf();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch (_) {}
      }
    };
  }, [dataUri, blobUrl]);

  // Render Current Page on Canvas
  useEffect(() => {
    if (!pdfDocRef.current || numPages === 0) return;

    let isCancelled = false;
    setLoading(true);

    async function renderPage() {
      try {
        // Cancel ongoing render if any
        if (renderTaskRef.current) {
          try {
            await renderTaskRef.current.cancel();
          } catch (_) {}
          renderTaskRef.current = null;
        }

        const pdf = pdfDocRef.current;
        const page = await pdf.getPage(currentPage);
        if (isCancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Base scale calculated for clear reading on laptop/desktop
        const dpr = window.devicePixelRatio || 1;
        const baseScale = 1.35 * zoom;
        const effectiveRotation = (page.rotate + rotation) % 360;

        const viewport = page.getViewport({
          scale: baseScale * dpr,
          rotation: effectiveRotation,
        });

        // Set high-DPI canvas size
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        // Style dimensions (logical CSS pixels)
        canvas.style.width = `${viewport.width / dpr}px`;
        canvas.style.height = `${viewport.height / dpr}px`;

        const renderContext = {
          canvasContext: ctx,
          viewport: viewport,
        };

        const task = page.render(renderContext);
        renderTaskRef.current = task;

        await task.promise;
        if (!isCancelled) {
          setLoading(false);
        }
      } catch (err: any) {
        if (err.name === 'RenderingCancelledException') {
          // Expected when rapidly switching pages/zoom
          return;
        }
        if (!isCancelled) {
          console.error('PDF.js page render error:', err);
          setRenderError(err.message || 'Could not render page onto canvas.');
          setLoading(false);
        }
      }
    }

    renderPage();

    return () => {
      isCancelled = true;
    };
  }, [currentPage, numPages, zoom, rotation]);

  const handlePrevPage = () => {
    if (currentPage > 1) {
      const next = currentPage - 1;
      setCurrentPage(next);
      if (onPageChange) onPageChange(next, numPages);
    }
  };

  const handleNextPage = () => {
    if (currentPage < numPages) {
      const next = currentPage + 1;
      setCurrentPage(next);
      if (onPageChange) onPageChange(next, numPages);
    }
  };

  if (renderError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50 border border-slate-300 rounded shadow-sm">
        <AlertTriangle className="w-12 h-12 text-amber-500 mb-3" />
        <h4 className="text-sm font-bold text-slate-800">Direct PDF Canvas Preview Unavailable</h4>
        <p className="text-xs text-slate-600 max-w-md mt-1 mb-4">{renderError}</p>
        <p className="text-xs text-slate-500">Please use "Open in Full Tab" or "Download PDF" to view this file.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full h-full min-h-0">
      {/* Page Navigator bar */}
      {numPages > 1 && (
        <div className="bg-slate-800 text-white px-3 py-1.5 rounded-full flex items-center gap-3 shadow-md mb-3 text-xs shrink-0 select-none">
          <button
            type="button"
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            className="p-1 rounded hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed transition-colors"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="font-medium text-slate-200">
            Page <strong className="text-white">{currentPage}</strong> of <strong>{numPages}</strong>
          </span>

          <button
            type="button"
            onClick={handleNextPage}
            disabled={currentPage >= numPages}
            className="p-1 rounded hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed transition-colors"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Canvas Wrapper */}
      <div className="flex-1 w-full overflow-auto flex items-center justify-center p-2 relative min-h-0">
        {loading && (
          <div className="absolute inset-0 bg-slate-100/70 backdrop-blur-[1px] flex flex-col items-center justify-center z-10">
            <Loader2 className="w-8 h-8 text-[#0b3d6e] animate-spin mb-2" />
            <span className="text-xs font-semibold text-slate-700">Rendering high-resolution PDF...</span>
          </div>
        )}

        <div className="bg-white rounded shadow-xl border border-slate-300 overflow-hidden flex items-center justify-center">
          <canvas
            ref={canvasRef}
            className="block max-w-none transition-transform duration-150 ease-out"
          />
        </div>
      </div>
    </div>
  );
};
