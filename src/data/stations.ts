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

export const dataset = source.meta;
export const stations = source.stations as Station[];
import source from '../../data/stations.sample.json';
