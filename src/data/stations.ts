import source from '../../data/stations.json';

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

import { buildDistrictGroups, buildNearbyIndex } from '../lib/station-guides.mjs';
export const districtGroups = buildDistrictGroups(stations);
const districtsByStation = new Map(districtGroups.flatMap((group) => group.stations.map((station) => [station.id, group])));
export const stationDistrict = (station: Station) => districtsByStation.get(station.id);
export const nearbyStations = buildNearbyIndex(stations);
