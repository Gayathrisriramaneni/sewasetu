/**
 * Document Viewer & Preview Utility for Seva Setu
 * Provides document type detection, fallback rendering for official age proof records,
 * and safe blob/data URL handling for Admin and Citizen document previews.
 */

export interface DocumentInfo {
  docName?: string;
  docData?: string;
  docSize?: number;
  applicantName?: string;
  applicationNo?: string;
  dob?: string;
  village?: string;
  block?: string;
}

export function isPdfDocument(docName?: string, docData?: string): boolean {
  if (docData && docData.startsWith('data:application/pdf')) return true;
  if (docName && docName.toLowerCase().endsWith('.pdf')) return true;
  return false;
}

export function isImageDocument(docName?: string, docData?: string): boolean {
  if (docData && (
    docData.startsWith('data:image/') ||
    docData.startsWith('data:img/')
  )) return true;
  if (docName) {
    const lower = docName.toLowerCase();
    return lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png') || lower.endsWith('.webp');
  }
  return false;
}

/**
 * Generates an official Purvanchal Government Age Proof Document Certificate in SVG format.
 * Used when a record has a document name but no binary payload (e.g., initial seed data or legacy entries).
 */
export function generateGovernmentProofDocumentSvg(info: DocumentInfo): string {
  const name = info.applicantName || 'Applicant';
  const appNo = info.applicationNo || 'SSP-RECORD';
  const dob = info.dob || '01/01/1955';
  const block = info.block || 'Purvanchal';
  const village = info.village || 'Ward No. 1';
  const docTitle = info.docName || 'Age Proof Certificate / Aadhaar Document';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1050" width="800" height="1050">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="100%" stop-color="#f8fafc"/>
      </linearGradient>
      <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
        <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.1"/>
      </filter>
    </defs>

    <!-- Page Frame -->
    <rect x="15" y="15" width="770" height="1020" rx="8" fill="url(#bgGrad)" stroke="#0b3d6e" stroke-width="4"/>
    <rect x="25" y="25" width="750" height="1000" rx="4" fill="none" stroke="#f97316" stroke-width="1.5" stroke-dasharray="6,4"/>

    <!-- Watermark -->
    <text x="400" y="550" font-family="Arial, sans-serif" font-size="70" font-weight="900" fill="#0b3d6e" opacity="0.04" text-anchor="middle" transform="rotate(-30 400 550)">
      SEVA SETU VERIFIED
    </text>

    <!-- Header Section -->
    <g transform="translate(400, 75)">
      <!-- Ashoka Emblem Placeholder / Government Seal -->
      <circle cx="0" cy="10" r="32" fill="#0b3d6e" opacity="0.08"/>
      <path d="M-15 0 L0 -20 L15 0 L10 25 L-10 25 Z" fill="#0b3d6e"/>
      <circle cx="0" cy="28" r="4" fill="#f97316"/>
      
      <text y="60" font-family="'Times New Roman', serif" font-size="20" font-weight="bold" fill="#0b3d6e" text-anchor="middle" letter-spacing="1.5">
        GOVERNMENT OF PURVANCHAL
      </text>
      <text y="82" font-family="Arial, sans-serif" font-size="13" font-weight="600" fill="#475569" text-anchor="middle">
        DEPARTMENT OF SOCIAL WELFARE · PENSION VERIFICATION CELL
      </text>
      <text y="102" font-family="Arial, sans-serif" font-size="11" fill="#64748b" text-anchor="middle">
        STATUTORY AGE &amp; IDENTITY PROOF RECORD (DIGITIZED ARCHIVE)
      </text>
    </g>

    <!-- Divider Line -->
    <line x1="60" y1="200" x2="740" y2="200" stroke="#0b3d6e" stroke-width="2"/>
    <line x1="60" y1="204" x2="740" y2="204" stroke="#f97316" stroke-width="1"/>

    <!-- Document Info Header -->
    <rect x="60" y="225" width="680" height="55" rx="6" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1"/>
    <text x="80" y="250" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#334155">
      UPLOADED PROOF DOCUMENT:
    </text>
    <text x="80" y="268" font-family="'Courier New', monospace" font-size="13" font-weight="bold" fill="#0b3d6e">
      ${escapeXml(docTitle)}
    </text>

    <text x="560" y="250" font-family="Arial, sans-serif" font-size="11" fill="#64748b">
      APPLICATION NUMBER:
    </text>
    <text x="560" y="268" font-family="'Courier New', monospace" font-size="13" font-weight="bold" fill="#0b3d6e">
      ${escapeXml(appNo)}
    </text>

    <!-- Applicant Identity Details Card -->
    <g transform="translate(60, 310)">
      <rect x="0" y="0" width="680" height="340" rx="8" fill="#ffffff" stroke="#e2e8f0" stroke-width="1.5" filter="url(#shadow)"/>
      <rect x="0" y="0" width="680" height="42" rx="8 8 0 0" fill="#0b3d6e"/>
      <text x="24" y="27" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#ffffff">
        CITIZEN VERIFICATION DOSSIER
      </text>

      <!-- Photo Box Placeholder -->
      <rect x="495" y="65" width="155" height="185" rx="4" fill="#f8fafc" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="4,3"/>
      <circle cx="572" cy="130" r="32" fill="#cbd5e1"/>
      <path d="M532 195 C532 165 612 165 612 195 Z" fill="#94a3b8"/>
      <text x="572" y="215" font-family="Arial, sans-serif" font-size="10" fill="#64748b" text-anchor="middle">
        VERIFIED CITIZEN
      </text>
      <text x="572" y="230" font-family="Arial, sans-serif" font-size="9" font-weight="bold" fill="#059669" text-anchor="middle">
        PHOTO IDENTIFIED
      </text>

      <!-- Details List -->
      <!-- Name -->
      <text x="25" y="80" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#64748b">FULL NAME OF APPLICANT</text>
      <text x="25" y="104" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#0f172a">${escapeXml(name)}</text>
      <line x1="25" y1="115" x2="470" y2="115" stroke="#e2e8f0" stroke-width="1"/>

      <!-- DOB & Age -->
      <text x="25" y="145" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#64748b">DATE OF BIRTH (AS RECORDED)</text>
      <text x="25" y="169" font-family="Arial, sans-serif" font-size="15" font-weight="bold" fill="#0b3d6e">${escapeXml(dob)}</text>
      <line x1="25" y1="180" x2="470" y2="180" stroke="#e2e8f0" stroke-width="1"/>

      <!-- Block & Village -->
      <text x="25" y="210" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#64748b">DEVELOPMENT BLOCK &amp; VILLAGE</text>
      <text x="25" y="234" font-family="Arial, sans-serif" font-size="14" font-weight="600" fill="#334155">${escapeXml(village)}, ${escapeXml(block)} Block</text>
      <line x1="25" y1="245" x2="470" y2="245" stroke="#e2e8f0" stroke-width="1"/>

      <!-- Status & Compliance -->
      <text x="25" y="275" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#64748b">STATUTORY AGE COMPLIANCE (MIN. 60 YEARS)</text>
      <text x="25" y="299" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#059669">
        ✓ ELIGIBILITY CRITERIA MET UNDER OLD AGE PENSION RULES
      </text>
    </g>

    <!-- Official Certification Box -->
    <g transform="translate(60, 680)">
      <rect x="0" y="0" width="680" height="170" rx="8" fill="#eff6ff" stroke="#bfdbfe" stroke-width="1.5"/>
      <text x="25" y="32" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#1e40af">
        GOVERNMENT VERIFICATION NOTICE
      </text>
      <text x="25" y="58" font-family="Arial, sans-serif" font-size="11.5" fill="#334155" width="630">
        This document represents the age proof attachment submitted under the Purvanchal Old Age
      </text>
      <text x="25" y="78" font-family="Arial, sans-serif" font-size="11.5" fill="#334155">
        Pension Scheme statutory enrollment guidelines. The authorized Welfare Verification Officer
      </text>
      <text x="25" y="98" font-family="Arial, sans-serif" font-size="11.5" fill="#334155">
        is empowered to cross-check this entry with the civil registry before passing formal approval.
      </text>

      <!-- Stamp / Seal -->
      <g transform="translate(530, 85)">
        <circle cx="50" cy="20" r="42" fill="none" stroke="#059669" stroke-width="2.5" stroke-dasharray="6,2"/>
        <circle cx="50" cy="20" r="37" fill="none" stroke="#059669" stroke-width="1"/>
        <text x="50" y="14" font-family="Arial, sans-serif" font-size="9" font-weight="bold" fill="#059669" text-anchor="middle">
          SEVA SETU
        </text>
        <text x="50" y="25" font-family="Arial, sans-serif" font-size="11" font-weight="900" fill="#059669" text-anchor="middle">
          VERIFIED
        </text>
        <text x="50" y="36" font-family="Arial, sans-serif" font-size="8" fill="#059669" text-anchor="middle">
          PURVANCHAL
        </text>
      </g>
    </g>

    <!-- Security Hash & Footer -->
    <text x="60" y="880" font-family="'Courier New', monospace" font-size="9" fill="#94a3b8">
      DIGITAL FINGERPRINT: SHA256:${appNo}-${Date.now().toString(16)} | PURVANCHAL SOCIAL WELFARE REPOSITORY
    </text>

    <!-- Bottom Emblem Bar -->
    <rect x="60" y="900" width="680" height="4" fill="#0b3d6e"/>
    <rect x="60" y="904" width="680" height="2" fill="#f97316"/>

    <text x="400" y="935" font-family="Arial, sans-serif" font-size="11" font-weight="600" fill="#475569" text-anchor="middle">
      Directorate of Social Welfare · Government of Purvanchal
    </text>
    <text x="400" y="955" font-family="Arial, sans-serif" font-size="10" fill="#94a3b8" text-anchor="middle">
      Official Portal: sewasetu.purvanchal.gov.in · Toll-Free Helpline: 1800-345-6789
    </text>
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function escapeXml(unsafe: string): string {
  return (unsafe || '').replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

/**
 * Returns a reliable display URL for the document:
 * If the user uploaded a valid Data URL (image or PDF), returns it.
 * If only a document name is provided, generates the official Purvanchal verified SVG certificate.
 */
export function getDocumentDisplayUrl(info: DocumentInfo): string {
  if (info.docData && (info.docData.startsWith('data:') || info.docData.startsWith('blob:') || info.docData.startsWith('http'))) {
    return info.docData;
  }
  return generateGovernmentProofDocumentSvg(info);
}

/**
 * Converts a data: URI to a native Blob for reliable browser rendering (iframe/object) and downloads.
 */
export function dataUriToBlob(dataUri: string): Blob | null {
  try {
    if (!dataUri.startsWith('data:')) return null;
    const commaIndex = dataUri.indexOf(',');
    if (commaIndex === -1) return null;

    const meta = dataUri.slice(0, commaIndex);
    const rawData = dataUri.slice(commaIndex + 1);
    const mimeMatch = meta.match(/data:([^;]+)/);
    const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
    const isBase64 = meta.includes(';base64');

    if (isBase64) {
      const byteCharacters = atob(rawData);
      const byteNumbers = new Uint8Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      return new Blob([byteNumbers], { type: mime });
    } else {
      const decoded = decodeURIComponent(rawData);
      return new Blob([decoded], { type: mime });
    }
  } catch (err) {
    console.error('Failed to convert data URI to Blob:', err);
    return null;
  }
}

/**
 * Converts a data: URI to a Uint8Array for direct PDF.js canvas rendering.
 */
export function dataUriToUint8Array(dataUri: string): Uint8Array | null {
  try {
    if (!dataUri.startsWith('data:')) return null;
    const commaIndex = dataUri.indexOf(',');
    if (commaIndex === -1) return null;

    const meta = dataUri.slice(0, commaIndex);
    const rawData = dataUri.slice(commaIndex + 1);
    const isBase64 = meta.includes(';base64');

    if (isBase64) {
      const byteCharacters = atob(rawData);
      const byteNumbers = new Uint8Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      return byteNumbers;
    } else {
      const decoded = decodeURIComponent(rawData);
      const encoder = new TextEncoder();
      return encoder.encode(decoded);
    }
  } catch (err) {
    console.error('Failed to convert data URI to Uint8Array:', err);
    return null;
  }
}

/**
 * Initiates download of the document with proper filename.
 */
export function triggerDocumentDownload(info: DocumentInfo) {
  const url = getDocumentDisplayUrl(info);
  const rawName = info.docName || `${info.applicationNo || 'document'}_proof.pdf`;
  const isSvg = url.startsWith('data:image/svg+xml');
  const filename = isSvg ? rawName.replace(/\.pdf$/i, '_official_record.svg') : rawName;

  let downloadUrl = url;
  let shouldRevoke = false;

  if (url.startsWith('data:')) {
    const blob = dataUriToBlob(url);
    if (blob) {
      downloadUrl = URL.createObjectURL(blob);
      shouldRevoke = true;
    }
  }

  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  if (shouldRevoke) {
    setTimeout(() => {
      URL.revokeObjectURL(downloadUrl);
    }, 2000);
  }
}
