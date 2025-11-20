export type FilterType = 'normal' | 'bw' | 'sepia' | 'warm' | 'cool';

export interface PhotoData {
  id: string;
  url: string;
  timestamp: number;
  x: number;
  y: number;
  rotation: number;
  isDeveloping: boolean;
  caption?: string;
  filterType: FilterType;
}

export interface Coordinates {
  x: number;
  y: number;
}

export interface Dimensions {
  width: number;
  height: number;
}