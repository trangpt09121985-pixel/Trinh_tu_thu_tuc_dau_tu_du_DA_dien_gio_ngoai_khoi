/* =================================================================
   BẢN ĐỒ TRÌNH TỰ VÀ THỦ TỤC PHÁP LÝ ĐẦU TƯ DỰ ÁN ĐGNK – PVEP
   Giao diện đọc dữ liệu từ window.APP_DATA (data/data.js).
   Thay đổi trên trình duyệt được lưu dạng lớp phủ (localStorage) và ghi nhật ký.
   ================================================================= */
(function () {
'use strict';
const RAW = window.APP_DATA;
if (!RAW) { document.body.innerHTML = '<p style="padding:40px">Không tải được data/data.js. Chạy: python tools/build_data.py</p>'; return; }

const KEY = 'pvep-dgnk-v1';
const TABLES = { thu_tuc: 'ma', cong_quyet_dinh: 'ma', van_ban: 'ma_vb', ma_tran_phap_ly: 'ma', rui_ro: 'ma', ke_hoach: 'ma' };
const TODAY = new Date(); TODAY.setHours(0, 0, 0, 0);

/* ---------------- lưu trữ cục bộ ---------------- */
let ST = { edits: {}, imports: {}, log: [], role: 'viewer', who: '', scale: 1, collapsed: [] };
try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s) ST = Object.assign(ST, s); } catch (e) {}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(ST)); } catch (e) {} };

function table(t) {
  const base = ST.imports[t] || RAW[t] || [];
  const ed = ST.edits[t] || {}, k = TABLES[t];
  return base.map(r => ed[r[k]] ? Object.assign({}, r, ed[r[k]]) : r);
}
let DB = {};
const reload = () => { Object.keys(TABLES).forEach(t => DB[t] = table(t)); };
reload();

const canEdit = () => ST.role === 'editor' || ST.role === 'admin';
const isAdmin = () => ST.role === 'admin';
function logIt(bang, ma, truong, cu, moi) {
  ST.log.unshift({ thoi_gian: new Date().toLocaleString('vi-VN'), nguoi: ST.who || '(chưa nhập tên)', vai_tro: roleName(ST.role), bang, ma, truong, gia_tri_cu: cu, gia_tri_moi: moi });
}
function setField(t, id, f, v) {
  const cur = (DB[t].find(r => r[TABLES[t]] === id) || {})[f] || '';
  if (cur === v) return;
  ST.edits[t] = ST.edits[t] || {}; ST.edits[t][id] = ST.edits[t][id] || {};
  ST.edits[t][id][f] = v; logIt(t, id, f, cur, v); save(); reload(); renderAll();
}
const roleName = r => ({ viewer: 'Người xem', editor: 'Người cập nhật', admin: 'Quản trị viên' })[r];

/* ---------------- tiện ích ---------------- */
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const uniq = a => [...new Set(a.filter(Boolean))].sort((x, y) => x.localeCompare(y, 'vi'));
const fmtD = d => d ? d.split('-').reverse().join('/') : '';
const daysTo = d => d ? Math.round((new Date(d + 'T00:00:00') - TODAY) / 864e5) : null;
const split = s => String(s || '').split(';').map(x => x.replace(/\(.*?\)/g, '').replace(/^hoặc\s+/i, '').trim()).filter(Boolean);
const cv = (s) => /CẦN XÁC MINH/.test(s) ? String(s).replace(/CẦN XÁC MINH/g, '<span class="chip c-warn">CẦN XÁC MINH</span>') : s;
const BR = {}; RAW.cong_quyet_dinh.forEach(g => BR[g.nhanh] = g.ten_nhanh);

function legalClass(s) { return s === 'Đã rõ' || s === 'Nghiệp vụ nội bộ' ? 'c-ok' : 'c-warn'; }
function colorOf(p) {
  if (p.thoi_diem === 'Chưa đến thời điểm' && p.trang_thai_thuc_hien !== 'Đang thực hiện') return 'idle';
  if (p.muc_rui_ro === 'Cao') return 'risk';
  if (p.tinh_trang_can_cu === 'Đã rõ' || p.tinh_trang_can_cu === 'Nghiệp vụ nội bộ') return 'ok';
  return 'warn';
}
const COL = { ok: '#0B6E3B', warn: '#F2B705', risk: '#C0392B', idle: '#8A96A3' };
const COLNAME = { ok: 'Đã có căn cứ rõ', warn: 'Cần xác minh/hướng dẫn', risk: 'Rủi ro cao, có thể làm dừng tiến độ', idle: 'Chưa đến thời điểm thực hiện' };
function legend() { return Object.keys(COL).map(k => `<span><i class="dot" style="background:${COL[k]}"></i>${COLNAME[k]}</span>`).join('') + '<span><svg width="14" height="14" viewBox="0 0 14 14"><path d="M7 1l6 6-6 6-6-6z" fill="#005088"/></svg>Cổng quyết định</span>'; }

function download(name, rows, cols, heads) {
  const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  const csv = '\ufeff' + [(heads || cols).map(q).join(',')].concat(rows.map(r => cols.map(c => q(r[c])).join(','))).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
function parseCSV(text) {
  text = text.replace(/^\ufeff/, ''); const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; }
    else f += c;
  }
  if (f !== '' || row.length) { row.push(f); rows.push(row); }
  const head = rows.shift().map(h => h.trim());
  return { head, rows: rows.filter(r => r.some(x => x.trim())).map(r => Object.fromEntries(head.map((h, i) => [h, (r[i] || '').trim()]))) };
}

/* ---------------- biểu tượng ---------------- */
const ICON = {
  quy_hoach: '<path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/>',
  ban_do: '<circle cx="12" cy="10" r="3"/><path d="M12 21s-7-6.2-7-11a7 7 0 0114 0c0 4.8-7 11-7 11z"/>',
  khao_sat: '<path d="M2 16c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2"/><path d="M12 12V3M8 6l4-3 4 3"/>',
  phap_ly: '<path d="M12 3v18M6 21h12M5 7h14M5 7l-3 6h6zM19 7l-3 6h6z"/>',
  von: '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/>',
  nha_dau_tu: '<rect x="4" y="7" width="16" height="13" rx="1.5"/><path d="M9 7V4h6v3M4 12h16"/>',
  an_toan: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  moi_truong: '<path d="M5 19c0-8 5-13 15-14-1 10-6 15-14 15"/><path d="M5 19l7-7"/>',
  dau_noi: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  xay_dung: '<path d="M3 21h18M6 21V10h12v11M4 10l8-6 8 6M10 21v-5h4v5"/>',
  van_hanh: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
  du_lieu: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  rui_ro: '<path d="M12 3l9.5 17h-19z"/><path d="M12 10v4M12 17v.5"/>'
};
const icon = (k, x, y, s, col) => `<g transform="translate(${x},${y}) scale(${s / 24})" fill="none" stroke="${col}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${ICON[k] || ICON.phap_ly}</g>`;

/* ---------------- bộ lọc dùng chung ---------------- */
const F = { nhanh: '', nhom: '', cq: '', tt: '', ut: '', dv: '' };
const FDEF = [
  { k: 'nhanh', l: 'Giai đoạn', get: p => [p.nhanh], fmt: v => `Nhánh ${v} – ${BR[v] || ''}` },
  { k: 'nhom', l: 'Nhóm thủ tục', get: p => [p.nhom_thu_tuc] },
  { k: 'cq', l: 'Cơ quan chủ trì', get: p => split(p.co_quan_chu_tri) },
  { k: 'tt', l: 'Trạng thái pháp lý', get: p => [p.tinh_trang_can_cu] },
  { k: 'ut', l: 'Mức độ ưu tiên', get: p => [p.uu_tien] },
  { k: 'dv', l: 'Đơn vị PVEP phụ trách', get: p => split(p.don_vi_dau_moi_pvep) }
];
const match = p => FDEF.every(d => !F[d.k] || d.get(p).includes(F[d.k]));
function renderFilters(id) {
  const box = document.getElementById(id);
  box.innerHTML = FDEF.map(d => {
    const opts = uniq(DB.thu_tuc.flatMap(d.get));
    return `<label>${d.l}<select data-k="${d.k}"><option value="">Tất cả</option>${opts.map(o => `<option value="${esc(o)}"${F[d.k] === o ? ' selected' : ''}>${esc(d.fmt ? d.fmt(o) : o)}</option>`).join('')}</select></label>`;
  }).join('');
  box.querySelectorAll('select').forEach(s => s.addEventListener('change', () => { F[s.dataset.k] = s.value; renderAll(); }));
}

