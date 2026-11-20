// ===================================================
// KKSantubong — takwim.js  (CRUD + localStorage)
// Dashboard Penyelaras Takwim Tahunan
// ===================================================

// ===================================================
// STORAGE KEYS
// ===================================================
const KEY_PROGRAM    = 'kk_takwim_program';
const KEY_JK         = 'kk_takwim_jk';
const KEY_UMUM       = 'kk_takwim_umum';
const KEY_PELAKSANAAN = 'kk_laporan_pelaksanaan';
const KEY_POSTMORTEM  = 'kk_laporan_postmortem';

// ===================================================
// UTILITI
// ===================================================
function baca(key)       { return JSON.parse(localStorage.getItem(key) || '[]'); }
function simpan(key, data) { localStorage.setItem(key, JSON.stringify(data)); }
function idBaharu()      { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

function formatTarikh(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function bulanDariIso(iso) {
  if (!iso) return '';
  return iso.slice(5, 7); // 'YYYY-MM-DD' → 'MM'
}

// ===================================================
// LIVE DATETIME
// ===================================================
function updateDatetime() {
  const el = document.getElementById('live-datetime');
  if (!el) return;
  const now    = new Date();
  const days   = ['Ahad','Isnin','Selasa','Rabu','Khamis','Jumaat','Sabtu'];
  const months = ['Jan','Feb','Mac','Apr','Mei','Jun','Jul','Ogos','Sep','Okt','Nov','Dis'];
  const hours  = String(now.getHours()).padStart(2,'0');
  const mins   = String(now.getMinutes()).padStart(2,'0');
  el.textContent = `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()} | ${hours}:${mins}`;
}
updateDatetime();
setInterval(updateDatetime, 60000);

// ===================================================
// NAVIGASI — Scroll & Active Highlight
// ===================================================
const navLinks = document.querySelectorAll('.nav-link');

navLinks.forEach(link => {
  link.addEventListener('click', function (e) {
    const href = this.getAttribute('href');
    if (href && href.startsWith('#')) {
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    navLinks.forEach(l => l.classList.remove('active'));
    this.classList.add('active');
  });
});

function onScroll() {
  const sections = document.querySelectorAll('section.section');
  let current = '';
  sections.forEach(s => {
    if (window.scrollY >= s.offsetTop - 90) current = '#' + s.getAttribute('id');
  });
  navLinks.forEach(l => {
    l.classList.remove('active');
    if (l.getAttribute('href') === current) l.classList.add('active');
  });
}
window.addEventListener('scroll', onScroll);
onScroll();

// ===================================================
// MODAL HELPERS
// ===================================================
function bukaModal(id) {
  document.getElementById(id).classList.add('aktif');
}
function tutupModal(id) {
  document.getElementById(id).classList.remove('aktif');
}

// Tutup modal apabila klik luar kotak
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', function (e) {
    if (e.target === this) this.classList.remove('aktif');
  });
});

// ===================================================
// KPI — AUTO KIRA SEMULA
// ===================================================
function kemasKiniKPI() {
  const data     = baca(KEY_PROGRAM);
  const jumlah   = data.length;
  const selesai  = data.filter(p => p.status === 'Selesai').length;
  const aktif    = data.filter(p => p.status === 'Aktif').length;
  const dirancang = data.filter(p => p.status === 'Dirancang').length;
  const peratus  = jumlah > 0 ? Math.round((selesai / jumlah) * 100) : 0;

  document.getElementById('kpi-jumlah').textContent  = jumlah;
  document.getElementById('kpi-selesai').textContent = selesai;
  document.getElementById('kpi-aktif').textContent   = aktif;
  document.getElementById('kpi-plan').textContent    = dirancang;
  document.getElementById('kpi-peratus').textContent = `${peratus}% Selesai`;
  document.getElementById('progress-fill').style.width = `${peratus}%`;
}

// ===================================================
// TAKWIM TAHUNAN — AUTO RENDER DARI DATA PROGRAM
// ===================================================
const NAMA_BULAN = ['Januari','Februari','Mac','April','Mei','Jun',
                    'Julai','Ogos','September','Oktober','November','Disember'];

