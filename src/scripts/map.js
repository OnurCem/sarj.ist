import L from 'leaflet';
import { stations } from '../data/stations';

const $ = (s) => document.querySelector(s);
const icon = (name) => `<svg aria-hidden="true"><use href="#${name}"/></svg>`;
let selected = stations[0]?.id ?? null;
let type = 'all';
let visible = [];
let detailOpen = !window.matchMedia('(max-width:760px)').matches;
const markers = new Map();
const map = L.map('map', { zoomControl: false, scrollWheelZoom: true }).setView([41.08, 28.99], 13);
const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
}).addTo(map);
let tileLoaded = false;
tiles.on('tileload', () => { tileLoaded = true; $('#map-error').hidden = true; });
tiles.on('tileerror', () => { if (!tileLoaded) $('#map-error').hidden = false; });

function markerIcon(s) {
  return L.divIcon({ className: 'charger-marker', html: `<div class="charger-pin ${s.type === 'AC' ? 'ac' : ''} ${s.id === selected ? 'chosen' : ''}">${icon('socket')}${s.type === 'DC' ? icon('bolt') : ''}${s.power}</div>`, iconSize: [82, 42], iconAnchor: [41, 47] });
}
function operatorMark(s) {
  return `<span class="operator-mark ${s.operator.toLocaleLowerCase('tr')}" aria-label="${s.operator}">${s.operator === 'Zes' ? 'zes' : s.operator.toLocaleLowerCase('tr')}</span>`;
}
function card(s) {
  const title = s.name.split(' · ')[0];
  return `<button class="station-card ${s.id === selected ? 'selected' : ''}" data-id="${s.id}" aria-label="${s.name}, ${s.power} kW, detayları göster" aria-pressed="${s.id === selected}">${operatorMark(s)}<div class="station-copy"><h3>${title}<span> · Şarj noktası</span></h3><p class="station-area">${s.area}${s.access === 'Özel erişim' ? ' · Özel erişim' : ''}</p></div><div class="station-power ${s.type === 'AC' ? 'ac' : ''}"><strong>${s.type} ${s.power} kW</strong><span>${s.sockets} soket</span></div><svg class="station-arrow" aria-hidden="true"><use href="#chevron"/></svg></button>`;
}
function renderDetail() {
  const s = stations.find((s) => s.id === selected);
  const detail = $('#station-detail');
  detail.hidden = !detailOpen || !s;
  if (detail.hidden) return;
  detail.innerHTML = `<div class="detail-top">${operatorMark(s)}<span class="detail-access">${s.operator} · ${s.access}</span><button class="close-detail" aria-label="İstasyon detayını kapat">${icon('close')}</button></div><h2>${s.name}</h2><p class="detail-address">${icon('pin')}${s.area}</p><div class="detail-specs"><div>${icon('socket')}<strong>${s.type === 'DC' ? 'DC CCS' : 'AC Tip 2'}</strong><small>Şarj türü</small></div><div>${icon('bolt')}<strong>${s.power} kW</strong><small>Azami güç</small></div><div>${icon('plug')}<strong>${s.sockets} soket</strong><small>Soket sayısı</small></div></div><button class="primary" id="example-route">${icon('navigate')}Yol tarifi hakkında</button><div class="detail-note">Örnek veriler · Anlık müsaitlik gösterilmez.</div>`;
  $('.close-detail').addEventListener('click', () => { detailOpen = false; renderDetail(); document.querySelector(`.station-card[data-id="${selected}"]`)?.focus(); });
  $('#example-route').addEventListener('click', () => {
    $('#route-dialog').showModal();
  });
}
function selectStation(id, fromMap = false) {
  selected = id;
  detailOpen = true;
  render();
  const s = stations.find((s) => s.id === id);
  if (window.matchMedia('(max-width:760px)').matches) setMapMode(true);
  if (!fromMap) {
    const narrow = window.matchMedia('(max-width:760px)').matches;
    const point = map.project([s.lat, s.lng], map.getZoom());
    const offset = narrow ? L.point(0, 120) : L.point(-150, 0);
    map.panTo(map.unproject(point.add(offset), map.getZoom()), { animate: !window.matchMedia('(prefers-reduced-motion: reduce)').matches });
  }
  renderDetail();
}
function render() {
  const query = $('#search-input').value.trim().toLocaleLowerCase('tr');
  visible = stations.filter((s) => (type === 'all' || s.type === type) && ($('#operator').value === 'all' || s.operator === $('#operator').value) && ($('#private').checked || s.access === 'Halka açık') && `${s.name} ${s.area} ${s.operator}`.toLocaleLowerCase('tr').includes(query));
  if (!visible.some((s) => s.id === selected)) { selected = null; detailOpen = false; }
  $('#result-count').textContent = `${visible.length} istasyon`;
  $('#station-list').innerHTML = visible.length ? visible.map(card).join('') : '<div class="empty">Bu filtrelere uygun istasyon bulunamadı.<br/>Başka bir arama yapabilir veya filtreleri temizleyebilirsin.<br/><button id="clear-filters">Filtreleri temizle</button></div>';
  document.querySelectorAll('.station-card').forEach((button) => button.addEventListener('click', () => selectStation(button.dataset.id)));
  $('#clear-filters')?.addEventListener('click', resetFilters);
  markers.forEach((m) => map.removeLayer(m));
  markers.clear();
  visible.forEach((s) => {
    const marker = L.marker([s.lat, s.lng], { icon: markerIcon(s), title: `${s.name} · ${s.power} kW`, alt: `${s.name} detayları`, keyboard: true, zIndexOffset: s.id === selected ? 1000 : 0 }).addTo(map);
    marker.on('click', () => selectStation(s.id, true));
    markers.set(s.id, marker);
  });
  renderDetail();
}
function resetFilters() {
  $('#search-input').value = '';
  $('#operator').value = 'all';
  $('#private').checked = false;
  setType('all');
}
function setType(value) {
  type = value;
  document.querySelectorAll('[data-type]').forEach((b) => { b.classList.toggle('active', b.dataset.type === type); b.setAttribute('aria-pressed', String(b.dataset.type === type)); });
  render();
}
function setMapMode(enabled) {
  $('.workspace').classList.toggle('map-mode', enabled);
  $('#mobile-toggle span').textContent = enabled ? 'Listeyi göster' : 'Haritayı göster';
  requestAnimationFrame(() => map.invalidateSize());
}
document.querySelectorAll('[data-type]').forEach((button) => button.addEventListener('click', () => setType(button.dataset.type)));
$('#search-input').addEventListener('input', render);
$('#operator').addEventListener('change', render);
$('#private').addEventListener('change', render);
$('#filters-button').addEventListener('click', () => { const expanded = $('#filters-button').getAttribute('aria-expanded') === 'true'; $('#filters-button').setAttribute('aria-expanded', String(!expanded)); $('#extra-filters').hidden = expanded; });
$('#zoom-in').addEventListener('click', () => map.zoomIn());
$('#zoom-out').addEventListener('click', () => map.zoomOut());
$('#reset-map').addEventListener('click', () => { if (visible.length) map.fitBounds(visible.map((s) => [s.lat, s.lng]), { paddingTopLeft: window.matchMedia('(max-width:760px)').matches ? [50, 70] : [490, 90], paddingBottomRight: [90, 120], maxZoom: 14 }); });
$('#mobile-toggle').addEventListener('click', () => setMapMode(!$('.workspace').classList.contains('map-mode')));
$('#about-button').addEventListener('click', () => $('#about-dialog').showModal());
document.querySelectorAll('#about-dialog .dialog-close, .dialog-done').forEach((b) => b.addEventListener('click', () => $('#about-dialog').close()));
document.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setMapMode(false); $('#search-input').focus(); }
  if (event.key === 'Escape' && detailOpen) { detailOpen = false; renderDetail(); }
});
const routeDialog = document.createElement('dialog');
routeDialog.id = 'route-dialog';
routeDialog.innerHTML = `<h2>Yol tarifi, gerçek verilerle.</h2><p>Bu istasyon örnek olduğu için yol tarifi açılmaz. Gerçek istasyon verileri bağlandığında bu adım navigasyon uygulamasına yönlendirecek.</p><button class="primary">Anladım</button>`;
document.body.append(routeDialog);
routeDialog.querySelector('button').addEventListener('click', () => routeDialog.close());
render();

// Optional agent interface: it shares the same filtering state as the UI.
if (document.modelContext?.registerTool) {
  const lifecycle = new AbortController();
  try {
    Promise.resolve(document.modelContext.registerTool({
      name: 'filter_demo_stations',
      title: 'Filter example charging stations',
      description: 'Update the prototype search and charger-type filter. Returns illustrative stations, never live availability.',
      inputSchema: { type: 'object', properties: { query: { type: 'string' }, chargerType: { type: 'string', enum: ['all', 'AC', 'DC'] } }, required: ['query', 'chargerType'], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        if (!input || typeof input.query !== 'string' || !['all', 'AC', 'DC'].includes(input.chargerType) || Object.keys(input).some((key) => !['query', 'chargerType'].includes(key))) throw new Error('Expected a query string and chargerType of all, AC or DC.');
        $('#search-input').value = input.query;
        setMapMode(false);
        setType(input.chargerType);
        return { demo: true, count: visible.length, stations: visible.map(({ id, name, type, power }) => ({ id, name, type, power })) };
      },
    }, { signal: lifecycle.signal })).catch(() => {});
    window.addEventListener('pagehide', () => lifecycle.abort(), { once: true });
  } catch { /* The UI remains available if the optional registry rejects registration. */ }
}