/* ---------------- danh sách cần xin ý kiến ---------------- */
function askItems() {
  const a = [];
  DB.thu_tuc.filter(p => p.can_xin_y_kien === 'Có').forEach(p => a.push({ nguon: 'Thủ tục', ma: p.ma, noi_dung: p.ten + ' – ' + p.rui_ro_luu_y, cap: p.cap_xin_y_kien, can_cu: p.can_cu_phap_ly, dau_moi: p.don_vi_dau_moi_pvep, han: '' }));
  DB.rui_ro.filter(r => r.cap_xin_y_kien).forEach(r => a.push({ nguon: 'Rủi ro', ma: r.ma, noi_dung: r.mo_ta + ' – Đề xuất: ' + r.hanh_dong_xu_ly, cap: r.cap_xin_y_kien, can_cu: r.can_cu_ly_do, dau_moi: r.don_vi_chiu_trach_nhiem, han: r.han_hoan_thanh }));
  DB.ke_hoach.filter(k => k.quyet_dinh_can_xin).forEach(k => a.push({ nguon: 'Kế hoạch', ma: k.ma, noi_dung: k.quyet_dinh_can_xin + ' (' + k.nhiem_vu + ')', cap: k.cap_xin_y_kien, can_cu: k.can_cu, dau_moi: k.dau_moi, han: k.han }));
  return a;
}
const LEAD = ['PVEP', 'Petrovietnam'];
function exportAsk(levels) {
  const rows = askItems().filter(x => !levels || levels.includes(x.cap));
  download('PVEP_DGNK_noi_dung_can_xin_y_kien_' + new Date().toISOString().slice(0, 10) + '.csv', rows,
    ['cap', 'nguon', 'ma', 'noi_dung', 'can_cu', 'dau_moi', 'han'],
    ['Cấp xin ý kiến', 'Nguồn', 'Mã', 'Nội dung cần xin ý kiến', 'Căn cứ/lý do', 'Đơn vị đầu mối', 'Hạn đề xuất']);
}

/* ---------------- 1. TỔNG QUAN ---------------- */
function renderOverview() {
  renderFilters('fOverview');
  const P = DB.thu_tuc.filter(match);
  const clear = P.filter(p => p.tinh_trang_can_cu === 'Đã rõ').length;
  const internal = P.filter(p => p.tinh_trang_can_cu === 'Nghiệp vụ nội bộ').length;
  const verify = P.filter(p => !['Đã rõ', 'Nghiệp vụ nội bộ'].includes(p.tinh_trang_can_cu)).length;
  const doing = P.filter(p => p.trang_thai_thuc_hien === 'Đang thực hiện').length;
  const khDoing = DB.ke_hoach.filter(k => k.tinh_trang === 'Đang thực hiện').length;
  const ask = askItems().filter(x => LEAD.includes(x.cap));
  $('#kpis').innerHTML = [
    ['', P.length, 'Tổng số thủ tục/đầu việc', `Trên tổng ${DB.thu_tuc.length} đầu việc trong dữ liệu`],
    ['ok', clear, 'Đã có căn cứ rõ', `Thêm ${internal} đầu việc nghiệp vụ nội bộ`],
    ['warn', verify, 'Cần xác minh/hướng dẫn', 'Gồm cần ý kiến cơ quan có thẩm quyền'],
    ['act', doing, 'Đang thực hiện', `Kế hoạch hành động: ${khDoing} việc đang thực hiện`],
    ['ask', ask.length, 'Cần xin ý kiến Lãnh đạo PVEP/Petrovietnam', 'Từ thủ tục, rủi ro và kế hoạch (không theo bộ lọc)']
  ].map(([c, v, l, s]) => `<div class="kpi ${c}"><div class="v">${v}</div><div class="l">${l}</div><div class="s">${s}</div></div>`).join('');
  $('#legend1').innerHTML = legend();
  $('#mini').innerHTML = Object.keys(BR).map(n => {
    const items = DB.thu_tuc.filter(p => p.nhanh === n);
    const g = DB.cong_quyet_dinh.find(x => x.nhanh === n);
    return `<div class="br"><h4><b>Nhánh ${n}</b>${esc(BR[n])}</h4><div class="cells">${items.map(p => {
      const c = colorOf(p), on = match(p);
      return `<button class="cell bg-${c} ${c}" style="${on ? '' : 'opacity:.2'}" title="${esc(p.ma + ' · ' + p.ten)}" data-p="${esc(p.ma)}" aria-label="${esc(p.ma + ' ' + p.ten)}">${esc(p.ma.split('.')[1])}</button>`;
    }).join('')}</div>${g ? `<div class="gate">◆ <button class="linkish" data-g="${g.ma}">${esc(g.cau_hoi)}</button></div>` : ''}</div>`;
  }).join('');
  const rank = { 'Cao': 0, 'Trung bình': 1, 'Thấp': 2 };
  const prio = P.filter(p => p.thoi_diem === 'Hiện tại' && p.trang_thai_thuc_hien !== 'Hoàn thành')
    .sort((a, b) => rank[a.uu_tien] - rank[b.uu_tien] || rank[a.muc_rui_ro] - rank[b.muc_rui_ro] || a.ma.localeCompare(b.ma)).slice(0, 5);
  $('#prio').innerHTML = prio.length ? prio.map(p => `<li><span class="code">${esc(p.ma)}</span><div><button class="linkish t" data-p="${esc(p.ma)}">${esc(p.ten)}</button><div class="m">${esc(p.don_vi_dau_moi_pvep)} · ${esc(p.trang_thai_thuc_hien)}</div></div><span class="chip ${legalClass(p.tinh_trang_can_cu)}">${esc(p.tinh_trang_can_cu)}</span></li>`).join('')
    : '<li class="empty">Không có đầu việc phù hợp bộ lọc.</li>';
  const gates = DB.cong_quyet_dinh.filter(g => g.trang_thai !== 'Đã thông qua').sort((a, b) => a.nhanh - b.nhanh).slice(0, 3);
  $('#gates').innerHTML = gates.map(g => {
    const ins = g.thu_tuc_dau_vao.split(';').map(s => DB.thu_tuc.find(p => p.ma === s.trim())).filter(Boolean);
    const done = ins.filter(p => p.trang_thai_thuc_hien === 'Hoàn thành').length;
    const unclear = ins.filter(p => !['Đã rõ', 'Nghiệp vụ nội bộ'].includes(p.tinh_trang_can_cu)).length;
    return `<li><span class="code">◆ ${g.ma}</span><div><button class="linkish t" data-g="${g.ma}">${esc(g.cau_hoi)}</button><div class="m">Cấp quyết định: ${esc(g.cap_quyet_dinh)} · Đầu vào hoàn thành ${done}/${ins.length} · ${unclear} đầu vào cần xác minh</div></div><span class="chip c-idle">${esc(g.trang_thai)}</span></li>`;
  }).join('');
}