const KAT_CLASS = {
  'Akademik':    'ev-akademik',
  'Kokurikulum': 'ev-koko',
  'Komuniti':    'ev-komuniti',
  'Pentadbiran': 'ev-pentadbiran'
};

function renderTakwim() {
  const grid = document.getElementById('calendar-grid');
  if (!grid) return;
  const data = baca(KEY_PROGRAM);

  grid.innerHTML = NAMA_BULAN.map((nama, i) => {
    const mm = String(i + 1).padStart(2, '0');
    const programBulanIni = data.filter(p => bulanDariIso(p.tarikh) === mm);
    const events = programBulanIni.map(p =>
      `<div class="cal-event ${KAT_CLASS[p.kategori] || 'ev-pentadbiran'}" title="${p.lokasi || ''}">${p.nama}</div>`
    ).join('');
    return `<div class="cal-month">
      <div class="cal-month-name">${nama}</div>
      ${events || '<div style="font-size:10.5px;color:var(--muted);padding:2px 0;">Tiada program</div>'}
    </div>`;
  }).join('');
}

// ===================================================
// SENARAI PROGRAM — RENDER, FILTER, CARIAN
// ===================================================
const STATUS_BADGE = {
  'Selesai':    '<span class="badge badge-success">Selesai</span>',
  'Aktif':      '<span class="badge badge-active">Sedang Berjalan</span>',
  'Dirancang':  '<span class="badge badge-pending">Dirancang</span>',
  'Dibatalkan': '<span class="badge badge-danger">Dibatalkan</span>'
};

const KAT_BADGE = {
  'Akademik':    '<span class="cat-badge cat-akademik">Teknologi Elektrik / Pengajian Am</span>',
  'Kokurikulum': '<span class="cat-badge cat-koko">Sukan</span>',
  'Komuniti':    '<span class="cat-badge cat-komuniti">Pembangunan Pelajar</span>',
  'Pentadbiran': '<span class="cat-badge cat-pentadbiran">Pentadbiran / JK / Peperiksaan</span>'
};

function renderProgram() {
  const tbody = document.getElementById('jadual-program');
  if (!tbody) return;
  const data = baca(KEY_PROGRAM);

  if (data.length === 0) {
    tbody.innerHTML = '';
    document.getElementById('tiada-rekod').style.display = '';
    return;
  }

  document.getElementById('tiada-rekod').style.display = 'none';
  tbody.innerHTML = data.map((p, i) => `
    <tr data-bulan="${bulanDariIso(p.tarikh)}" data-kategori="${p.kategori}" data-status="${p.status}">
      <td>${i + 1}</td>
      <td>${p.nama}${p.lokasi ? `<br><small style="color:var(--muted);">📍 ${p.lokasi}</small>` : ''}</td>
      <td>${formatTarikh(p.tarikh)}</td>
      <td>${KAT_BADGE[p.kategori] || p.kategori}</td>
      <td>${UNIT_LABEL[p.ketua] || p.ketua}</td>
      <td>${STATUS_BADGE[p.status] || p.status}</td>
      <td style="white-space:nowrap;">
        <button class="btn btn-outline btn-sm" onclick="editProgram('${p.id}')">✏️</button>
        <button class="btn btn-outline btn-sm" style="color:var(--danger);border-color:var(--danger);" onclick="padamKonfirm('program','${p.id}','${p.nama.replace(/'/g,"\\'")}')">🗑️</button>
      </td>
    </tr>`).join('');

  filterProgram();
}

function filterProgram() {
  const tbody = document.getElementById('jadual-program');
  if (!tbody) return;
  const cari     = (document.getElementById('cari-program')?.value || '').toLowerCase().trim();
  const bulan    = document.getElementById('filter-bulan')?.value    || '';
  const kategori = (document.getElementById('filter-kategori')?.value || '').toLowerCase();
  const status   = document.getElementById('filter-status')?.value   || '';

  let visible = 0;
  tbody.querySelectorAll('tr').forEach(row => {
    const nama      = row.cells[1]?.textContent.toLowerCase() || '';
    const rBulan    = row.getAttribute('data-bulan')    || '';
    const rKat      = (row.getAttribute('data-kategori') || '').toLowerCase();
    const rStatus   = row.getAttribute('data-status')   || '';

    const ok = (!cari || nama.includes(cari))
            && (!bulan || rBulan === bulan)
            && (!kategori || rKat === kategori)
            && (!status || rStatus === status);

    row.style.display = ok ? '' : 'none';
    if (ok) visible++;
  });

  const tiadaEl = document.getElementById('tiada-rekod');
  if (tiadaEl) tiadaEl.style.display = (visible === 0 && baca(KEY_PROGRAM).length > 0) ? '' : 'none';
}

