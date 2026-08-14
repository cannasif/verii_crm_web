export type SalesMapStyle = 'satellite' | 'political';

export interface SalesMapCountryProperties {
  ISO_A2?: string;
  ISO_A2_EH?: string;
  TYPE?: string;
  NAME?: string;
  NAME_EN?: string;
  NAME_TR?: string;
  NAME_DE?: string;
  NAME_FR?: string;
  NAME_ES?: string;
  NAME_IT?: string;
  NAME_AR?: string;
  LABEL_X?: number;
  LABEL_Y?: number;
  LABELRANK?: number;
}

export interface SalesMapCountryFeature {
  type: 'Feature';
  properties: SalesMapCountryProperties;
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
}

export interface SalesMapCountriesGeoJson {
  type: 'FeatureCollection';
  features: SalesMapCountryFeature[];
}

export interface SalesMapCountryLabel {
  code: string;
  name: string;
  longitude: number;
  latitude: number;
  color: string;
}
