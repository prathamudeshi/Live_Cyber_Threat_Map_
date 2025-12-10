import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Attack, MaliciousIP } from '../types';

export const generateReport = (attacks: Attack[], ips: MaliciousIP[], briefing: any) => {
  const doc = new jsPDF();
  const date = new Date().toLocaleDateString();
  const time = new Date().toLocaleTimeString();

  // Color Palette
  const colors = {
    primary: [45, 212, 191], // Cyan-500
    dark: [15, 23, 42],      // Slate-900
    text: [51, 65, 85]       // Slate-700
  };

  // Header Background
  doc.setFillColor(15, 23, 42); 
  doc.rect(0, 0, 210, 40, 'F');

  // Title
  doc.setTextColor(45, 212, 191);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("CYBER THREAT INTELLIGENCE REPORT", 105, 20, { align: "center" });

  doc.setFontSize(10);
  doc.setTextColor(200, 200, 200);
  doc.text(`Generated: ${date} ${time}`, 105, 30, { align: "center" });

  // AI Briefing Section
  let yPos = 50;
  if (briefing && !briefing.error) {
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("EXECUTIVE BRIEFING (AI)", 14, yPos);
    
    yPos += 10;
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(50, 50, 50);
    
    const summaryLines = doc.splitTextToSize(briefing.summary, 180);
    doc.text(summaryLines, 14, yPos);
    yPos += (summaryLines.length * 7) + 5;

    // Bullet points
    if (briefing.points && Array.isArray(briefing.points)) {
        briefing.points.forEach((point: string) => {
            doc.text(`• ${point}`, 20, yPos);
            yPos += 7;
        });
    }
    
    yPos += 10;
  }

  // Threat Statistics Section
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("DETECTED THREATS", 14, yPos);
  yPos += 10;

  // Prepare table data for Attacks
  const attackRows = attacks.map(atk => [
    atk.source.code,
    atk.target.code,
    atk.type.join(', '),
    atk.severity,
    new Date(atk.timestamp).toLocaleTimeString()
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Source', 'Target', 'Type', 'Severity', 'Time']],
    body: attackRows,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: [45, 212, 191] },
    styles: { fontSize: 8 },
    margin: { top: 10 }
  });

  // @ts-ignore
  yPos = doc.lastAutoTable.finalY + 20;

  // Malicious IPs Section
  doc.text("MALICIOUS IP ACTIVITY", 14, yPos);
  yPos += 10;

  const ipRows = ips.map(ip => [
    ip.ip,
    ip.latitude && ip.longitude 
      ? `${ip.latitude.toFixed(2)},${ip.longitude.toFixed(2)}` 
      : 'N/A',
    ip.severity,
    ip.country_code || 'UNK'
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['IP Address', 'Coordinates', 'Severity', 'Origin']],
    body: ipRows,
    theme: 'striped',
    headStyles: { fillColor: [185, 28, 28], textColor: [255, 255, 255] }, // Red for danger
    styles: { fontSize: 8 }
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Page ${i} of ${pageCount} | CONFIDENTIAL | DeepCytes Platform`, 105, 290, { align: "center" });
  }

  doc.save(`DeepCytes_Report_${date.replace(/\//g, '-')}.pdf`);
};
