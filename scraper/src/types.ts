export interface CarModel {
  name: string;
  types: string[];
}

export interface CarMake {
  make: string;
  models: CarModel[];
}
