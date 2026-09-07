import L from 'leaflet';
import 'leaflet.markercluster';
import { datasetPresentation, escapeHtml, navigationUrl, operatorBadgeLabel, operatorNames } from '../lib/station-presentation.mjs';

const $ = (selector) => document.querySelector(selector);
const icon = (name) => `<svg aria-hidden="true"><use href="#${name}"/></svg>`;
const MAX_LIST_RESULTS = 200;
let stations = [];
let selected = null;
let type = 'all';
let visible = [];
let dataView = datasetPresentation();
let detailOpen = !window.matchMedia('(max-width:760px)').matches;
let searchTimer;
const markers = new Map();

const map = L.map('map', { zoomControl: false, scrollWheelZoom: true, maxZoom: 19 }).setView([41.08, 28.99], 13);
const markerLayer = L.markerClusterGroup({
  chunkedLoading: true,
  maxClusterRadius: 48,
  showCoverageOnHover: false,
  iconCreateFunction: (cluster) => L.divIcon({
    className: 'station-cluster',
    html: `<span>${cluster.getChildCount()}</span>`,
    iconSize: [46, 46],
  }),
}).addTo(map);
const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
}).addTo(map);
let tileLoaded = false;
tiles.on('tileload', () => { tileLoaded = true; $('#map-error').hidden = true; });
tiles.on('tileerror', () => { if (!tileLoaded) $('#map-error').hidden = false; });

function markerIcon(station) {
  return L.divIcon({
    className: 'charger-marker',
    html: `<div class="charger-pin ${station.type === 'AC' ? 'ac' : ''} ${station.id === selected ? 'chosen' : ''}">${icon('socket')}${station.type === 'DC' ? icon('bolt') : ''}${station.power}</div>`,
    iconSize: [82, 42],
    iconAnchor: [41, 47],
  });
}

function operatorMark(station) {
  const operator = escapeHtml(station.operator);
  return `<span class="operator-mark" aria-label="${operator}" title="${operator}">${escapeHtml(operatorBadgeLabel(station.operator))}</span>`;
}

function card(station) {
  const title = escapeHtml(station.name.split(' · ')[0]);
  return `<button class="station-card ${station.id === selected ? 'selected' : ''}" data-id="${escapeHtml(station.id)}" aria-label="${escapeHtml(station.name)}, ${station.power} kW, detayları göster" aria-pressed="${station.id === selected}">${operatorMark(station)}<div class="station-copy"><h3>${title}<span> · Şarj noktası</span></h3><p class="station-area">${escapeHtml(station.area)}${station.access === 'Özel erişim' ? ' · Özel erişim' : ''}</p></div><div class="station-power ${station.type === 'AC' ? 'ac' : ''}"><strong>${station.type} ${station.power} kW</strong><span>${station.sockets} soket</span></div><svg class="station-arrow" aria-hidden="true"><use href="#chevron"/></svg></button>`;
}

function renderDetail() {
  const station = stations.find(({ id }) => id === selected);
  const detail = $('#station-detail');
  detail.hidden = !detailOpen || !station;
  if (detail.hidden) return;

  const routeAction = dataView.isSample
    ? `<button class="primary" id="sample-route">${icon('navigate')}Yol tarifi hakkında</button>`
    : `<a class="primary" id="navigation-link" href="${navigationUrl(station)}" target="_blank" rel="noopener noreferrer">${icon('navigate')}Yol tarifi al</a>`;
  detail.innerHTML = `<div class="detail-top">${operatorMark(station)}<span class="detail-access">${escapeHtml(station.operator)} · ${escapeHtml(station.access)}</span><button class="close-detail" aria-label="İstasyon detayını kapat">${icon('close')}</button></div><h2>${escapeHtml(station.name)}</h2><p class="detail-address">${icon('pin')}${escapeHtml(station.area)}</p><div class="detail-specs"><div>${icon('socket')}<strong>${station.type === 'DC' ? 'DC CCS' : 'AC Tip 2'}</strong><small>Şarj türü</small></div><div>${icon('bolt')}<strong>${station.power} kW</strong><small>Azami güç</small></div><div>${icon('plug')}<strong>${station.sockets} soket</strong><small>Soket sayısı</small></div></div>${routeAction}<div class="detail-note">${escapeHtml(dataView.summary)}</div>`;
  $('.close-detail').addEventListener('click', () => {
    detailOpen = false;
    renderDetail();
    document.querySelector(`.station-card[data-id="${CSS.escape(selected)}"]`)?.focus();
  });
  $('#sample-route')?.addEventListener('click', () => $('#route-dialog').showModal());
}

