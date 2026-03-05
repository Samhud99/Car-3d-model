export interface CarModel {
  name: string;
  types: string[];
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
  type: string;
  status: string;
  createdAt: string;
}