/* ---------------- 2. SƠ ĐỒ CÂY ---------------- */
function wrap(s, n, max) {
  const w = s.split(' '), out = []; let line = '';
  for (const x of w) { if ((line + ' ' + x).trim().length > n) { out.push(line.trim()); line = x; } else line += ' ' + x; }
  if (line.trim()) out.push(line.trim());
  if (out.length > max) { out.length = max; out[max - 1] = out[max - 1].replace(/\s*\S*$/, '') + '…'; }
  return out;
}
function renderTree() {
  renderFilters('fTree'); $('#legend2').innerHTML = legend();
  const RH = 78, NW = 400, NX = 600, BX = 300, BW = 250, RX = 16, RW = 230, PAD = 18;
  let y = PAD; const branches = [];
  Object.keys(BR).forEach(n => {
    const items = DB.thu_tuc.filter(p => p.nhanh === n);
    const gate = DB.cong_quyet_dinh.find(g => g.nhanh === n);
    const col = ST.collapsed.includes(n);
    const rows = col ? [] : items.map(p => ({ p })).concat(gate ? [{ g: gate }] : []);
    const top = y, h = Math.max(1, rows.length) * RH;
    rows.forEach((r, i) => r.y = y + i * RH);
    branches.push({ n, items, gate, col, rows, cy: top + h / 2 - 4 });
    y += h + 22;
  });
  const H = y + PAD, rootY = Math.max(72, branches[0].cy);
  let s = `<svg viewBox="0 0 ${NX + NW + 24} ${H}" role="img" aria-label="Sơ đồ cây trình tự pháp lý đầu tư điện gió ngoài khơi" font-family="Be Vietnam Pro, Segoe UI, Arial" >`;
  s += `<defs><filter id="sh" x="-5%" y="-5%" width="110%" height="120%"><feDropShadow dx="0" dy="1" stdDeviation="1.2" flood-color="#0A1A2D" flood-opacity=".12"/></filter></defs>`;
  // nhánh nối gốc -> giai đoạn
  branches.forEach(b => { s += `<path d="M${RX + RW} ${rootY} C ${RX + RW + 40} ${rootY}, ${BX - 40} ${b.cy}, ${BX} ${b.cy}" fill="none" stroke="#005088" stroke-width="2.2"/>`; });
  // gốc
  s += `<g><rect x="${RX}" y="${rootY - 56}" width="${RW}" height="112" rx="14" fill="#005088"/>
    <text x="${RX + RW / 2}" y="${rootY - 16}" text-anchor="middle" fill="#fff" font-size="15" font-weight="700">Ý tưởng/cơ hội</text>
    <text x="${RX + RW / 2}" y="${rootY + 6}" text-anchor="middle" fill="#fff" font-size="15" font-weight="700">đầu tư điện gió</text>
    <text x="${RX + RW / 2}" y="${rootY + 28}" text-anchor="middle" fill="#fff" font-size="15" font-weight="700">ngoài khơi</text></g>`;
  branches.forEach(b => {
    // nhánh -> nút
    b.rows.forEach(r => { const cy = r.y + RH / 2 - 4; s += `<path d="M${BX + BW} ${b.cy} C ${BX + BW + 30} ${b.cy}, ${NX - 30} ${cy}, ${NX} ${cy}" fill="none" stroke="#9FB7CC" stroke-width="1.6"/>`; });
    const cnt = { ok: 0, warn: 0, risk: 0, idle: 0 }; b.items.forEach(p => cnt[colorOf(p)]++);
    const lines = wrap(BR[b.n], 26, 2);
    s += `<g class="branch" data-b="${b.n}" tabindex="0" role="button" aria-expanded="${!b.col}" aria-label="Nhánh ${b.n} ${esc(BR[b.n])}, bấm để ${b.col ? 'mở rộng' : 'thu gọn'}">
      <rect x="${BX}" y="${b.cy - 34}" width="${BW}" height="68" rx="10" fill="#E6F0F7" stroke="#005088" stroke-width="1.5"/>
      <rect x="${BX}" y="${b.cy - 34}" width="34" height="68" rx="10" fill="#005088"/><rect x="${BX + 24}" y="${b.cy - 34}" width="10" height="68" fill="#005088"/>
      <text x="${BX + 17}" y="${b.cy + 6}" text-anchor="middle" fill="#fff" font-size="17" font-weight="700">${b.n}</text>
      ${lines.map((l, i) => `<text x="${BX + 44}" y="${b.cy - 10 + i * 18 - (lines.length - 1) * 4}" fill="#003C66" font-size="13.5" font-weight="700">${esc(l)}</text>`).join('')}
      <text x="${BX + 44}" y="${b.cy + 26}" fill="#41506A" font-size="11">${b.items.length} đầu việc · ${b.col ? '▸ mở rộng' : '▾ thu gọn'}</text>
      ${['ok', 'warn', 'risk', 'idle'].map((k, i) => `<circle cx="${BX + BW - 64 + i * 14}" cy="${b.cy + 22}" r="5" fill="${COL[k]}" opacity="${cnt[k] ? 1 : .15}"><title>${COLNAME[k]}: ${cnt[k]}</title></circle>`).join('')}
    </g>`;
    b.rows.forEach(r => {
      const yy = r.y + 4, h = RH - 16;
      if (r.g) {
        const g = r.g, ql = wrap(g.cau_hoi, 50, 2);
        s += `<g class="node gate" data-g="${g.ma}" tabindex="0" role="button" aria-label="Cổng quyết định ${g.ma}: ${esc(g.cau_hoi)}">
          <rect class="box" x="${NX}" y="${yy}" width="${NW}" height="${h}" rx="10" fill="#fff" stroke="#005088" stroke-width="1.5" stroke-dasharray="5 4"/>
          <path d="M${NX + 28} ${yy + h / 2 - 14} l14 14 -14 14 -14 -14z" fill="#005088"/>
          ${ql.map((l, i) => `<text x="${NX + 54}" y="${yy + 22 + i * 17}" fill="#003C66" font-size="13" font-weight="600">${esc(l)}</text>`).join('')}
          <text x="${NX + 54}" y="${yy + h - 8}" fill="#6B7A90" font-size="11">Cổng ${g.ma} · ${esc(g.cap_quyet_dinh)}</text>
          <text x="${NX + NW - 12}" y="${yy + h - 8}" text-anchor="end" fill="#005088" font-size="11.5" font-weight="700" text-decoration="underline">Xem chi tiết</text></g>`;
        return;
      }
      const p = r.p, c = colorOf(p), col = COL[c], on = match(p), tl = wrap(p.ten, 44, 2);
      s += `<g class="node${on ? '' : ' dim'}" data-p="${esc(p.ma)}" tabindex="0" role="button" aria-label="${esc(p.ma + ': ' + p.ten + '. ' + COLNAME[c])}" filter="url(#sh)">
        <rect class="box" x="${NX}" y="${yy}" width="${NW}" height="${h}" rx="10" fill="#fff" stroke="${col}" stroke-width="1.6"/>
        <rect x="${NX}" y="${yy}" width="8" height="${h}" rx="4" fill="${col}"/>
        <circle cx="${NX + 34}" cy="${yy + h / 2}" r="17" fill="${c === 'warn' ? '#FFF6D6' : c === 'ok' ? '#E3F3EA' : c === 'risk' ? '#FBE9E7' : '#EEF1F4'}"/>
        ${icon(p.bieu_tuong, NX + 24, yy + h / 2 - 10, 20, c === 'warn' ? '#8A6200' : col)}
        <text x="${NX + 60}" y="${yy + 18}" fill="#005088" font-size="11" font-weight="700">${esc(p.ma)}</text>
        ${tl.map((l, i) => `<text x="${NX + 60}" y="${yy + 34 + i * 16}" fill="#14213D" font-size="13" font-weight="600">${esc(l)}</text>`).join('')}
        <text x="${NX + 112}" y="${yy + 18}" fill="${c === 'warn' ? '#7A5500' : col}" font-size="11" font-weight="600">● ${esc(p.tinh_trang_can_cu)}${p.thoi_diem === 'Chưa đến thời điểm' ? ' · chưa đến thời điểm' : ''}</text>
        <text x="${NX + NW - 12}" y="${yy + 18}" text-anchor="end" fill="#005088" font-size="11.5" font-weight="700" text-decoration="underline">Xem chi tiết</text></g>`;
    });
  });
  s += '</svg>';
  const t = $('#tree'); t.innerHTML = s;
  t.querySelectorAll('.branch').forEach(b => { const tg = () => toggleBranch(b.dataset.b); b.addEventListener('click', tg); b.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tg(); } }); });
  t.querySelectorAll('.node').forEach(nd => nd.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); nd.dataset.p ? openProc(nd.dataset.p) : openGate(nd.dataset.g); } }));
}
function toggleBranch(n) { ST.collapsed = ST.collapsed.includes(n) ? ST.collapsed.filter(x => x !== n) : ST.collapsed.concat(n); save(); renderTree(); }

/* ---------------- 3. DANH MỤC ---------------- */
const CAT_COLS = [
  ['ma', 'Mã'], ['ten', 'Tên thủ tục/đầu việc'], ['nhanh', 'Giai đoạn'], ['muc_tieu', 'Mục tiêu'], ['dieu_kien_dau_vao', 'Điều kiện đầu vào'],
  ['ho_so_du_lieu', 'Hồ sơ/dữ liệu cần chuẩn bị'], ['co_quan', 'Cơ quan chủ trì/phối hợp'], ['ket_qua_dau_ra', 'Kết quả đầu ra'],
  ['can_cu_phap_ly', 'Căn cứ pháp lý'], ['tinh_trang_can_cu', 'Tình trạng căn cứ'], ['don_vi_dau_moi_pvep', 'Đầu mối PVEP'],
  ['don_vi_phoi_hop_pvep', 'Phối hợp PVEP'], ['rui_ro_luu_y', 'Rủi ro/lưu ý'], ['buoc_ke_tiep', 'Bước kế tiếp'], ['cap_nhat', 'Ngày cập nhật, nguồn']
];
function catRows() {
  const q = $('#qCat').value.trim().toLowerCase();
  return DB.thu_tuc.filter(match).filter(p => !q || Object.values(p).join(' ').toLowerCase().includes(q))
    .map(p => Object.assign({}, p, { co_quan: p.co_quan_chu_tri + (p.co_quan_phoi_hop ? ' / Phối hợp: ' + p.co_quan_phoi_hop : ''), cap_nhat: fmtD(p.ngay_cap_nhat) + ' – ' + p.nguon_kiem_chung }));
}
function renderCatalog() {
  renderFilters('fCat');
  const rows = catRows();
  $('#cntCat').textContent = `${rows.length}/${DB.thu_tuc.length} đầu việc`;
  $('#tCat').innerHTML = `<thead><tr>${CAT_COLS.map(([, h], i) => `<th${i === 0 ? ' class="sticky"' : ''}>${h}</th>`).join('')}</tr></thead><tbody>` +
    (rows.length ? rows.map(p => `<tr class="clk" data-p="${esc(p.ma)}" tabindex="0">${CAT_COLS.map(([k], i) => {
      let v = esc(p[k]);
      if (k === 'nhanh') v = `${p.nhanh}. ${esc(BR[p.nhanh])}`;
      if (k === 'tinh_trang_can_cu') v = `<span class="chip ${legalClass(p[k])}">${v}</span>`;
      if (k === 'ma') v = `<b style="color:#005088">${v}</b><br><i class="dot" style="background:${COL[colorOf(p)]}"></i>`;
      if (k === 'can_cu_phap_ly' || k === 'co_quan') v = cv(v);
      return `<td${i === 0 ? ' class="sticky"' : ''}>${v}</td>`;
    }).join('')}</tr>`).join('') : `<tr><td colspan="${CAT_COLS.length}" class="empty">Không có thủ tục khớp từ khóa/bộ lọc. Xóa bớt điều kiện lọc để xem thêm.</td></tr>`) + '</tbody>';
  $('#tCat').querySelectorAll('tr.clk').forEach(tr => tr.addEventListener('keydown', e => { if (e.key === 'Enter') openProc(tr.dataset.p); }));
}