function selectStation(id, fromMap = false) {
  selected = id;
  detailOpen = true;
  render();
  const station = stations.find((candidate) => candidate.id === id);
  if (!station) return;
  if (window.matchMedia('(max-width:760px)').matches) setMapMode(true);
  if (!fromMap) {
    const narrow = window.matchMedia('(max-width:760px)').matches;
    const showStation = () => {
      const point = map.project([station.lat, station.lng], map.getZoom());
      const offset = narrow ? L.point(0, 120) : L.point(-150, 0);
      map.panTo(map.unproject(point.add(offset), map.getZoom()), { animate: !window.matchMedia('(prefers-reduced-motion: reduce)').matches });
    };
    const marker = markers.get(id);
    if (marker) markerLayer.zoomToShowLayer(marker, showStation);
    else showStation();
  }
  renderDetail();
}

function render() {
  const query = $('#search-input').value.trim().toLocaleLowerCase('tr');
  visible = stations.filter((station) => (
    (type === 'all' || station.type === type)
    && ($('#operator').value === 'all' || station.operator === $('#operator').value)
    && ($('#private').checked || station.access === 'Halka açık')
    && `${station.name} ${station.area} ${station.operator}`.toLocaleLowerCase('tr').includes(query)
  ));
  if (!visible.some(({ id }) => id === selected)) { selected = null; detailOpen = false; }
  $('#result-count').textContent = `${visible.length} istasyon`;

  const listed = visible.slice(0, MAX_LIST_RESULTS);
  const overflowNote = visible.length > MAX_LIST_RESULTS
    ? `<div class="list-limit">İlk ${MAX_LIST_RESULTS} sonuç gösteriliyor. Aramayı daraltarak diğer istasyonlara ulaşabilirsin.</div>`
    : '';
  $('#station-list').innerHTML = visible.length
    ? `${listed.map(card).join('')}${overflowNote}`
    : '<div class="empty">Bu filtrelere uygun istasyon bulunamadı.<br/>Başka bir arama yapabilir veya filtreleri temizleyebilirsin.<br/><button id="clear-filters">Filtreleri temizle</button></div>';
  document.querySelectorAll('.station-card').forEach((button) => button.addEventListener('click', () => selectStation(button.dataset.id)));
  $('#clear-filters')?.addEventListener('click', resetFilters);

  markerLayer.clearLayers();
  markers.clear();
  const nextMarkers = visible.map((station) => {
    const marker = L.marker([station.lat, station.lng], {
      icon: markerIcon(station),
      title: `${station.name} · ${station.power} kW`,
      alt: `${station.name} detayları`,
      keyboard: true,
      zIndexOffset: station.id === selected ? 1000 : 0,
    });
    marker.on('click', () => selectStation(station.id, true));
    markers.set(station.id, marker);
    return marker;
  });
  markerLayer.addLayers(nextMarkers);
  renderDetail();
}

function applyDatasetMeta(meta) {
  dataView = datasetPresentation(meta);
  $('#dataset-badge').textContent = dataView.badge;
  $('#data-note-text').textContent = dataView.summary;
  $('#about-data-copy').textContent = dataView.about;
}

function populateOperators() {
  $('#operator').innerHTML = `<option value="all">Tüm operatörler</option>${operatorNames(stations).map((operator) => `<option value="${escapeHtml(operator)}">${escapeHtml(operator)}</option>`).join('')}`;
}

async function loadStations() {
  try {
    const response = await fetch('/data/regions/istanbul.json');
    if (!response.ok) throw new Error(`Station bundle returned ${response.status}`);
    const payload = await response.json();
    if (payload.schemaVersion !== 1 || !Array.isArray(payload.stations)) throw new Error('Unsupported station bundle');
    stations = payload.stations;
    applyDatasetMeta(payload.meta);
    populateOperators();
    selected = stations[0]?.id ?? null;
    render();
  } catch (error) {
    console.error('Station data could not be loaded', error);
    $('#result-count').textContent = 'Veri yüklenemedi';
    $('#station-list').innerHTML = '<div class="empty"><strong>İstasyonlar yüklenemedi.</strong><br/>Lütfen sayfayı yenileyerek tekrar dene.</div>';
  }
}

