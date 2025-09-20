
(() => {
  if (window.__FILL_MARKS_PANEL__) return;
  // Only run on the allowed pattern as an extra guard
  if (!/^https:\/\/connect\.bracu\.ac\.bd\/app\/exam-controller\/mark-entry\/final\//.test(location.href)) return;
  window.__FILL_MARKS_PANEL__ = true;

  // =========================
  // Config defaults
  // =========================
  const CONFIG = {
    csv: { skipRows: 10, idCol: 1, nameCol: 2, finalCol: 7, totalCol: 8 },

    totalMarksSelector: 'input[placeholder="Total marks"]',
    // Page selectors
    rowSelector: 'app-repeat-section-type.ng-star-inserted div.row.ng-star-inserted',
    studentSelector: 'input[placeholder="Student"], input[aria-label="Student"]',
    marksSelector:   'input[placeholder="Marks"], input[aria-label="Marks"]',
    statusSelector:  'mat-select',

    warnHighlightMs: 1500,
    verbose: true,
  };

  // =========================
  // Utilities
  // =========================
  const log  = (...a) => CONFIG.verbose && console.log('[FILL]', ...a);
  const warn = (...a) => console.warn('[FILL]', ...a);
  const norm = (s) => String(s ?? '').trim();

  const fire = (el) => {
    el.dispatchEvent(new Event('input',  { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur',   { bubbles: true }));
  };

  const flashRow = (rowEl, color = 'rgba(255,165,0,0.35)') => {
    if (!rowEl || !rowEl.style) return;
    const prev = rowEl.style.backgroundColor;
    rowEl.style.backgroundColor = color;
    setTimeout(() => { rowEl.style.backgroundColor = prev; }, CONFIG.warnHighlightMs);
  };
  const setTotalMarksGlobal = (value) => {
    const el = document.querySelector(CONFIG.totalMarksSelector);
    if (!el) {
      warn('Total marks input not found by placeholder.');
      return false;
    }
    const next = String(value);
    if (el.value !== next) {
      el.value = next;
      fire(el);
    }
    return true;
  };


  // =========================
  // CSV parsing
  // =========================
  const parseCSV = (str) => {
    const rows = [];
    let row = [], cell = '', i = 0, inQuotes = false;
    while (i < str.length) {
      const c = str[i];
      if (inQuotes) {
        if (c === '"') {
          if (str[i + 1] === '"') { cell += '"'; i += 2; continue; }
          inQuotes = false; i++; continue;
        }
        cell += c; i++; continue;
      }
      if (c === '"') { inQuotes = true; i++; continue; }
      if (c === ',') { row.push(cell); cell = ''; i++; continue; }
      if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; i++; continue; }
      if (c === '\r') { i++; continue; }
      cell += c; i++;
    }
    row.push(cell); rows.push(row);
    return rows;
  };

  const parseNumberCell = (raw) => {
    if (raw == null) return null;
    const cleaned = String(raw).replace(/[()]/g, '').replace(/,/g, '').trim();
    if (!cleaned) return null;
    const num = parseFloat(cleaned);
    return Number.isNaN(num) ? null : Number(num).toFixed(2);
  };

  const parseFinalCell = (raw) => {
    if (raw == null) return { final: null, isAbsent: false };
    const s = String(raw).trim();
    if (/^\s*absent\s*$/i.test(s)) return { final: null, isAbsent: true };
    return { final: parseNumberCell(raw), isAbsent: false };
  };

  // =========================
  // Core processing
  // =========================
  const processCSVAgainstPage = async (file, cfg) => {
    // Ensure total marks set to 100
    try { setTotalMarksGlobal('100'); } catch(e) { /* no-op */ }
    if (!file) { warn('No CSV selected.'); return; }

    const text = await file.text();
    const rows = parseCSV(text);
    const dataRows = rows.slice(cfg.skipRows);

    const result = dataRows
      .map((r) => {
        const id    = norm(r[cfg.idCol]);
        const total = parseNumberCell(r[cfg.totalCol]);
        const { final, isAbsent } = parseFinalCell(r[cfg.finalCol]);
        // name is optional in this pass; can be useful for modal display if present
        const name = norm(r[cfg.nameCol] ?? '');
        if (!id || total == null) return null;
        return { id, name, total, final_marks: final, final_is_absent: isAbsent };
      })
      .filter(Boolean);

    const byID = new Map(
      result.map((r) => [r.id, { name: r.name, total: r.total, final_marks: r.final_marks, final_is_absent: r.final_is_absent }])
    );

    const pageRows = document.querySelectorAll(CONFIG.rowSelector);
    let filled = 0;
    const notInSheet = [];  // items on web but missing in CSV mapping
    const absentFinal = []; // IDs marked absent in CSV that exist on web
    const webIDs = new Set();

    // Fill
    pageRows.forEach((row, i) => {
      const studentEl = row.querySelector(CONFIG.studentSelector);
      const marksEl   = row.querySelector(CONFIG.marksSelector);
      if (!studentEl || !marksEl) { notInSheet.push({ row: i, id: '', name: '', reason: 'Missing inputs' }); return; }

      const rawStudent = norm(studentEl.value || studentEl.placeholder || '');
      if (!rawStudent) { notInSheet.push({ row: i, id: '', name: '', reason: 'Empty student' }); return; }

      const [idPart, ...nameParts] = rawStudent.split('-');
      const id = idPart.trim();
      const name = nameParts.join('-').trim();
      if (id) webIDs.add(id);

      const rec = byID.get(id);
      if (!rec) { notInSheet.push({ row: i, id, name, reason: 'Not in sheet' }); return; }

      if (rec.final_is_absent) {
        absentFinal.push({ id, name });
        flashRow(row, 'rgba(255,165,0,0.35)');
        marksEl.title = '⚠ Final Marks is Absent per CSV';
        // Try to set status to Absent
        const sel = row.querySelector(CONFIG.statusSelector);
        /*
		if (sel) {
          sel.click();
          setTimeout(() => {
            const opts = document.querySelectorAll('mat-option .mat-mdc-option-text, mat-option .mdc-list-item__primary-text');
            const absentOpt = [...opts].find(opt => opt.textContent.trim().toLowerCase() === 'absent');
            if (absentOpt) absentOpt.click();
          }, 200);
        }
		*/
        // Try to add remark
        let remarks = row.querySelector('input[placeholder="Remarks"], input[aria-label="Remarks"]') || row.querySelector('input[id*="final-remarks"]');
        if (remarks && remarks.value !== 'Absent from final exam') {
          remarks.value = 'Absent from final exam';
          fire(remarks);
        }
        filled++;
        return;
      }

      const prev = marksEl.value;
      if (prev !== rec.total && !rec.final_is_absent) {
        marksEl.value = rec.total;
        fire(marksEl);
      }
      filled++;
    });

    // CSV entries not on the web
    const notInConnect = result
      .filter((r) => !webIDs.has(r.id))
      .map((r) => ({ id: r.id, name: r.name, reason: 'Not in connect' }));

    // Show modal with summaries
    showSummaryModal({ absentFinal, notInSheet, notInConnect, processed: filled });
  };

  // =========================
  // UI (floating panel + modal)
  // =========================
  const mountPanel = () => {
    const host = document.createElement('div');
    document.documentElement.appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' });

    const root = document.createElement('div');
    root.className = 'fme-panel';
    const style = document.createElement('link');
    style.rel = 'stylesheet';
    style.href = chrome.runtime.getURL('styles.css');

    root.innerHTML = `
      <div class="fme-card">
        <div class="fme-row">
          <div class="fme-title">CSV → Marks Entry by <span class="fme-badge">Partho Sutra Dhor</span></div>
          <button class="fme-close" title="Hide panel">✕</button>
        </div>
        <div class="fme-row">
          <input class="fme-file fme-wide" type="file" accept=".csv,text/csv" />
        </div>
        <div class="fme-row">
          <label class="fme-small">Skip rows</label>
          <input class="fme-input fme-skip" type="number" min="0" step="1" value="${CONFIG.csv.skipRows}"/>
        </div>
        <div class="fme-row fme-grid">
          <label class="fme-small">ID</label>
          <select class="fme-select fme-id"></select>
          <label class="fme-small">Name</label>
          <select class="fme-select fme-name"></select>
        </div>
        <div class="fme-row fme-grid">
          <label class="fme-small">Final</label>
          <select class="fme-select fme-final"></select>
          <label class="fme-small">Total</label>
          <select class="fme-select fme-total"></select>
        </div>
        <div class="fme-row">
          <button class="fme-btn fme-run" disabled>Insert Marks</button>
        </div>
      </div>
`;

    shadow.append(style, root);

    
    const letters = Array.from({length: 26}, (_, i) => String.fromCharCode(65 + i)); // A..Z
    const makeOpts = (sel, defIdx) => {
      sel.innerHTML = letters.map((L, i) => `<option value="${i}" ${i===defIdx?'selected':''}>${L}</option>`).join('');
    };

    const fileInput = shadow.querySelector('.fme-file');
    const runBtn = shadow.querySelector('.fme-run');
    const closeBtn = shadow.querySelector('.fme-close');
    const skipEl = shadow.querySelector('.fme-skip');
    const idSel = shadow.querySelector('.fme-id');
    const nameSel = shadow.querySelector('.fme-name');
    const finalSel = shadow.querySelector('.fme-final');
    const totalSel = shadow.querySelector('.fme-total');

    makeOpts(idSel,    CONFIG.csv.idCol ?? 1);   // default B
    makeOpts(nameSel,  CONFIG.csv.nameCol ?? 2); // default C
    makeOpts(finalSel, CONFIG.csv.finalCol ?? 7);// default H
    makeOpts(totalSel, CONFIG.csv.totalCol ?? 8);// default I

    let selectedFile = null;
    fileInput.addEventListener('change', () => {
      selectedFile = fileInput.files?.[0] || null;
      runBtn.disabled = !selectedFile;
    });

    runBtn.addEventListener('click', async () => {
      runBtn.disabled = true;
      try {
        const cfg = {
          skipRows: Number(skipEl.value) || 0,
          idCol: Number(idSel.value) || 0,
          nameCol: Number(nameSel.value) || 0,
          finalCol: Number(finalSel.value) || 0,
          totalCol: Number(totalSel.value) || 0,
        };
        await processCSVAgainstPage(selectedFile, cfg);
      } finally {
        runBtn.disabled = false;
      }
    });

    closeBtn.addEventListener('click', () => {
      host.remove();
      window.__FILL_MARKS_PANEL__ = false;
    });

  };

  const showSummaryModal = ({ absentFinal = [], notInSheet = [], notInConnect = [], processed = 0 }) => {
    const host = document.createElement('div');
    document.documentElement.appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' });

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = chrome.runtime.getURL('styles.css');

    const wrap = document.createElement('div');
    wrap.className = 'fme-modal-backdrop';

    const buildTable = (rows, headers, rowClass) => {
      const table = document.createElement('table');
      table.className = 'fme-table';
      const thead = document.createElement('thead');
      const trh = document.createElement('tr');
      headers.forEach(h => {
        const th = document.createElement('th'); th.textContent = h; trh.appendChild(th);
      });
      thead.appendChild(trh);
      table.appendChild(thead);
      const tbody = document.createElement('tbody');
      rows.forEach(r => {
        const tr = document.createElement('tr');
        if (rowClass) tr.className = rowClass;
        if (rowClass) tr.className = rowClass;
        headers.forEach(h => {
          const td = document.createElement('td'); td.textContent = r[h.toLowerCase()] ?? r[h] ?? '';
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      return table;
    };

    wrap.innerHTML = `
      <div class="fme-modal">
        <header>
          <h3>Insertion Summary</h3>
          <span style="margin-left:auto" class="fme-small">Processed: ${processed}</span>
        </header>
        <div class="fme-modal-body"></div>
        <footer>
          <button class="fme-btn fme-ok">OK</button>
        </footer>
      </div>
    `;

    shadow.append(link, wrap);

    const body = shadow.querySelector('.fme-modal-body');

    // Sections
    const makeSection = (title, items, headers, note = null, rowClass = '') => {
      const sec = document.createElement('div');
      sec.className = 'fme-section';
      const h4 = document.createElement('h4');
      h4.textContent = `${title} (${items.length})`;
      sec.appendChild(h4);
      if (note) { const n = document.createElement('div'); n.className='fme-note'; n.textContent = note; sec.appendChild(n); }
      if (items.length) {
        sec.appendChild(buildTable(items, headers, rowClass));
      } else {
        const p = document.createElement('div');
        p.className = 'fme-small fme-muted';
        p.textContent = 'None';
        sec.appendChild(p);
      }
      body.appendChild(sec);
      body.appendChild(document.createElement('br'));
    };

    // Absent from final list
    makeSection('Absent in Final list', absentFinal.map(x => ({ ID: x.id, Name: x.name, Reason: 'Absent from final exam' })), ['ID', 'Name', 'Reason'], null, 'fme-warn-row');
    // Not in sheet
    makeSection('Not in sheet', notInSheet.map(x => ({ ID: x.id, Name: x.name, Reason: x.reason })), ['ID', 'Name', 'Reason'], null, 'fme-semidanger-row');
    // Not in connect
    makeSection('Not in connect', notInConnect.map(x => ({ ID: x.id, Name: x.name, Reason: x.reason })), ['ID', 'Name', 'Reason'], 'Not in connect — please highlight their names on the hard copy', 'fme-danger-row');

    shadow.querySelector('.fme-ok').addEventListener('click', () => host.remove());
  };

  // Mount
  const mountNow = () => {
    try { mountPanel(); } catch (e) { console.error(e); }
  };

  // Immediate mount + SPA URL watcher
  mountNow();
  let lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      mountNow();
    }
  }).observe(document, { subtree: true, childList: true });

  log('Fill Marks from CSV v1.2: panel mounted.');
})();