['cari-program','filter-bulan','filter-kategori','filter-status'].forEach(id => {
  document.getElementById(id)?.addEventListener(id === 'cari-program' ? 'input' : 'change', filterProgram);
});

// --- Tambah Program ---
document.getElementById('btn-tambah-program')?.addEventListener('click', () => {
  document.getElementById('prog-id').value      = '';
  document.getElementById('prog-nama').value    = '';
  document.getElementById('prog-tarikh').value  = '';
  document.getElementById('prog-kategori').value = '';
  document.getElementById('prog-ketua').value   = '';
  document.getElementById('prog-status').value  = 'Dirancang';
  document.getElementById('prog-lokasi').value  = '';
  document.getElementById('modal-program-title').textContent = 'Tambah Program Baharu';
  bukaModal('modal-program');
});

function editProgram(id) {
  const data = baca(KEY_PROGRAM);
  const p    = data.find(x => x.id === id);
  if (!p) return;
  document.getElementById('prog-id').value       = p.id;
  document.getElementById('prog-nama').value     = p.nama;
  document.getElementById('prog-tarikh').value   = p.tarikh;
  document.getElementById('prog-kategori').value = p.kategori;
  document.getElementById('prog-ketua').value    = p.ketua;
  document.getElementById('prog-status').value   = p.status;
  document.getElementById('prog-lokasi').value   = p.lokasi || '';
  document.getElementById('modal-program-title').textContent = 'Kemaskini Program';
  bukaModal('modal-program');
}

function simpanProgram() {
  const nama     = document.getElementById('prog-nama').value.trim();
  const tarikh   = document.getElementById('prog-tarikh').value;
  const kategori = document.getElementById('prog-kategori').value;
  const ketua    = document.getElementById('prog-ketua').value.trim();
  const status   = document.getElementById('prog-status').value;
  const lokasi   = document.getElementById('prog-lokasi').value.trim();

  if (!nama)     { alert('Sila masukkan nama program.'); return; }
  if (!tarikh)   { alert('Sila pilih tarikh program.');  return; }
  if (!kategori) { alert('Sila pilih kategori.');        return; }
  if (!ketua)    { alert('Sila pilih jawatan/unit.'); return; }

  const id      = document.getElementById('prog-id').value;
  const data    = baca(KEY_PROGRAM);

  if (id) {
    const idx = data.findIndex(x => x.id === id);
    if (idx > -1) data[idx] = { id, nama, tarikh, kategori, ketua, status, lokasi };
  } else {
    data.push({ id: idBaharu(), nama, tarikh, kategori, ketua, status, lokasi });
  }

  data.sort((a, b) => a.tarikh.localeCompare(b.tarikh));
  simpan(KEY_PROGRAM, data);
  tutupModal('modal-program');
  renderSemua();
}

// ===================================================
// JAWATANKUASA — RENDER, TAMBAH, EDIT, PADAM
// ===================================================
const UNIT_LABEL = {
  'Pembangunan Pelajar': 'Pegawai Pembangunan Pelajar',
  'Teknologi Elektrik':  'Ketua Program (Teknologi Elektrik)',
  'Pengajian Am':        'Ketua Unit Pengajian Am',
  'Peperiksaan':         'Pegawai Peperiksaan',
  'Jaminan Kualiti':     'Ketua Unit Jaminan Kualiti',
  'Sukan':               'Penyelaras Sukan'
};

