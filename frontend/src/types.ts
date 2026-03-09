export interface CarModel {
  name: string;
  years: number[];
  types: string[];
  subtypes: string[];
}

export interface CarMake {
  make: string;
  models: CarModel[];
}

export interface CarsData {
  updated: string;
  source: string;
  cars: CarMake[];
}

export interface Job {
  id: string;
  make: string;
  model: string;
  year: number;
  type: string;
  subtype: string;
  color: string;
  status: string;
  createdAt: string;
  result?: string;
}
