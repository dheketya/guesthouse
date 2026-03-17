// Open a print window with styled HTML content
export function printContent(title, bodyHtml) {
  const win = window.open('', '_blank');
  win.document.write(`<html>
<head><title>${title}</title>
<style>
  body { font-family: 'Khmer OS Siemreap', 'Segoe UI', sans-serif; padding: 30px; color: #1a1a2e; font-size: 13px; }
  h1 { font-size: 22px; margin-bottom: 4px; }
  h2 { font-size: 16px; margin: 16px 0 8px; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0; }
  th, td { padding: 6px 10px; text-align: left; border-bottom: 1px solid #ddd; }
  th { background: #f5f5f5; font-size: 11px; text-transform: uppercase; font-weight: 600; }
  .header { text-align: center; border-bottom: 2px solid #1a1a2e; padding-bottom: 12px; margin-bottom: 16px; }
  .header p { color: #666; font-size: 12px; }
  .info-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 20px; margin-bottom: 12px; }
  .total-section { text-align: right; margin-top: 10px; }
  .total-section p { margin: 2px 0; }
  .grand-total { font-size: 16px; font-weight: 700; border-top: 2px solid #1a1a2e; padding-top: 6px; margin-top: 6px; }
  .footer { margin-top: 30px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #ddd; padding-top: 12px; }
  .sig-area { margin-top: 40px; display: flex; justify-content: space-between; }
  .sig-line { width: 180px; text-align: center; }
  .sig-line div { border-top: 1px solid #333; margin-top: 40px; padding-top: 4px; font-size: 11px; color: #666; }
  @media print { body { padding: 15px; } }
</style>
</head><body>${bodyHtml}</body></html>`);
  win.document.close();
  win.print();
}