function renderJK() {
  const grid  = document.getElementById('jk-grid');
  const tiada = document.getElementById('tiada-jk');
  if (!grid) return;
  const jklist  = baca(KEY_JK);
  const program = baca(KEY_PROGRAM);

  if (jklist.length === 0) {
    grid.innerHTML = '';
    if (tiada) tiada.style.display = '';
    return;
  }
  if (tiada) tiada.style.display = 'none';

  grid.innerHTML = jklist.map(jk => {
    const myProg   = program.filter(p => p.ketua.toLowerCase().includes(jk.nama.toLowerCase().split(' ')[1] || jk.nama.toLowerCase()));
    const selesai  = myProg.filter(p => p.status === 'Selesai').length;
    const aktif    = myProg.filter(p => p.status === 'Aktif').length;
    const dirancang = myProg.filter(p => p.status === 'Dirancang').length;
    const emel     = jk.emel ? `<div class="jk-contact">📧 ${jk.emel}</div>` : '';

    return `<div class="jk-card">
      <div class="jk-icon">${jk.ikon || '👤'}</div>
      <div class="jk-name">${jk.nama}</div>
      <div class="jk-jawatan">${UNIT_LABEL[jk.unit] || jk.unit}</div>
      <div class="jk-stats">
        <span class="jk-stat-item jk-green">✅ ${selesai} Selesai</span>
        <span class="jk-stat-item jk-blue">🔵 ${aktif} Aktif</span>
        <span class="jk-stat-item jk-grey">⏳ ${dirancang} Plan</span>
      </div>
      ${emel}
      <div style="display:flex;gap:6px;margin-top:6px;">
        <button class="btn btn-outline btn-sm" onclick="editJK('${jk.id}')">✏️ Edit</button>
        <button class="btn btn-outline btn-sm" style="color:var(--danger);border-color:var(--danger);" onclick="padamKonfirm('jk','${jk.id}','${jk.nama.replace(/'/g,"\\'")}')">🗑️</button>
      </div>
    </div>`;
  }).join('');
}

document.getElementById('btn-tambah-jk')?.addEventListener('click', () => {
  document.getElementById('jk-id').value    = '';
  document.getElementById('jk-nama').value  = '';
  document.getElementById('jk-unit').value  = '';
  document.getElementById('jk-ikon').value  = '📚';
  document.getElementById('jk-emel').value  = '';
  document.getElementById('modal-jk-title').textContent = 'Tambah Jawatan/Unit';
  bukaModal('modal-jk');
});

function editJK(id) {
  const data = baca(KEY_JK);
  const jk   = data.find(x => x.id === id);
  if (!jk) return;
  document.getElementById('jk-id').value   = jk.id;
  document.getElementById('jk-nama').value = jk.nama;
  document.getElementById('jk-unit').value = jk.unit;
  document.getElementById('jk-ikon').value = jk.ikon || '📚';
  document.getElementById('jk-emel').value = jk.emel || '';
  document.getElementById('modal-jk-title').textContent = 'Kemaskini Jawatan/Unit';
  bukaModal('modal-jk');
}

function simpanJK() {
  const nama = document.getElementById('jk-nama').value.trim();
  const unit = document.getElementById('jk-unit').value;
  const ikon = document.getElementById('jk-ikon').value;
  const emel = document.getElementById('jk-emel').value.trim();

  if (!nama) { alert('Sila masukkan nama penuh.'); return; }
  if (!unit) { alert('Sila pilih unit.'); return; }

  const id   = document.getElementById('jk-id').value;
  const data = baca(KEY_JK);

  if (id) {
    const idx = data.findIndex(x => x.id === id);
    if (idx > -1) data[idx] = { id, nama, unit, ikon, emel };
  } else {
    data.push({ id: idBaharu(), nama, unit, ikon, emel });
  }

  simpan(KEY_JK, data);
  tutupModal('modal-jk');
  renderJK();
}

