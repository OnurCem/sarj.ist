export function formatRefreshDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'bilinmiyor';
  return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'long', timeZone: 'Europe/Istanbul' }).format(date);
}

export function datasetPresentation(meta = {}) {
  const isSample = meta.isSample !== false;
  const refreshedAt = formatRefreshDate(meta.refreshedAt);
  if (isSample) {
    return {
      isSample,
      badge: 'Tasarım önizlemesi',
      summary: 'Örnek veriler · Anlık müsaitlik gösterilmez.',
      about: 'Bu görünüm örnek istasyonlarla çalışır. Konumlar ve soket bilgileri yalnızca arayüz geliştirmesi içindir; seyahat planlamak için kullanılmamalıdır.',
      warningTitle: meta.label || 'Örnek veriler',
      warningText: 'Bu kayıtlar yalnızca arayüz geliştirmesi içindir. Anlık müsaitlik gösterilmez ve seyahat planlamak için kullanılmamalıdır.',
    };
  }
  return {
    isSample,
    badge: 'EPDK verisi',
    summary: `Kaynak: EPDK · Son güncelleme: ${refreshedAt} · Anlık müsaitlik gösterilmez.`,
    about: `İstasyon bilgileri Enerji Piyasası Düzenleme Kurumu (EPDK) verilerinden hazırlanır. Son güncelleme: ${refreshedAt}. Kayıtlar anlık müsaitlik, fiyat veya çalışma durumu içermez.`,
    warningTitle: 'Kaynak: EPDK',
    warningText: `İstasyon bilgileri ${refreshedAt} tarihinde güncellenen EPDK verilerinden hazırlanmıştır. Anlık müsaitlik, fiyat ve çalışma durumu gösterilmez.`,
  };
}

export function navigationUrl({ lat, lng }) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error('Navigation coordinates must be finite numbers');
  const destination = encodeURIComponent(`${lat},${lng}`);
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
}

export function operatorNames(stations) {
  return [...new Set(stations.map(({ operator }) => operator).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr'));
}

export function operatorBadgeLabel(operator) {
  return String(operator).trim();
}

export const MIN_STATION_LIST_ZOOM = 10;

export function shouldShowStationList(zoom) {
  return Number.isFinite(zoom) && zoom >= MIN_STATION_LIST_ZOOM;
}

export function shouldAutoLocate(permissionState) {
  return permissionState === 'granted';
}

export function mapHref(citySlug) {
  return `/?sehir=${encodeURIComponent(citySlug)}`;
}

export function regionSlugFromSearch(search, regions) {
  const requested = new URLSearchParams(search).get('sehir');
  if (regions.some(({ slug }) => slug === requested)) return requested;
  if (regions.some(({ slug }) => slug === 'all')) return 'all';
  if (regions.some(({ slug }) => slug === 'istanbul')) return 'istanbul';
  return regions[0]?.slug;
}

export function normalizedSearch(value) {
  return String(value).trim().toLocaleLowerCase('tr').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function regionFromQuery(query, regions) {
  const requested = normalizedSearch(query);
  if (requested.length < 2) return undefined;
  const matches = regions.filter(({ name, slug }) => normalizedSearch(name).startsWith(requested) || normalizedSearch(slug) === requested);
  return matches.length === 1 ? matches[0] : matches.find(({ name, slug }) => [normalizedSearch(name), normalizedSearch(slug)].includes(requested));
}

export function distanceKm(from, to) {
  const radians = (degrees) => degrees * Math.PI / 180;
  const deltaLat = radians(to.lat - from.lat);
  const deltaLng = radians(to.lng - from.lng);
  const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(radians(from.lat)) * Math.cos(radians(to.lat)) * Math.sin(deltaLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function closestRegion(position, regions) {
  return regions.filter(({ center }) => Number.isFinite(center?.lat) && Number.isFinite(center?.lng))
    .reduce((closest, region) => !closest || distanceKm(position, region.center) < distanceKm(position, closest.center) ? region : closest, undefined);
}

export function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
}
