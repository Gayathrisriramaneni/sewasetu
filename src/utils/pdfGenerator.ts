import { jsPDF } from 'jspdf';
import { Application } from '../types';

export function downloadAcknowledgmentPdf(app: Application) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Top header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('GOVERNMENT OF PURVANCHAL', 105, 20, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text('Department of Social Welfare', 105, 27, { align: 'center' });
  doc.text('Old Age Pension Scheme - Acknowledgment', 105, 33, { align: 'center' });

  // Decorative border lines
  doc.setLineWidth(0.5);
  doc.line(15, 38, 195, 38);
  doc.line(15, 40, 195, 40);

  // Table fields
  const fields = [
    { label: 'Application No', value: app.application_no },
    { label: 'Applicant Name', value: app.applicant_name },
    { label: 'Mobile', value: app.mobile },
    { label: 'Date of Birth', value: app.dob },
    { label: 'Gender', value: app.gender },
    { label: 'Marital Status', value: app.marital_status },
    { label: 'Village', value: app.village },
    { label: 'Block', value: app.block },
    { label: 'Bank Account', value: app.bank_account },
    { label: 'IFSC', value: app.ifsc },
    { label: 'Submitted At', value: new Date(app.submitted_at).toLocaleString() },
    { label: 'Status', value: app.status },
  ];

  let currentY = 50;
  const col1X = 20;
  const col2X = 80;
  const rowHeight = 9;

  doc.setFontSize(10);

  fields.forEach(f => {
    // Row background border
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(248, 249, 250);
    doc.rect(col1X, currentY, 60, rowHeight, 'FD');
    doc.setFillColor(255, 255, 255);
    doc.rect(col2X, currentY, 110, rowHeight, 'FD');

    // Text
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40, 40, 40);
    doc.text(f.label, col1X + 4, currentY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(20, 20, 20);
    doc.text(String(f.value || '-'), col2X + 4, currentY + 6);

    currentY += rowHeight;
  });

  // Footer note
  currentY += 12;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(
    'This is a computer generated acknowledgment. Processing SLA as per the Purvanchal Right to Public Services Act applies.',
    105,
    currentY,
    { align: 'center', maxWidth: 170 }
  );

  // Bottom border line
  doc.setLineWidth(0.5);
  doc.line(15, 275, 195, 275);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Sewa Setu Portal • Government of Purvanchal', 105, 280, { align: 'center' });

  doc.save(`${app.application_no}_acknowledgment.pdf`);
}