// ===================================================
// PENGUMUMAN — RENDER, TAMBAH, EDIT, PADAM
// ===================================================
function renderPengumuman() {
  const list  = document.getElementById('senarai-pengumuman');
  const tiada = document.getElementById('tiada-umum');
  if (!list) return;
  const data = baca(KEY_UMUM);

  if (data.length === 0) {
    list.innerHTML = '';
    if (tiada) tiada.style.display = '';
    return;
  }
  if (tiada) tiada.style.display = 'none';

  list.innerHTML = data.map(u => {
    let tarikhPapar = u.tarikh || '';
    if (tarikhPapar) {
      const dt = new Date(tarikhPapar);
      if (!isNaN(dt)) {
        tarikhPapar = `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()} &bull; ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;
      }
    }
    return `<li class="announcement-item">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
        <div class="announcement-title">${u.tajuk}</div>
        <div style="display:flex;gap:5px;flex-shrink:0;">
          <button class="btn btn-outline btn-sm" onclick="editPengumuman('${u.id}')">✏️</button>
          <button class="btn btn-outline btn-sm" style="color:var(--danger);border-color:var(--danger);" onclick="padamKonfirm('umum','${u.id}','${u.tajuk.replace(/'/g,"\\'")}')">🗑️</button>
        </div>
      </div>
      <div class="announcement-body">${u.isi}</div>
      ${tarikhPapar ? `<div class="announcement-date">📅 ${tarikhPapar}</div>` : ''}
    </li>`;
  }).join('');
}

document.getElementById('btn-tambah-umum')?.addEventListener('click', () => {
  document.getElementById('umum-id').value     = '';
  document.getElementById('umum-tajuk').value  = '';
  document.getElementById('umum-isi').value    = '';
  document.getElementById('umum-tarikh').value = '';
  document.getElementById('modal-umum-title').textContent = 'Tambah Pengumuman Baharu';
  bukaModal('modal-umum');
});

function editPengumuman(id) {
  const data = baca(KEY_UMUM);
  const u    = data.find(x => x.id === id);
  if (!u) return;
  document.getElementById('umum-id').value     = u.id;
  document.getElementById('umum-tajuk').value  = u.tajuk;
  document.getElementById('umum-isi').value    = u.isi;
  document.getElementById('umum-tarikh').value = u.tarikh || '';
  document.getElementById('modal-umum-title').textContent = 'Kemaskini Pengumuman';
  bukaModal('modal-umum');
}

function simpanPengumuman() {
  const tajuk  = document.getElementById('umum-tajuk').value.trim();
  const isi    = document.getElementById('umum-isi').value.trim();
  const tarikh = document.getElementById('umum-tarikh').value;

  if (!tajuk) { alert('Sila masukkan tajuk pengumuman.'); return; }
  if (!isi)   { alert('Sila masukkan isi pengumuman.');   return; }

  const id   = document.getElementById('umum-id').value;
  const data = baca(KEY_UMUM);

  if (id) {
    const idx = data.findIndex(x => x.id === id);
    if (idx > -1) data[idx] = { id, tajuk, isi, tarikh };
  } else {
    data.unshift({ id: idBaharu(), tajuk, isi, tarikh });
  }

  simpan(KEY_UMUM, data);
  tutupModal('modal-umum');
  renderPengumuman();
}

// ===================================================
// PADAM UNIVERSAL — KONFIRMASI
// ===================================================
let _padamJenis = null;
let _padamId    = null;

function padamKonfirm(jenis, id, nama) {
  _padamJenis = jenis;
  _padamId    = id;
  document.getElementById('padam-mesej').textContent =
    `Adakah anda pasti mahu memadam "${nama}"? Tindakan ini tidak boleh dibatalkan.`;
  bukaModal('modal-padam');
}

document.getElementById('btn-sahkan-padam')?.addEventListener('click', () => {
  if (!_padamJenis || !_padamId) return;

  const keyMap = { program: KEY_PROGRAM, jk: KEY_JK, umum: KEY_UMUM };
  const key    = keyMap[_padamJenis];
  if (!key) return;

  const data = baca(key).filter(x => x.id !== _padamId);
  simpan(key, data);
  tutupModal('modal-padam');

  if (_padamJenis === 'program') renderSemua();
  else if (_padamJenis === 'jk') renderJK();
  else if (_padamJenis === 'umum') renderPengumuman();

  _padamJenis = null;
  _padamId    = null;
});

// ===================================================
// MUAT NAIK LAPORAN — localStorage
// ===================================================
function handleUpload(jenis) {
  const isLaksana = jenis === 'pelaksanaan';
  const namaEl   = document.getElementById(isLaksana ? 'pel-nama'   : 'pm-nama');
  const tarikhEl = document.getElementById(isLaksana ? 'pel-tarikh' : 'pm-tarikh');
  const failEl   = document.getElementById(isLaksana ? 'pel-fail'   : 'pm-fail');

  const nama   = namaEl?.value.trim() || '';
  const tarikh = tarikhEl?.value      || '';
  const fail   = failEl?.files[0]?.name || '';

  if (!nama)   { alert('Sila masukkan nama program.'); namaEl?.focus(); return; }
  if (!tarikh) { alert('Sila pilih tarikh program.');  tarikhEl?.focus(); return; }
  if (!fail)   { alert('Sila pilih fail laporan.');    failEl?.focus(); return; }

  const key     = jenis === 'pelaksanaan' ? KEY_PELAKSANAAN : KEY_POSTMORTEM;
  const senarai = baca(key);
  senarai.push({ id: idBaharu(), nama, tarikh, fail, status: 'Belum Disemak' });
  simpan(key, senarai);

  if (namaEl)   namaEl.value   = '';
  if (tarikhEl) tarikhEl.value = '';
  if (failEl)   failEl.value   = '';

  renderUploadTable(jenis);
}

function renderUploadTable(jenis) {
  const key    = jenis === 'pelaksanaan' ? KEY_PELAKSANAAN : KEY_POSTMORTEM;
  const tbodyId = jenis === 'pelaksanaan' ? 'tbody-pelaksanaan' : 'tbody-postmortem';
  const tbody  = document.getElementById(tbodyId);
  if (!tbody) return;

  const senarai = baca(key);

  if (senarai.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:14px;">Belum ada laporan dimuat naik.</td></tr>`;
    return;
  }

  tbody.innerHTML = senarai.map((item, i) => {
    const badge = item.status === 'Disemak'
      ? `<span class="badge badge-success">Disemak</span>`
      : `<span class="badge badge-pending">Belum Disemak</span>`;
    return `<tr>
      <td>${i + 1}</td>
      <td>${item.nama}</td>
      <td>${formatTarikh(item.tarikh)}</td>
      <td>📄 ${item.fail}</td>
      <td>${badge}</td>
      <td><button class="btn btn-outline btn-sm" style="color:var(--danger);border-color:var(--danger);" onclick="padamLaporan('${key}','${item.id}')">🗑️</button></td>
    </tr>`;
  }).join('');
}

function padamLaporan(key, id) {
  if (!confirm('Padam rekod laporan ini?')) return;
  const data = baca(key).filter(x => x.id !== id);
  simpan(key, data);
  renderUploadTable(key === KEY_PELAKSANAAN ? 'pelaksanaan' : 'postmortem');
}

// ===================================================
// CHART.JS — GRAF STATISTIK (auto dari data)
// ===================================================
let chartBulanInst    = null;
let chartKategoriInst = null;

function renderCharts() {
  if (typeof Chart === 'undefined') return;

  const data        = baca(KEY_PROGRAM);
  const clrBlue     = '#1a3a6b';
  const clrMaroon   = '#800000';
  const clrGreen    = '#1a7a3a';
  const clrOrange   = '#b35900';
  const clrLight    = '#d0e8ff';

  const dataBulan = Array(12).fill(0);
  data.forEach(p => {
    const mm = parseInt(bulanDariIso(p.tarikh), 10);
    if (mm >= 1 && mm <= 12) dataBulan[mm - 1]++;
  });

  const warnaBulan = dataBulan.map((_, i) => {
    const mm = String(i + 1).padStart(2, '0');
    const adaSelesai = data.some(p => bulanDariIso(p.tarikh) === mm && p.status === 'Selesai');
    return adaSelesai ? clrBlue : clrLight;
  });

  const kat = { Akademik: 0, Kokurikulum: 0, Komuniti: 0, Pentadbiran: 0 };
  data.forEach(p => { if (kat[p.kategori] !== undefined) kat[p.kategori]++; });

  if (chartBulanInst)    { chartBulanInst.destroy();    chartBulanInst    = null; }
  if (chartKategoriInst) { chartKategoriInst.destroy(); chartKategoriInst = null; }

  const ctxBulan = document.getElementById('chartBulan');
  if (ctxBulan) {
    chartBulanInst = new Chart(ctxBulan, {
      type: 'bar',
      data: {
        labels: ['Jan','Feb','Mac','Apr','Mei','Jun','Jul','Ogs','Sep','Okt','Nov','Dis'],
        datasets: [{
          label: 'Bilangan Program',
          data: dataBulan,
          backgroundColor: warnaBulan,
          borderRadius: 5,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y} program` } }
        },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: '#e0e4ef' } },
          x: { grid: { display: false } }
        }
      }
    });
  }

  const ctxKategori = document.getElementById('chartKategori');
  if (ctxKategori) {
    chartKategoriInst = new Chart(ctxKategori, {
      type: 'doughnut',
      data: {
        labels: ['Akademik','Kokurikulum & Sukan','Komuniti & Industri','Pentadbiran'],
        datasets: [{
          data: [kat.Akademik, kat.Kokurikulum, kat.Komuniti, kat.Pentadbiran],
          backgroundColor: [clrBlue, clrMaroon, clrGreen, clrOrange],
          borderWidth: 2,
          borderColor: '#ffffff',
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        cutout: '60%',
        plugins: {
          legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 12, boxWidth: 12 } },
          tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed} program` } }
        }
      }
    });
  }
}