/* ---------------- 4. MA TRẬN ---------------- */
let mTab = 'matrix';
function vbWarn(v) {
  const w = [];
  if (/Hết hiệu lực/i.test(v.tinh_trang_hieu_luc)) w.push(['red', 'Hết hiệu lực']);
  if (/sửa đổi/i.test(v.tinh_trang_hieu_luc)) w.push(['', 'Đã được sửa đổi' + (v.sua_doi_thay_the ? ': ' + v.sua_doi_thay_the : '')]);
  if (/Chưa có hiệu lực/i.test(v.tinh_trang_hieu_luc)) w.push(['', 'Chưa có hiệu lực (' + fmtD(v.ngay_hieu_luc) + ')']);
  if (!['Đã đối chiếu', 'Tham khảo'].includes(v.trang_thai_xac_minh)) w.push(['', v.trang_thai_xac_minh || 'Chưa kiểm chứng']);
  if (v.loai !== 'Tài liệu tham khảo kỹ thuật') {
    const d = daysTo(v.ngay_kiem_chung); if (d === null || d < -90) w.push(['', 'Cần kiểm chứng lại (quá 90 ngày hoặc chưa có ngày)']);
    if (!v.lien_ket_chinh_thuc) w.push(['', 'Thiếu liên kết nguồn chính thức']);
  }
  return w;
}
const vbById = id => DB.van_ban.find(v => v.ma_vb === id);
const srcLink = v => v.lien_ket_chinh_thuc ? `<a href="${esc(v.lien_ket_chinh_thuc)}" target="_blank" rel="noopener">Nguồn chính thức</a>` : '<span class="chip c-warn">Chưa có liên kết – cần bổ sung</span>';
function renderMatrix() {
  const topics = uniq(DB.van_ban.map(v => v.nhom_chu_de));
  const ft = $('#fTopic'), cur = ft.value;
  ft.innerHTML = '<option value="">Tất cả nhóm chủ đề</option>' + topics.map(t => `<option${t === cur ? ' selected' : ''}>${esc(t)}</option>`).join('');
  const allW = DB.van_ban.map(v => [v, vbWarn(v)]);
  const nAmend = allW.filter(([v]) => /sửa đổi|Chưa có hiệu lực|Hết hiệu lực/i.test(v.tinh_trang_hieu_luc)).length;
  const nUnver = DB.van_ban.filter(v => !['Đã đối chiếu', 'Tham khảo'].includes(v.trang_thai_xac_minh)).length;
  const nLink = DB.van_ban.filter(v => !v.lien_ket_chinh_thuc && v.loai !== 'Tài liệu tham khảo kỹ thuật').length;
  $('#vbAlerts').innerHTML = `<div class="alert"><b>${nAmend}</b>&nbsp;văn bản đã được sửa đổi, chưa có hiệu lực hoặc hết hiệu lực – kiểm tra văn bản sửa đổi trước khi trích dẫn.</div>
    <div class="alert"><b>${nUnver}</b>&nbsp;văn bản chưa được kiểm chứng với bản gốc hoặc Công báo.</div>
    <div class="alert red"><b>${nLink}</b>&nbsp;văn bản chưa có liên kết nguồn chính thức. Bổ sung đường dẫn từ Cơ sở dữ liệu quốc gia về pháp luật, Công báo hoặc Cổng Thông tin điện tử Chính phủ.</div>`;
  const q = $('#qMat').value.trim().toLowerCase(), topic = ft.value;
  document.querySelectorAll('#mTabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.t === mTab));
  const M = DB.ma_tran_phap_ly.map(m => Object.assign({}, m, { vb: vbById(m.ma_vb) || {} }))
    .filter(m => (!topic || m.vb.nhom_chu_de === topic) && (!q || (Object.values(m).join(' ') + ' ' + Object.values(m.vb).join(' ')).toLowerCase().includes(q)));
  const B = $('#mBody');
  if (mTab === 'matrix') {
    $('#cntMat').textContent = `${M.length} dòng`;
    const groups = uniq(M.map(m => m.vb.nhom_chu_de));
    B.innerHTML = `<div class="tbl"><table class="wide"><thead><tr><th>Văn bản</th><th>Điều khoản</th><th>Nội dung quy định</th><th>Giai đoạn</th><th>Tác động đối với PVEP</th><th>Hành động cần triển khai</th><th>Loại</th><th>Trạng thái xác minh</th><th>Nguồn chính thức</th></tr></thead><tbody>` +
      (M.length ? groups.map(g => `<tr class="grp-row"><td colspan="9">${esc(g)}</td></tr>` + M.filter(m => m.vb.nhom_chu_de === g).map(m => `<tr class="clk" data-vb="${esc(m.ma_vb)}"><td><b>${esc(m.vb.so_ky_hieu)}</b><br>${esc(m.vb.ten_van_ban)}${vbWarn(m.vb).length ? `<br><span class="chip c-warn">${vbWarn(m.vb).length} cảnh báo</span>` : ''}</td><td>${esc(m.dieu_khoan)}</td><td>${esc(m.noi_dung_quy_dinh)}</td><td>${esc(m.giai_doan)}</td><td>${esc(m.tac_dong_pvep)}</td><td>${esc(m.hanh_dong)}</td><td><span class="chip ${m.loai === 'Khoảng trống' ? 'c-warn' : 'c-ok'}">${esc(m.loai)}</span></td><td>${esc(m.trang_thai_xac_minh)}</td><td>${srcLink(m.vb)}</td></tr>`).join('')).join('')
        : '<tr><td colspan="9" class="empty">Không có dòng phù hợp.</td></tr>') + '</tbody></table></div>';
  } else if (mTab === 'cmp') {
    const a = M.filter(m => m.loai === 'Quy định đã rõ'), b = M.filter(m => m.loai === 'Khoảng trống');
    $('#cntMat').textContent = `${a.length} quy định đã rõ · ${b.length} khoảng trống`;
    const item = m => `<div class="item clk" data-vb="${esc(m.ma_vb)}" style="cursor:pointer"><b>${esc(m.vb.so_ky_hieu)} · ${esc(m.dieu_khoan)}</b><p>${esc(m.noi_dung_quy_dinh)}</p><p><b>Hành động:</b> ${esc(m.hanh_dong)}</p></div>`;
    B.innerHTML = `<div class="cmp"><div class="col card"><h3>Quy định đã rõ <span class="chip c-ok">${a.length}</span></h3>${a.map(item).join('') || '<p class="empty">Không có</p>'}</div><div class="col gap card"><h3>Khoảng trống/cần hướng dẫn <span class="chip c-warn">${b.length}</span></h3>${b.map(item).join('') || '<p class="empty">Không có</p>'}</div></div>`;
  } else {
    const V = DB.van_ban.filter(v => (!topic || v.nhom_chu_de === topic) && (!q || Object.values(v).join(' ').toLowerCase().includes(q)));
    $('#cntMat').textContent = `${V.length} văn bản`;
    B.innerHTML = `<div class="tbl"><table class="wide"><thead><tr><th>Số, ký hiệu</th><th>Tên văn bản</th><th>Cơ quan ban hành</th><th>Ngày ban hành</th><th>Ngày hiệu lực</th><th>Tình trạng hiệu lực</th><th>Sửa đổi/thay thế</th><th>Xác minh</th><th>Ngày kiểm chứng</th><th>Nguồn</th><th>Cảnh báo</th></tr></thead><tbody>` +
      V.map(v => `<tr class="clk" data-vb="${esc(v.ma_vb)}"><td><b>${esc(v.so_ky_hieu)}</b></td><td>${esc(v.ten_van_ban)}<br><span class="chip c-navy">${esc(v.loai)}</span></td><td>${esc(v.co_quan_ban_hanh)}</td><td>${fmtD(v.ngay_ban_hanh) || '<span class="chip c-warn">CẦN XÁC MINH</span>'}</td><td>${fmtD(v.ngay_hieu_luc) || '<span class="chip c-warn">CẦN XÁC MINH</span>'}</td><td>${esc(v.tinh_trang_hieu_luc)}</td><td>${esc(v.sua_doi_thay_the)}</td><td>${esc(v.trang_thai_xac_minh)}</td><td>${fmtD(v.ngay_kiem_chung)}</td><td>${srcLink(v)}<br><small>${esc(v.nguon_kiem_chung)}</small></td><td>${vbWarn(v).map(([c, t]) => `<span class="chip ${c ? 'c-risk' : 'c-warn'}" style="white-space:normal;margin:2px 0">${esc(t)}</span>`).join('<br>')}</td></tr>`).join('') + '</tbody></table></div>';
  }
}

/* ---------------- 5. RỦI RO ---------------- */
const LV = { 'Cao': 3, 'Trung bình': 2, 'Thấp': 1 };
function renderRisk() {
  const gS = $('#fRGroup'), lS = $('#fRLevel'), g0 = gS.value, l0 = lS.value;
  gS.innerHTML = '<option value="">Tất cả nhóm</option>' + uniq(DB.rui_ro.map(r => r.nhom)).map(x => `<option${x === g0 ? ' selected' : ''}>${esc(x)}</option>`).join('');
  lS.innerHTML = '<option value="">Tất cả cấp xin ý kiến</option>' + uniq(DB.rui_ro.map(r => r.cap_xin_y_kien)).map(x => `<option${x === l0 ? ' selected' : ''}>${esc(x)}</option>`).join('');
  const q = $('#qRisk').value.trim().toLowerCase();
  const R = DB.rui_ro.filter(r => (!gS.value || r.nhom === gS.value) && (!lS.value || r.cap_xin_y_kien === lS.value) && (!q || Object.values(r).join(' ').toLowerCase().includes(q)));
  const imp = ['Cao', 'Trung bình', 'Thấp'], lik = ['Cao', 'Trung bình', 'Thấp', 'Cần xác minh'];
  $('#heat').innerHTML = '<div class="h">Tác động ↓ / Khả năng →</div>' + lik.map(l => `<div class="h">${l}</div>`).join('') +
    imp.map(i => `<div class="h">${i}</div>` + lik.map(l => {
      const lvl = l === 'Cần xác minh' ? 0 : Math.max(0, Math.min(3, Math.round((LV[i] * LV[l]) / 3)));
      return `<div class="c lvl-${lvl}">${R.filter(r => r.muc_tac_dong === i && r.kha_nang === l).map(r => `<button data-r="${r.ma}" title="${esc(r.mo_ta)}">${r.ma}</button>`).join('')}</div>`;
    }).join('')).join('');
  const caps = uniq(DB.rui_ro.map(r => r.cap_xin_y_kien));
  $('#askLvl').innerHTML = caps.map(c => `<li><span class="code">${esc(c)}</span><span class="t">${DB.rui_ro.filter(r => r.cap_xin_y_kien === c).map(r => r.ma).join(', ')}</span><span class="chip c-navy">${DB.rui_ro.filter(r => r.cap_xin_y_kien === c).length}</span></li>`).join('');
  $('#cntRisk').textContent = `${R.length}/${DB.rui_ro.length} rủi ro`;
  const cols = [['ma', 'Mã'], ['mo_ta', 'Mô tả vấn đề'], ['nhom', 'Nhóm'], ['giai_doan', 'Giai đoạn'], ['can_cu_ly_do', 'Căn cứ/lý do'], ['muc_tac_dong', 'Tác động'], ['kha_nang', 'Khả năng'], ['muc_uu_tien', 'Ưu tiên'], ['hanh_dong_xu_ly', 'Hành động xử lý'], ['don_vi_chiu_trach_nhiem', 'Đơn vị chịu trách nhiệm'], ['han_hoan_thanh', 'Hạn'], ['cap_xin_y_kien', 'Cấp xin ý kiến'], ['trang_thai', 'Trạng thái']];
  $('#tRisk').innerHTML = `<thead><tr>${cols.map(([, h], i) => `<th${i === 0 ? ' class="sticky"' : ''}>${h}</th>`).join('')}</tr></thead><tbody>` +
    (R.length ? R.map(r => `<tr class="clk" data-r="${r.ma}">${cols.map(([k], i) => {
      let v = esc(r[k]);
      if (k === 'han_hoan_thanh') v = fmtD(r[k]) + '<br><span class="chip c-idle">đề xuất</span>';
      if (k === 'muc_uu_tien') v = `<span class="chip ${r[k] === 'Cao' ? 'c-risk' : r[k] === 'Trung bình' ? 'c-warn' : 'c-ok'}">${v}</span>`;
      if (k === 'can_cu_ly_do') v = cv(v);
      return `<td${i === 0 ? ' class="sticky"' : ''}>${i === 0 ? '<b style="color:#005088">' + v + '</b>' : v}</td>`;
    }).join('')}</tr>`).join('') : `<tr><td colspan="${cols.length}" class="empty">Không có rủi ro phù hợp.</td></tr>`) + '</tbody>';
}

/* ---------------- 6. KẾ HOẠCH ---------------- */
let pTab = 'kanban';
const KST = ['Chưa bắt đầu', 'Đang thực hiện', 'Hoàn thành', 'Tạm dừng'];
const isOver = k => k.han && daysTo(k.han) < 0 && k.tinh_trang !== 'Hoàn thành';
function planRows() {
  return DB.ke_hoach.filter(k => (!$('#fKy').value || k.ky === $('#fKy').value) && (!$('#fOwner').value || split(k.dau_moi).includes($('#fOwner').value)));
}
function timeline(k) {
  const start = new Date(2026, 9, 1), months = 15, W = 300, cw = W / months;
  const pos = d => { const x = new Date(d + 'T00:00:00'); return ((x.getFullYear() - 2026) * 12 + x.getMonth() - 9 + (x.getDate() - 1) / 31) * cw; };
  const now = pos(TODAY.toISOString().slice(0, 10)), dl = k.han ? pos(k.han) : null;
  let s = `<svg viewBox="0 0 ${W} 26" width="${W}" height="26" aria-hidden="true">`;
  for (let i = 0; i < months; i++) s += `<rect x="${i * cw}" y="6" width="${cw - 1}" height="14" fill="${(i < 3) ? '#E6F0F7' : '#F1F4F7'}"/>`;
  if (dl !== null) s += `<rect x="${Math.min(now, dl)}" y="10" width="${Math.abs(dl - now)}" height="6" fill="${isOver(k) ? '#C0392B' : '#005088'}" opacity=".55"/><path d="M${dl} 4 l6 9 -6 9 -6 -9z" fill="${isOver(k) ? '#C0392B' : '#005088'}"/>`;
  s += `<line x1="${now}" x2="${now}" y1="0" y2="26" stroke="#2CB04A" stroke-width="2"/></svg>`;
  return s;
}
function renderPlan() {
  const ky = $('#fKy'), ow = $('#fOwner'), k0 = ky.value, o0 = ow.value;
  ky.innerHTML = '<option value="">Tất cả kỳ</option>' + uniq(DB.ke_hoach.map(k => k.ky)).map(x => `<option${x === k0 ? ' selected' : ''}>${esc(x)}</option>`).join('');
  ow.innerHTML = '<option value="">Tất cả đầu mối</option>' + uniq(DB.ke_hoach.flatMap(k => split(k.dau_moi))).map(x => `<option${x === o0 ? ' selected' : ''}>${esc(x)}</option>`).join('');
  document.querySelectorAll('#pTabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.t === pTab));
  const K = planRows(), B = $('#pBody');
  $('#cntPlan').textContent = `${K.length}/${DB.ke_hoach.length} việc · ${DB.ke_hoach.filter(isOver).length} quá hạn`;
  const sel = k => canEdit() ? `<select data-kh="${k.ma}" aria-label="Đổi tình trạng ${k.ma}">${KST.map(s => `<option${s === k.tinh_trang ? ' selected' : ''}>${s}</option>`).join('')}</select>` : '';
  if (pTab === 'kanban') {
    B.innerHTML = `<div class="kanban">${KST.map(st => { const L = K.filter(k => k.tinh_trang === st); return `<div class="kcol"><h3>${st}<span class="chip c-navy">${L.length}</span></h3>${L.map(k => `<div class="kcard${isOver(k) ? ' over' : ''}"><div class="c">${k.ma} · ${esc(k.ky)}</div><div class="t"><button class="linkish" data-kh-open="${k.ma}">${esc(k.nhiem_vu)}</button></div><div class="m">Đầu mối: ${esc(k.dau_moi)}<br>Hạn đề xuất: ${fmtD(k.han)}${isOver(k) ? ' · <b style="color:#C0392B">quá hạn</b>' : ''}</div>${sel(k)}</div>`).join('') || '<p class="empty" style="padding:10px">Không có việc</p>'}</div>`; }).join('')}</div>`;
  } else if (pTab === 'gantt' || pTab === 'over') {
    const L = (pTab === 'over' ? K.filter(isOver) : K).slice().sort((a, b) => (a.han || '').localeCompare(b.han || ''));
    if (pTab === 'over' && !L.length) { B.innerHTML = `<div class="card empty">Không có việc quá hạn tính đến ${TODAY.toLocaleDateString('vi-VN')}. Danh sách tự cập nhật khi thời hạn trôi qua mà việc chưa hoàn thành.</div>`; }
    else B.innerHTML = `<div class="tbl"><table class="wide"><thead><tr><th>Mã</th><th>Nhiệm vụ</th><th>Sản phẩm đầu ra</th><th>Đầu mối</th><th>Phối hợp</th><th>Kỳ</th><th>Hạn đề xuất</th><th>Còn lại</th><th>Tiến độ (10/2026 → 12/2027)</th><th>Tình trạng</th><th>Căn cứ</th><th>Quyết định cần xin</th></tr></thead><tbody>` +
      L.map(k => { const d = daysTo(k.han); return `<tr><td><b style="color:#005088">${k.ma}</b></td><td><button class="linkish" data-kh-open="${k.ma}">${esc(k.nhiem_vu)}</button></td><td>${esc(k.san_pham)}</td><td>${esc(k.dau_moi)}</td><td>${esc(k.phoi_hop)}</td><td>${esc(k.ky)}</td><td>${fmtD(k.han)}</td><td>${d === null ? '' : d < 0 ? `<span class="chip c-risk">quá ${-d} ngày</span>` : d + ' ngày'}</td><td style="min-width:320px">${timeline(k)}</td><td>${canEdit() ? sel(k) : `<span class="chip c-navy">${esc(k.tinh_trang)}</span>`}</td><td>${cv(esc(k.can_cu))}</td><td>${esc(k.quyet_dinh_can_xin)}</td></tr>`; }).join('') + '</tbody></table></div><p class="ro" style="margin-top:8px">Vạch xanh lá: hôm nay. Hình thoi: hạn đề xuất. Nền xanh nhạt: Quý IV/2026.</p>';
  } else {
    const lvl = B.dataset.lvl || 'lead';
    const A = askItems().filter(x => lvl === 'all' || (lvl === 'lead' ? LEAD.includes(x.cap) : x.cap === lvl));
    B.innerHTML = `<div class="fbar"><select id="askSel" aria-label="Cấp xin ý kiến"><option value="lead"${lvl === 'lead' ? ' selected' : ''}>Lãnh đạo PVEP và Petrovietnam</option><option value="Cơ quan nhà nước"${lvl === 'Cơ quan nhà nước' ? ' selected' : ''}>Cơ quan nhà nước</option><option value="all"${lvl === 'all' ? ' selected' : ''}>Tất cả cấp</option></select><button class="btn sm" id="askCsv">Xuất CSV danh sách này</button><button class="btn sm" id="askPrint">In danh sách</button><span class="count">${A.length} nội dung</span></div>
      <div class="tbl"><table class="wide"><thead><tr><th>Cấp</th><th>Nguồn</th><th>Mã</th><th>Nội dung cần xin ý kiến</th><th>Căn cứ/lý do</th><th>Đầu mối</th><th>Hạn đề xuất</th></tr></thead><tbody>${A.map(x => `<tr><td><span class="chip c-navy">${esc(x.cap)}</span></td><td>${esc(x.nguon)}</td><td><b>${esc(x.ma)}</b></td><td>${esc(x.noi_dung)}</td><td>${cv(esc(x.can_cu))}</td><td>${esc(x.dau_moi)}</td><td>${fmtD(x.han)}</td></tr>`).join('')}</tbody></table></div>`;
    $('#askSel').onchange = e => { B.dataset.lvl = e.target.value; renderPlan(); };
    $('#askCsv').onclick = () => exportAsk(lvl === 'all' ? null : lvl === 'lead' ? LEAD : [lvl]);
    $('#askPrint').onclick = () => { const v = $('#v-ke-hoach'); v.classList.add('print'); window.print(); v.classList.remove('print'); };
  }
  B.querySelectorAll('select[data-kh]').forEach(s => s.addEventListener('change', () => setField('ke_hoach', s.dataset.kh, 'tinh_trang', s.value)));
}

/* ---------------- 7. QUẢN TRỊ ---------------- */
function renderAdmin() {
  $('#impBtn').disabled = !isAdmin(); $('#resetLocal').disabled = !isAdmin(); $('#expLog').disabled = !isAdmin();
  $('#impMsg').textContent = isAdmin() ? '' : 'Chỉ Quản trị viên được nhập tệp và xóa thay đổi cục bộ.';
  const L = ST.log;
  $('#tLog').innerHTML = '<thead><tr><th>Thời gian</th><th>Người sửa</th><th>Vai trò</th><th>Bảng</th><th>Mã</th><th>Trường</th><th>Giá trị cũ</th><th>Giá trị mới</th></tr></thead><tbody>' +
    (L.length ? L.map(l => `<tr><td>${esc(l.thoi_gian)}</td><td>${esc(l.nguoi)}</td><td>${esc(l.vai_tro)}</td><td>${esc(l.bang)}</td><td>${esc(l.ma)}</td><td>${esc(l.truong)}</td><td>${esc(l.gia_tri_cu)}</td><td>${esc(l.gia_tri_moi)}</td></tr>`).join('') : '<tr><td colspan="8" class="empty">Chưa có thay đổi nào trên trình duyệt này.</td></tr>') + '</tbody>';
  const n = Object.values(ST.edits).reduce((a, t) => a + Object.keys(t).length, 0);
  $('#dataVer').innerHTML = `Dữ liệu: ${esc(RAW.meta.ngay_tao)}<br>${Object.keys(ST.imports).length ? 'Có bảng nhập từ CSV · ' : ''}${n} bản ghi sửa cục bộ`;
}

/* ---------------- KHUNG CHI TIẾT ---------------- */
function openDrawer(code, title, html) {
  $('#dCode').textContent = code; $('#dTitle').textContent = title; $('#dBody').innerHTML = html;
  $('#dBody').scrollTop = 0; $('#drawer').classList.add('on'); $('#scrim').classList.add('on'); $('#dClose').focus();
}
const closeDrawer = () => { $('#drawer').classList.remove('on'); $('#scrim').classList.remove('on'); };
const linkCodes = s => esc(s).replace(/(TT-\d\.\d|RR\d{2}|KH\d{2})/g, m => `<button class="linkish" data-${m[0] === 'T' ? 'p' : m[0] === 'R' ? 'r' : 'kh-open'}="${m}">${m}</button>`).replace(/Cổng (G\d)/g, (m, g) => `<button class="linkish" data-g="${g}">Cổng ${g}</button>`);
function vbCard(v) {
  return `<div class="vb clk" data-vb="${esc(v.ma_vb)}" style="cursor:pointer"><b>${esc(v.so_ky_hieu)}</b> – ${esc(v.ten_van_ban)}
    <div class="meta">${esc(v.co_quan_ban_hanh)} · Ban hành: ${fmtD(v.ngay_ban_hanh) || 'CẦN XÁC MINH'} · Hiệu lực: ${fmtD(v.ngay_hieu_luc) || 'CẦN XÁC MINH'} · ${esc(v.tinh_trang_hieu_luc)}</div>
    <div class="src">${srcLink(v)} · Xác minh: ${esc(v.trang_thai_xac_minh)}${v.ngay_kiem_chung ? ' ngày ' + fmtD(v.ngay_kiem_chung) : ''}</div></div>`;
}
function openProc(ma) {
  const p = DB.thu_tuc.find(x => x.ma === ma); if (!p) return;
  const c = colorOf(p);
  const vbs = p.ma_van_ban.split(';').map(s => vbById(s.trim())).filter(Boolean);
  const edit = canEdit() ? `<h4>Cập nhật (${roleName(ST.role)})</h4><div class="edit">
      <label>Trạng thái thực hiện<select id="eSt">${['Chưa bắt đầu', 'Đang thực hiện', 'Hoàn thành', 'Tạm dừng'].map(s => `<option${s === p.trang_thai_thuc_hien ? ' selected' : ''}>${s}</option>`).join('')}</select></label>
      <label>Tình trạng căn cứ<select id="eLg">${['Đã rõ', 'Cần xác minh', 'Cần hướng dẫn', 'Cần ý kiến cơ quan có thẩm quyền', 'Nghiệp vụ nội bộ'].map(s => `<option${s === p.tinh_trang_can_cu ? ' selected' : ''}>${s}</option>`).join('')}</select></label>
      <label>Ghi chú cập nhật<textarea id="eNote" rows="2" placeholder="Nội dung đã xác minh, văn bản, người cung cấp…">${esc(p.ghi_chu_cap_nhat || '')}</textarea></label>
      <div><button class="btn pri sm" id="eSave">Lưu và ghi nhật ký</button></div></div>` : `<p class="ro" style="margin-top:16px">Chế độ Người xem: chỉ tra cứu.</p>`;
  openDrawer(`${p.ma} · Nhánh ${p.nhanh} – ${BR[p.nhanh]}`, p.ten, `
    <div class="chips"><span class="chip ${legalClass(p.tinh_trang_can_cu)}">${esc(p.tinh_trang_can_cu)}</span><span class="chip" style="background:${COL[c]};color:${c === 'warn' ? '#3A2A00' : '#fff'}">${COLNAME[c]}</span><span class="chip c-navy">Ưu tiên: ${esc(p.uu_tien)}</span><span class="chip c-idle">${esc(p.thoi_diem)}</span><span class="chip c-navy">${esc(p.trang_thai_thuc_hien)}</span></div>
    <dl><dt>Việc cần làm/mục tiêu</dt><dd>${esc(p.muc_tieu)}</dd><dt>Điều kiện đầu vào</dt><dd>${esc(p.dieu_kien_dau_vao)}</dd><dt>Hồ sơ/dữ liệu đầu vào</dt><dd>${esc(p.ho_so_du_lieu)}</dd>
    <dt>Cơ quan có thẩm quyền</dt><dd>${cv(esc(p.co_quan_chu_tri))}</dd><dt>Cơ quan phối hợp</dt><dd>${esc(p.co_quan_phoi_hop) || '—'}</dd><dt>Kết quả đầu ra</dt><dd>${esc(p.ket_qua_dau_ra)}</dd>
    <dt>Bước kế tiếp</dt><dd>${linkCodes(p.buoc_ke_tiep)}</dd><dt>Trách nhiệm PVEP</dt><dd>Đầu mối: <b>${esc(p.don_vi_dau_moi_pvep)}</b><br>Phối hợp: ${esc(p.don_vi_phoi_hop_pvep)}</dd>
    <dt>Rủi ro/lưu ý</dt><dd>${esc(p.rui_ro_luu_y) || '—'}</dd><dt>Cần xin ý kiến</dt><dd>${p.can_xin_y_kien === 'Có' ? `<span class="chip c-risk">Có – ${esc(p.cap_xin_y_kien)}</span>` : 'Không'}</dd></dl>
    <h4>Căn cứ pháp lý</h4><p style="margin:0 0 10px">${cv(esc(p.can_cu_phap_ly))}</p>${vbs.map(vbCard).join('')}
    <h4>Cập nhật và kiểm chứng</h4><dl><dt>Ngày cập nhật</dt><dd>${fmtD(p.ngay_cap_nhat)}</dd><dt>Nguồn kiểm chứng</dt><dd>${esc(p.nguon_kiem_chung)}</dd></dl>${edit}`);
  if (canEdit()) $('#eSave').onclick = () => {
    const id = p.ma; ['trang_thai_thuc_hien', 'tinh_trang_can_cu', 'ghi_chu_cap_nhat'].forEach((f, i) => setField('thu_tuc', id, f, [$('#eSt').value, $('#eLg').value, $('#eNote').value.trim()][i]));
    setField('thu_tuc', id, 'ngay_cap_nhat', new Date().toISOString().slice(0, 10)); openProc(id);
  };
}
function openGate(ma) {
  const g = DB.cong_quyet_dinh.find(x => x.ma === ma); if (!g) return;
  const ins = g.thu_tuc_dau_vao.split(';').map(s => DB.thu_tuc.find(p => p.ma === s.trim())).filter(Boolean);
  openDrawer(`Cổng quyết định ${g.ma} · Nhánh ${g.nhanh}`, g.cau_hoi, `<div class="chips"><span class="chip c-idle">${esc(g.trang_thai)}</span></div>
    <dl><dt>Điều kiện thông qua</dt><dd>${esc(g.dieu_kien_thong_qua)}</dd><dt>Cấp quyết định</dt><dd>${esc(g.cap_quyet_dinh)}</dd><dt>Căn cứ</dt><dd>${cv(esc(g.can_cu))}</dd><dt>Ngày cập nhật</dt><dd>${fmtD(g.ngay_cap_nhat)}</dd></dl>
    <h4>Đầu việc đầu vào</h4><ul class="list">${ins.map(p => `<li><span class="code">${p.ma}</span><button class="linkish t" data-p="${p.ma}">${esc(p.ten)}</button><span class="chip ${legalClass(p.tinh_trang_can_cu)}">${esc(p.tinh_trang_can_cu)}</span></li>`).join('')}</ul>`);
}
function openVB(id) {
  const v = vbById(id); if (!v) return;
  const used = DB.thu_tuc.filter(p => p.ma_van_ban.split(';').map(s => s.trim()).includes(id));
  const rows = DB.ma_tran_phap_ly.filter(m => m.ma_vb === id);
  openDrawer(`${v.ma_vb} · ${v.loai}`, `${v.so_ky_hieu} – ${v.ten_van_ban}`, `${vbWarn(v).map(([c, t]) => `<div class="alert${c ? ' red' : ''}" style="margin-bottom:6px">${esc(t)}</div>`).join('')}
    <dl><dt>Cơ quan ban hành</dt><dd>${esc(v.co_quan_ban_hanh)}</dd><dt>Ngày ban hành</dt><dd>${fmtD(v.ngay_ban_hanh) || 'CẦN XÁC MINH'}</dd><dt>Ngày hiệu lực</dt><dd>${fmtD(v.ngay_hieu_luc) || 'CẦN XÁC MINH'}</dd>
    <dt>Tình trạng hiệu lực</dt><dd>${esc(v.tinh_trang_hieu_luc)}</dd><dt>Sửa đổi/thay thế</dt><dd>${esc(v.sua_doi_thay_the) || '—'}</dd><dt>Nguồn chính thức</dt><dd>${srcLink(v)}</dd>
    <dt>Nguồn kiểm chứng</dt><dd>${esc(v.nguon_kiem_chung)}</dd><dt>Xác minh</dt><dd>${esc(v.trang_thai_xac_minh)} ${v.ngay_kiem_chung ? '(' + fmtD(v.ngay_kiem_chung) + ')' : ''}</dd><dt>Ghi chú</dt><dd>${esc(v.ghi_chu) || '—'}</dd></dl>
    <h4>Điều khoản trong ma trận</h4>${rows.map(m => `<div class="vb"><b>${esc(m.dieu_khoan)}</b> <span class="chip ${m.loai === 'Khoảng trống' ? 'c-warn' : 'c-ok'}">${esc(m.loai)}</span><div class="meta">${esc(m.noi_dung_quy_dinh)}</div><div class="src">Hành động: ${esc(m.hanh_dong)}</div></div>`).join('') || '<p class="ro">Chưa có dòng ma trận.</p>'}
    <h4>Thủ tục sử dụng văn bản</h4><ul class="list">${used.map(p => `<li><span class="code">${p.ma}</span><button class="linkish t" data-p="${p.ma}">${esc(p.ten)}</button><span></span></li>`).join('') || '<li class="ro">Chưa có</li>'}</ul>`);
}
function openRisk(ma) {
  const r = DB.rui_ro.find(x => x.ma === ma); if (!r) return;
  openDrawer(`${r.ma} · ${r.nhom}`, r.mo_ta, `<div class="chips"><span class="chip ${r.muc_uu_tien === 'Cao' ? 'c-risk' : 'c-warn'}">Ưu tiên ${esc(r.muc_uu_tien)}</span><span class="chip c-idle">${esc(r.ghi_chu_danh_gia)}</span></div>
    <dl><dt>Giai đoạn</dt><dd>${esc(r.giai_doan)}</dd><dt>Căn cứ/lý do</dt><dd>${cv(esc(r.can_cu_ly_do))}</dd><dt>Tác động · khả năng</dt><dd>${esc(r.muc_tac_dong)} · ${esc(r.kha_nang)}</dd>
    <dt>Hành động xử lý</dt><dd>${esc(r.hanh_dong_xu_ly)}</dd><dt>Đơn vị chịu trách nhiệm</dt><dd>${esc(r.don_vi_chiu_trach_nhiem)}</dd><dt>Hạn đề xuất</dt><dd>${fmtD(r.han_hoan_thanh)}</dd>
    <dt>Cấp xin ý kiến</dt><dd>${esc(r.cap_xin_y_kien)}</dd><dt>Trạng thái</dt><dd>${esc(r.trang_thai)}</dd></dl>
    ${canEdit() ? `<h4>Cập nhật</h4><div class="edit"><label>Trạng thái xử lý<select id="rSt">${['Mới nhận diện', 'Đang xử lý', 'Đã xin ý kiến', 'Đã xử lý', 'Đóng'].map(s => `<option${s === r.trang_thai ? ' selected' : ''}>${s}</option>`).join('')}</select></label><div><button class="btn pri sm" id="rSave">Lưu và ghi nhật ký</button></div></div>` : ''}`);
  if (canEdit()) $('#rSave').onclick = () => { setField('rui_ro', ma, 'trang_thai', $('#rSt').value); openRisk(ma); };
}
function openKH(ma) {
  const k = DB.ke_hoach.find(x => x.ma === ma); if (!k) return;
  openDrawer(`${k.ma} · ${k.ky}`, k.nhiem_vu, `<div class="chips"><span class="chip c-navy">${esc(k.tinh_trang)}</span>${isOver(k) ? '<span class="chip c-risk">Quá hạn</span>' : ''}</div>
    <dl><dt>Sản phẩm đầu ra</dt><dd>${esc(k.san_pham)}</dd><dt>Đầu mối</dt><dd>${esc(k.dau_moi)}</dd><dt>Phối hợp</dt><dd>${esc(k.phoi_hop)}</dd><dt>Hạn đề xuất</dt><dd>${fmtD(k.han)}</dd>
    <dt>Căn cứ</dt><dd>${cv(esc(k.can_cu))}</dd><dt>Quyết định cần xin</dt><dd>${esc(k.quyet_dinh_can_xin) || '—'} ${k.cap_xin_y_kien ? '(' + esc(k.cap_xin_y_kien) + ')' : ''}</dd><dt>Liên quan</dt><dd>${linkCodes(k.lien_quan) || '—'}</dd></dl>`);
}

/* ---------------- điều hướng, sự kiện ---------------- */
const VIEWS = ['tong-quan', 'ban-do', 'danh-muc', 'ma-tran', 'rui-ro', 'ke-hoach', 'quan-tri'];
function route() {
  const v = VIEWS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'tong-quan';
  VIEWS.forEach(x => document.getElementById('v-' + x).classList.toggle('on', x === v));
  document.querySelectorAll('.side nav a').forEach(a => { if (a.dataset.v === v) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  window.scrollTo(0, 0);
}
function renderAll() { renderOverview(); renderTree(); renderCatalog(); renderMatrix(); renderRisk(); renderPlan(); renderAdmin(); }

document.addEventListener('click', e => {
  const t = e.target.closest('[data-p],[data-g],[data-vb],[data-r],[data-kh-open]'); if (!t) return;
  if (t.closest('.branch')) return;
  if (t.dataset.p) openProc(t.dataset.p); else if (t.dataset.g) openGate(t.dataset.g);
  else if (t.dataset.vb) openVB(t.dataset.vb); else if (t.dataset.r) openRisk(t.dataset.r); else if (t.dataset.khOpen) openKH(t.dataset.khOpen);
});
$('#dClose').onclick = closeDrawer; $('#scrim').onclick = closeDrawer;
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });
window.addEventListener('hashchange', route);
$('#qCat').addEventListener('input', renderCatalog);
$('#qMat').addEventListener('input', renderMatrix); $('#fTopic').addEventListener('change', renderMatrix);
$('#qRisk').addEventListener('input', renderRisk); $('#fRGroup').addEventListener('change', renderRisk); $('#fRLevel').addEventListener('change', renderRisk);
$('#fKy').addEventListener('change', renderPlan); $('#fOwner').addEventListener('change', renderPlan);
document.querySelectorAll('#mTabs button').forEach(b => b.onclick = () => { mTab = b.dataset.t; renderMatrix(); });
document.querySelectorAll('#pTabs button').forEach(b => b.onclick = () => { pTab = b.dataset.t; renderPlan(); });
$('#expandAll').onclick = () => { ST.collapsed = []; save(); renderTree(); };
$('#collapseAll').onclick = () => { ST.collapsed = Object.keys(BR); save(); renderTree(); };
$('#expCatalog').onclick = () => download('PVEP_DGNK_danh_muc_thu_tuc.csv', catRows(), CAT_COLS.map(c => c[0]), CAT_COLS.map(c => c[1]));
$('#expMatrix').onclick = () => download('PVEP_DGNK_ma_tran_phap_ly.csv', DB.ma_tran_phap_ly.map(m => Object.assign({}, m, (({ so_ky_hieu, ten_van_ban, tinh_trang_hieu_luc, lien_ket_chinh_thuc }) => ({ so_ky_hieu, ten_van_ban, tinh_trang_hieu_luc, lien_ket_chinh_thuc }))(vbById(m.ma_vb) || {}))),
  ['ma', 'so_ky_hieu', 'ten_van_ban', 'dieu_khoan', 'noi_dung_quy_dinh', 'giai_doan', 'tac_dong_pvep', 'hanh_dong', 'loai', 'trang_thai_xac_minh', 'tinh_trang_hieu_luc', 'lien_ket_chinh_thuc'],
  ['Mã', 'Số, ký hiệu', 'Tên văn bản', 'Điều khoản', 'Nội dung quy định', 'Giai đoạn', 'Tác động PVEP', 'Hành động', 'Loại', 'Trạng thái xác minh', 'Tình trạng hiệu lực', 'Liên kết chính thức']);
$('#expPlan').onclick = () => download('PVEP_DGNK_ke_hoach.csv', DB.ke_hoach, Object.keys(DB.ke_hoach[0]));
$('#expAsk1').onclick = () => exportAsk(LEAD); $('#expAsk2').onclick = () => exportAsk(LEAD);
$('#expTable').onclick = () => { const t = $('#impTable').value; download(t + '.csv', DB[t], Object.keys(DB[t][0])); };
$('#expLog').onclick = () => download('PVEP_DGNK_nhat_ky.csv', ST.log, ['thoi_gian', 'nguoi', 'vai_tro', 'bang', 'ma', 'truong', 'gia_tri_cu', 'gia_tri_moi'], ['Thời gian', 'Người sửa', 'Vai trò', 'Bảng', 'Mã', 'Trường', 'Giá trị cũ', 'Giá trị mới']);
$('#impBtn').onclick = () => {
  const f = $('#impFile').files[0], t = $('#impTable').value, msg = $('#impMsg');
  if (!isAdmin()) return; if (!f) { msg.textContent = 'Chọn tệp CSV trước khi nhập.'; return; }
  const rd = new FileReader();
  rd.onload = () => {
    try {
      const { head, rows } = parseCSV(rd.result), need = Object.keys(RAW[t][0]), key = TABLES[t];
      const miss = need.filter(h => !head.includes(h));
      if (miss.length) { msg.textContent = 'Không nhập: thiếu cột ' + miss.join(', '); return; }
      const ids = rows.map(r => r[key]); const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
      if (ids.some(x => !x) || dup.length) { msg.textContent = 'Không nhập: mã trống hoặc trùng ' + uniq(dup).join(', '); return; }
      ST.imports[t] = rows; delete ST.edits[t]; logIt(t, '(toàn bảng)', 'nhập CSV', (RAW[t] || []).length + ' dòng', rows.length + ' dòng từ ' + f.name);
      save(); reload(); renderAll(); msg.textContent = `Đã nhập ${rows.length} dòng vào bảng ${t}. Thay đổi chỉ lưu trên trình duyệt này; cập nhật tệp gốc theo hướng dẫn.`;
    } catch (err) { msg.textContent = 'Không đọc được tệp: ' + err.message; }
  };
  rd.readAsText(f, 'utf-8');
};
$('#resetLocal').onclick = () => { if (!isAdmin()) return; if (!confirm('Xóa mọi thay đổi và bảng nhập trên trình duyệt này? Nhật ký được giữ lại.')) return; logIt('(tất cả)', '', 'xóa thay đổi cục bộ', '', ''); ST.edits = {}; ST.imports = {}; save(); reload(); renderAll(); };

const roleSel = $('#role'), who = $('#who');
roleSel.value = ST.role; who.value = ST.who;
roleSel.onchange = () => { ST.role = roleSel.value; save(); renderAll(); };
who.onchange = () => { ST.who = who.value.trim(); save(); };
const setScale = v => { ST.scale = Math.min(1.5, Math.max(.85, Math.round(v * 20) / 20)); document.documentElement.style.setProperty('--scale', ST.scale); save(); };
setScale(ST.scale || 1);
$('#zPlus').onclick = () => setScale(ST.scale + .1); $('#zMinus').onclick = () => setScale(ST.scale - .1); $('#zReset').onclick = () => setScale(1);

renderAll(); route();
window.PVEP_APP = { DB: () => DB, askItems, F };   // phục vụ kiểm thử tự động
})();
