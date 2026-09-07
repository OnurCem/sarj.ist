export type ChargerType = 'AC' | 'DC';
export type StationAccess = 'Halka açık' | 'Özel erişim';

export interface Station {
  id: string;
  slug: string;
  name: string;
  area: string;
  district: string;
  city: string;
  citySlug: string;
  operator: string;
  type: ChargerType;
  power: number;
  sockets: number;
  lat: number;
  lng: number;
  access: StationAccess;
}

export const dataset = {
  isSample: true,
  label: 'Örnek veriler',
  refreshedAt: '2026-09-07T00:00:00+03:00',
} as const;

export const stations: Station[] = [
  { id: 'sample-1', slug: 'kanyon-sarj-noktasi', name: 'Kanyon · Şarj noktası', area: 'Levent, Beşiktaş', district: 'Beşiktaş', city: 'İstanbul', citySlug: 'istanbul', operator: 'Zes', type: 'DC', power: 180, sockets: 4, lat: 41.078, lng: 29.01, access: 'Halka açık' },
  { id: 'sample-2', slug: 'zorlu-center-sarj-noktasi', name: 'Zorlu Center · Şarj noktası', area: 'Levazım, Beşiktaş', district: 'Beşiktaş', city: 'İstanbul', citySlug: 'istanbul', operator: 'Eşarj', type: 'DC', power: 120, sockets: 2, lat: 41.067, lng: 29.017, access: 'Halka açık' },
  { id: 'sample-3', slug: 'istinye-sarj-noktasi', name: 'İstinye · Şarj noktası', area: 'Pınar, Sarıyer', district: 'Sarıyer', city: 'İstanbul', citySlug: 'istanbul', operator: 'Trugo', type: 'DC', power: 180, sockets: 4, lat: 41.108, lng: 29.031, access: 'Halka açık' },
  { id: 'sample-4', slug: 'bebek-sarj-noktasi', name: 'Bebek · Şarj noktası', area: 'Bebek, Beşiktaş', district: 'Beşiktaş', city: 'İstanbul', citySlug: 'istanbul', operator: 'Voltrun', type: 'AC', power: 22, sockets: 2, lat: 41.077, lng: 29.043, access: 'Halka açık' },
  { id: 'sample-5', slug: 'nisantasi-sarj-noktasi', name: 'Nişantaşı · Şarj noktası', area: 'Teşvikiye, Şişli', district: 'Şişli', city: 'İstanbul', citySlug: 'istanbul', operator: 'Zes', type: 'AC', power: 22, sockets: 2, lat: 41.051, lng: 28.994, access: 'Halka açık' },
  { id: 'sample-6', slug: 'uskudar-sarj-noktasi', name: 'Üsküdar · Şarj noktası', area: 'Altunizade, Üsküdar', district: 'Üsküdar', city: 'İstanbul', citySlug: 'istanbul', operator: 'Trugo', type: 'DC', power: 180, sockets: 4, lat: 41.027, lng: 29.044, access: 'Halka açık' },
  { id: 'sample-7', slug: 'maslak-sarj-noktasi', name: 'Maslak · Şarj noktası', area: 'Maslak, Sarıyer', district: 'Sarıyer', city: 'İstanbul', citySlug: 'istanbul', operator: 'Eşarj', type: 'DC', power: 120, sockets: 2, lat: 41.115, lng: 29.015, access: 'Halka açık' },
  { id: 'sample-8', slug: 'emirgan-sarj-noktasi', name: 'Emirgan · Şarj noktası', area: 'Emirgan, Sarıyer', district: 'Sarıyer', city: 'İstanbul', citySlug: 'istanbul', operator: 'Voltrun', type: 'AC', power: 22, sockets: 2, lat: 41.105, lng: 29.053, access: 'Özel erişim' },
];