// ===================================================
// EXPORT & IMPORT DATA (JSON)
// ===================================================
function exportData() {
  const payload = {
    versi:        '1.0',
    tarikh_eksport: new Date().toISOString(),
    kolej:        'Kolej Komuniti Santubong',
    tahun:        '2027',
    program:      baca(KEY_PROGRAM),
    jawatankuasa: baca(KEY_JK),
    pengumuman:   baca(KEY_UMUM),
    pelaksanaan:  baca(KEY_PELAKSANAAN),
    postmortem:   baca(KEY_POSTMORTEM)
  };

  const json  = JSON.stringify(payload, null, 2);
  const blob  = new Blob([json], { type: 'application/json' });
  const url   = URL.createObjectURL(blob);
  const tarikh = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const a     = document.createElement('a');
  a.href      = url;
  a.download  = `takwim-kksantubong-${tarikh}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importData() {
  const failEl   = document.getElementById('import-fail');
  const statusEl = document.getElementById('import-status');
  const fail     = failEl?.files[0];

  if (!fail) {
    alert('Sila pilih fail .json untuk diimport.');
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const data = JSON.parse(e.target.result);

      if (!data.program || !Array.isArray(data.program)) {
        throw new Error('Fail JSON tidak sah — tiada data program.');
      }

      simpan(KEY_PROGRAM,      data.program      || []);
      simpan(KEY_JK,           data.jawatankuasa  || []);
      simpan(KEY_UMUM,         data.pengumuman    || []);
      simpan(KEY_PELAKSANAAN,  data.pelaksanaan   || []);
      simpan(KEY_POSTMORTEM,   data.postmortem    || []);

      if (failEl) failEl.value = '';

      if (statusEl) {
        const tarikhEksport = data.tarikh_eksport
          ? new Date(data.tarikh_eksport).toLocaleString('ms-MY')
          : '—';
        statusEl.style.display = '';
        statusEl.style.color   = 'var(--success)';
        statusEl.innerHTML = `✅ Import berjaya! ${data.program.length} program, ${(data.jawatankuasa||[]).length} ketua unit, ${(data.pengumuman||[]).length} pengumuman dimuatkan. <em>(Eksport asal: ${tarikhEksport})</em>`;
      }

      renderSemua();
      renderJK();
      renderPengumuman();
      renderUploadTable('pelaksanaan');
      renderUploadTable('postmortem');

    } catch (err) {
      if (statusEl) {
        statusEl.style.display = '';
        statusEl.style.color   = 'var(--danger)';
        statusEl.textContent   = `❌ Gagal import: ${err.message}`;
      }
    }
  };
  reader.readAsText(fail);
}

// ===================================================
// RENDER SEMUA (panggil selepas sebarang perubahan)
// ===================================================
function renderSemua() {
  kemasKiniKPI();
  renderTakwim();
  renderProgram();
  renderCharts();
}

// ===================================================
// INIT — MUATKAN SEMUA PADA PAGE LOAD
// ===================================================
function init() {
  renderSemua();
  renderJK();
  renderPengumuman();
  renderUploadTable('pelaksanaan');
  renderUploadTable('postmortem');
}

if (typeof Chart !== 'undefined') {
  init();
} else {
  window.addEventListener('load', init);
}