function resetFilters() {
  $('#search-input').value = '';
  $('#operator').value = 'all';
  $('#private').checked = false;
  setType('all');
}

function setType(value) {
  type = value;
  document.querySelectorAll('[data-type]').forEach((button) => {
    button.classList.toggle('active', button.dataset.type === type);
    button.setAttribute('aria-pressed', String(button.dataset.type === type));
  });
  render();
}

function setMapMode(enabled) {
  $('.workspace').classList.toggle('map-mode', enabled);
  $('#mobile-toggle span').textContent = enabled ? 'Listeyi göster' : 'Haritayı göster';
  requestAnimationFrame(() => map.invalidateSize());
}

document.querySelectorAll('[data-type]').forEach((button) => button.addEventListener('click', () => setType(button.dataset.type)));
$('#search-input').addEventListener('input', () => {
  window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(render, 120);
});
$('#operator').addEventListener('change', render);
$('#private').addEventListener('change', render);
$('#filters-button').addEventListener('click', () => {
  const expanded = $('#filters-button').getAttribute('aria-expanded') === 'true';
  $('#filters-button').setAttribute('aria-expanded', String(!expanded));
  $('#extra-filters').hidden = expanded;
});
$('#zoom-in').addEventListener('click', () => map.zoomIn());
$('#zoom-out').addEventListener('click', () => map.zoomOut());
$('#reset-map').addEventListener('click', () => {
  if (visible.length) map.fitBounds(visible.map(({ lat, lng }) => [lat, lng]), {
    paddingTopLeft: window.matchMedia('(max-width:760px)').matches ? [50, 70] : [490, 90],
    paddingBottomRight: [90, 120],
    maxZoom: 14,
  });
});
$('#mobile-toggle').addEventListener('click', () => setMapMode(!$('.workspace').classList.contains('map-mode')));
$('#about-button').addEventListener('click', () => $('#about-dialog').showModal());
document.querySelectorAll('#about-dialog .dialog-close, .dialog-done').forEach((button) => button.addEventListener('click', () => $('#about-dialog').close()));
document.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase('tr') === 'k') { event.preventDefault(); setMapMode(false); $('#search-input').focus(); }
  if (event.key === 'Escape' && detailOpen) { detailOpen = false; renderDetail(); }
});

const routeDialog = document.createElement('dialog');
routeDialog.id = 'route-dialog';
routeDialog.innerHTML = `<h2>Yol tarifi örnek verilerde kapalıdır.</h2><p>Bu konum yalnızca arayüz geliştirmesi içindir. EPDK verisiyle hazırlanan bir yayında bu düğme Google Maps yol tarifini açar.</p><button class="primary">Anladım</button>`;
document.body.append(routeDialog);
routeDialog.querySelector('button').addEventListener('click', () => routeDialog.close());
loadStations();

// Optional agent interface: it shares the same filtering state as the UI.
if (document.modelContext?.registerTool) {
  const lifecycle = new AbortController();
  try {
    Promise.resolve(document.modelContext.registerTool({
      name: 'filter_charging_stations',
      title: 'Şarj istasyonlarını filtrele',
      description: 'Arama ve şarj türü filtresini günceller. Sonuçlar gerçek zamanlı müsaitlik bilgisi içermez.',
      inputSchema: { type: 'object', properties: { query: { type: 'string' }, chargerType: { type: 'string', enum: ['all', 'AC', 'DC'] } }, required: ['query', 'chargerType'], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        if (!input || typeof input.query !== 'string' || !['all', 'AC', 'DC'].includes(input.chargerType) || Object.keys(input).some((key) => !['query', 'chargerType'].includes(key))) throw new Error('Expected a query string and chargerType of all, AC or DC.');
        $('#search-input').value = input.query;
        setMapMode(false);
        setType(input.chargerType);
        return { sample: dataView.isSample, count: visible.length, stations: visible.map(({ id, name, type: chargerType, power }) => ({ id, name, type: chargerType, power })) };
      },
    }, { signal: lifecycle.signal })).catch(() => {});
    window.addEventListener('pagehide', () => lifecycle.abort(), { once: true });
  } catch { /* The UI remains available if the optional registry rejects registration. */ }
}
