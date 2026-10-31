import React, { useState, useEffect } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  ShieldCheck,
  Maximize2,
  RefreshCw,
} from 'lucide-react';
import {
  DocumentInfo,
  getDocumentDisplayUrl,
  isPdfDocument,
  isImageDocument,
  triggerDocumentDownload,
  dataUriToBlob,
} from '../utils/documentViewerHelper';
import { PdfCanvasViewer } from './PdfCanvasViewer';

interface DocumentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  docInfo: DocumentInfo;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  isOpen,
  onClose,
  docInfo,
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [isPdf, setIsPdf] = useState<boolean>(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [pdfLoadError, setPdfLoadError] = useState<boolean>(false);

  useEffect(() => {
    let createdBlobUrl: string | null = null;

    if (isOpen) {
      const url = getDocumentDisplayUrl(docInfo);
      setPreviewUrl(url);
      const isActualPdf = isPdfDocument(docInfo.docName, docInfo.docData) && !url.startsWith('data:image/svg+xml');
      setIsPdf(isActualPdf);
      setZoom(1);
      setRotation(0);
      setPdfLoadError(false);

      if (isActualPdf && url.startsWith('data:application/pdf')) {
        const blob = dataUriToBlob(url);
        if (blob) {
          createdBlobUrl = URL.createObjectURL(blob);
          setBlobUrl(createdBlobUrl);
        } else {
          setBlobUrl(null);
        }
      } else if (url.startsWith('blob:')) {
        setBlobUrl(url);
      } else {
        setBlobUrl(null);
      }
    } else {
      setBlobUrl(null);
    }

    return () => {
      if (createdBlobUrl) {
        URL.revokeObjectURL(createdBlobUrl);
      }
    };
  }, [isOpen, docInfo]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => {
    setZoom(1);
    setRotation(0);
  };
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  const handleOpenNewWindow = () => {
    const targetUrl = blobUrl || previewUrl;
    if (!targetUrl) return;

    if (isPdf) {
      if (blobUrl || targetUrl.startsWith('http') || targetUrl.startsWith('blob:')) {
        window.open(blobUrl || targetUrl, '_blank');
        return;
      }
    }

    const newWin = window.open();
    if (newWin) {
      const titleEsc = (docInfo.docName || 'Document').replace(/[<>&'"]/g, '');
      newWin.document.write(
        `<!DOCTYPE html><html><head><title>${titleEsc}</title><style>body{margin:0;background:#0f172a;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px;box-sizing:border-box;}img{max-width:96vw;max-height:94vh;object-fit:contain;background:#fff;border-radius:6px;box-shadow:0 15px 35px rgba(0,0,0,0.5);}</style></head><body><img src="${targetUrl}" alt="${titleEsc}" /></body></html>`
      );
      newWin.document.close();
    }
  };

  const handleDownload = () => {
    triggerDocumentDownload(docInfo);
  };

  const isSvgFallback = previewUrl.startsWith('data:image/svg+xml');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="doc-modal-title"
    >
      <div className="bg-white rounded-lg shadow-2xl flex flex-col w-full max-w-5xl h-[92vh] border border-slate-300 overflow-hidden">
        {/* Modal Header */}
        <div className="bg-[#0b3d6e] text-white px-4 py-3 flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="p-1.5 bg-white/10 rounded">
              {isPdf ? (
                <FileText className="w-5 h-5 text-amber-300 shrink-0" />
              ) : (
                <ImageIcon className="w-5 h-5 text-emerald-300 shrink-0" />
              )}
            </div>
            <div className="truncate">
              <h3 id="doc-modal-title" className="text-sm sm:text-base font-bold truncate text-white">
                {docInfo.docName || 'Applicant Age Proof Document'}
              </h3>
              <p className="text-xs text-blue-100/80 truncate">
                {docInfo.applicantName ? `Applicant: ${docInfo.applicantName}` : ''}{' '}
                {docInfo.applicationNo ? `· App No: ${docInfo.applicationNo}` : ''}
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={handleZoomIn}
              title="Zoom In"
              className="p-1.5 rounded hover:bg-white/15 text-white/90 hover:text-white transition-colors cursor-pointer"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              title="Zoom Out"
              className="p-1.5 rounded hover:bg-white/15 text-white/90 hover:text-white transition-colors cursor-pointer"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleRotate}
              title="Rotate 90°"
              className="p-1.5 rounded hover:bg-white/15 text-white/90 hover:text-white transition-colors cursor-pointer"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              title="Reset View"
              className="px-2 py-1 text-xs rounded hover:bg-white/15 text-white/90 hover:text-white transition-colors cursor-pointer font-mono"
            >
              {Math.round(zoom * 100)}%
            </button>
            <div className="h-4 w-px bg-white/20 mx-1" />

            <button
              type="button"
              onClick={handleOpenNewWindow}
              title="Open in Full Window"
              className="p-1.5 rounded hover:bg-white/15 text-white/90 hover:text-white transition-colors cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleDownload}
              title="Download Document"
              className="p-1.5 rounded bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold transition-colors flex items-center gap-1 text-xs px-2.5 cursor-pointer shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              title="Close Viewer (Esc)"
              className="p-1.5 rounded hover:bg-red-600 text-white/90 hover:text-white transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Verification Alert Banner */}
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between text-xs text-amber-900 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>
              <strong>Officer Verification Note:</strong> Verify applicant name, date of birth, and identity credentials against state registry before approval.
            </span>
          </div>
          {isSvgFallback && (
            <span className="bg-blue-100 text-[#0b3d6e] px-2 py-0.5 rounded font-semibold text-[11px] shrink-0 ml-2">
              Statutory Archive Record
            </span>
          )}
        </div>

        {/* Document Display Canvas */}
        <div className="flex-1 bg-slate-100 overflow-auto flex items-center justify-center p-2 sm:p-4 relative">
          {isPdf ? (
            <div className="w-full h-full flex flex-col bg-white rounded shadow-sm border border-slate-300 overflow-hidden">
              <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-200 flex items-center justify-between text-xs text-slate-700 shrink-0">
                <div className="flex items-center gap-1.5 truncate">
                  <FileText className="w-4 h-4 text-red-600 shrink-0" />
                  <span className="font-semibold text-slate-800 truncate">{docInfo.docName || 'Age Proof PDF'}</span>
                  {docInfo.docSize && (
                    <span className="text-slate-500 font-mono text-[11px]">({(docInfo.docSize / 1024).toFixed(1)} KB)</span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleOpenNewWindow}
                    className="btn-gov btn-secondary text-xs px-2 py-0.5 flex items-center gap-1 cursor-pointer"
                    title="Open in new window / full tab for browser PDF controls"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open in Full Tab</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="btn-gov text-xs px-2 py-0.5 flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PDF</span>
                  </button>
                </div>
              </div>

              <div className="flex-1 w-full h-full min-h-0 bg-slate-100 p-2 overflow-auto flex items-center justify-center">
                <PdfCanvasViewer
                  dataUri={previewUrl}
                  blobUrl={blobUrl}
                  docName={docInfo.docName}
                  zoom={zoom}
                  rotation={rotation}
                />
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center overflow-auto p-4 min-h-0">
              <div
                className="transition-transform duration-200 ease-out flex items-center justify-center"
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transformOrigin: 'center center',
                }}
              >
                <img
                  src={previewUrl}
                  alt={docInfo.docName || 'Uploaded proof document'}
                  style={{
                    width: isSvgFallback ? `${Math.round(620 * zoom)}px` : undefined,
                    maxWidth: '92vw',
                    maxHeight: '74vh',
                    aspectRatio: isSvgFallback ? '800 / 1050' : undefined,
                  }}
                  className="object-contain rounded shadow-lg border border-slate-300 bg-white block min-w-[280px] min-h-[360px]"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (!target.src.startsWith('data:image/svg+xml')) {
                      target.src = getDocumentDisplayUrl({ ...docInfo, docData: undefined });
                    }
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs text-slate-600">
          <div className="flex items-center gap-3">
            <span>
              Document: <strong className="text-slate-800">{docInfo.docName || 'Age_Proof_Document'}</strong>
            </span>
            {docInfo.docSize && (
              <span>Size: {(docInfo.docSize / 1024).toFixed(1)} KB</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownload}
              className="px-3 py-1 bg-white border border-slate-300 hover:bg-slate-100 rounded text-slate-700 font-medium flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download File</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded font-medium cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
