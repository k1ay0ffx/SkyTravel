import { Routes } from '@angular/router';
import { Results } from './pages/results/results';
import { FlightDetails } from './pages/flight-details/flight-details';

export const FLIGHTS_ROUTES: Routes = [
  { path: '', component: Results },
  { path: 'results', component: Results },
  { path: ':id', component: FlightDetails }
];