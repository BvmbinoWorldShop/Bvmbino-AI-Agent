/**
 * export.js — High-Fidelity Document Export Engine.
 * FIXED v3.6
 *
 * AUDIT NOTES:
 *  - Restored unzoned-block fallback regex in parseScheduleBlocks (auto-assigns
 *    DEEP/ADMIN/RECOVERY by hour-of-day if zone tag is missing)
 *  - showPdfModal now uses .show class instead of inline display:flex so it
 *    matches the CSS in index.html
 *  - mdToHtmlBody now correctly preserves paragraph breaks
 */

import { state, toast } from './core.js';

let currentPdfFilename = 'bvmbino-document.pdf';
let currentPdfOrientation = 'portrait';

/**
 * 📅 Schedule Logic
 */
export function parseScheduleBlocks(text) {
  const result = {};
  let cur = null;
  const clean = s => s.replace(/\*\*/g, '').replace(/\*/g, '').replace(/__/g, '').trim();

  for (const rawLine of text.split('\n')) {
    const line = clean(rawLine);
    const dm = line.match(/(?:===\s*)?(MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY)(?:\s*===|:|\s*$)/i);
    if (dm) { cur = dm[1].toUpperCase(); if (!result[cur]) result[cur] = []; continue; }
    if (!cur) continue;

    // Primary format: HH:MM - HH:MM | Activity | ZONE
    const bm = line.match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})\s*[|–-]\s*(.+?)\s*[|–-]\s*(DEEP|ADMIN|RECOVERY)/i);
    if (bm) {
      result[cur].push({ start: bm[1], end: bm[2], activity: bm[3].trim(), zone: bm[4].toUpperCase() });
      continue;
    }

    // FIX: Fallback format — HH:MM - HH:MM Activity (auto-assign zone by hour)
    const bm2 = line.match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})\s+(.+)/);
    if (bm2) {
      const h = parseInt(bm2[1], 10);
      const zone = h < 12 ? 'DEEP' : h < 17 ? 'ADMIN' : 'RECOVERY';
      result[cur].push({ start: bm2[1], end: bm2[2], activity: bm2[3].trim(), zone });
    }
  }
  return result;
}

export function buildScheduleHTML(blocks, view, rawText) {
  const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
  const SHORT = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  const ZC = { DEEP: '#ef4444', ADMIN: '#f59e0b', RECOVERY: '#22c55e' };
  const ZB = { DEEP: '#fff0f0', ADMIN: '#fffbeb', RECOVERY: '#f0fdf4' };
  const ZL = { DEEP: '🔴 Deep Work', ADMIN: '🟡 Admin', RECOVERY: '🟢 Recovery' };
  const dateStr = new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const viewLabel = { weekly: 'Weekly', daily: 'Daily', biweekly: 'Bi-Weekly', monthly: 'Monthly' };

  let showDays = DAYS;
  if (view === 'daily') {
    const dayWithBlocks = DAYS.find(d => blocks[d] && blocks[d].length) || 'MONDAY';
    showDays = [dayWithBlocks];
  }

  let cols = '';
  for (let i = 0; i < showDays.length; i++) {
    const day = showDays[i];
    const si = DAYS.indexOf(day);
    const dayBlocks = blocks[day] || [];
    const isWeekend = si >= 5;
    cols += `<div class="day-col${isWeekend ? ' weekend' : ''}">
      <div class="day-head">${view === 'daily' ? day : SHORT[si]}</div>`;
    if (!dayBlocks.length) {
      cols += `<div class="rest-block">Rest / Flex</div>`;
    } else {
      for (const b of dayBlocks) {
        cols += `<div class="block" style="background:${ZB[b.zone] || '#f8f8ff'};border-left:3px solid ${ZC[b.zone] || '#7C5CFC'}">
          <div class="bact">${b.activity}</div>
          <div class="btime">${b.start}–${b.end}</div>
          <div class="bzone" style="color:${ZC[b.zone] || '#7C5CFC'}">${ZL[b.zone] || b.zone}</div>
        </div>`;
      }
    }
    cols += `</div>`;
  }

  const numCols = showDays.length;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;background:#f0eeff;padding:24px}
.wrap{max-width:${numCols <= 1 ? '500px' : '1100px'};margin:0 auto}
.hdr{background:linear-gradient(135deg,#7C5CFC,#9b7dff);color:white;border-radius:12px 12px 0 0;padding:24px 28px}
.hdr h1{font-size:22px;font-weight:700}
.grid{display:grid;grid-template-columns:repeat(${numCols},1fr);gap:1px;background:#ede9ff;border-radius:0 0 12px 12px;overflow:hidden}
.day-col{background:white;display:flex;flex-direction:column}
.day-col.weekend{background:#fafff9}
.day-head{padding:10px 8px;text-align:center;background:#f8f7ff;font-weight:700;font-size:11px;color:#7C5CFC;letter-spacing:.8px;border-bottom:2px solid #ede9ff}
.block{margin:3px 5px;border-radius:5px;padding:5px 7px}
.bact{font-size:10px;font-weight:600;color:#1a1a2e;line-height:1.3}
.btime{font-size:9px;color:#888;margin-top:2px}
.bzone{font-size:8px;margin-top:2px;font-weight:500}
.rest-block{padding:16px 8px;text-align:center;color:#bbb;font-size:10px;font-style:italic}
</style></head><body><div class="wrap">
<div class="hdr"><h1>📅 BVMBINO ${viewLabel[view] || 'Weekly'} SCHEDULE</h1></div>
<div class="grid">${cols}</div>
</div></body></html>`;
}

/**
 * 📋 PDF Export System
 */
export function mdToHtmlBody(text) {
  return String(text || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^/, '<p>').replace(/$/, '</p>');
}

export function buildExportHtml(text, xtype) {
  const body = mdToHtmlBody(text);
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    body { font-family: 'Outfit', sans-serif; padding: 40px; line-height: 1.6; color: #1a1a1a; }
    h1 { color: #d4940a; border-bottom: 2px solid #f0eeff; padding-bottom: 10px; }
    h2 { color: #d4940a; margin-top: 20px; }
    p { margin: 8px 0; }
    code { background: #f0eeff; padding: 1px 5px; border-radius: 3px; color: #d4940a; }
  </style></head><body>${body}</body></html>`;
}

// FIX: Use .show class to match the index.html CSS pattern, not inline display.
export function showPdfModal(html) {
  const m = document.getElementById('preview-modal');
  const c = document.getElementById('preview-content');
  if (!m || !c) { toast('Preview modal not found'); return; }
  c.innerHTML = html;
  m.classList.add('show');
  m.style.display = 'flex'; // belt + suspenders for older CSS
}

export function closePreview() {
  const m = document.getElementById('preview-modal');
  if (!m) return;
  m.classList.remove('show');
  m.style.display = 'none';
}

export async function saveAsPdf() {
  const el = document.getElementById('preview-content');
  if (!el) { toast('Nothing to export'); return; }
  if (typeof html2pdf === 'undefined') { toast('PDF library not loaded'); return; }
  toast("Generating PDF...");
  const opt = {
    margin: 10,
    filename: currentPdfFilename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: currentPdfOrientation }
  };
  html2pdf().from(el).set(opt).save().then(() => {
    toast("Document Exported ✓");
    closePreview();
  }).catch(err => {
    console.error('PDF save failed:', err);
    toast('PDF save failed');
  });
}

// Global bridges
if (typeof window !== 'undefined') {
  window.saveAsPdf = saveAsPdf;
  window.closePreview = closePreview;
  window.showPdfModal = showPdfModal;
}
