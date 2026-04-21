// import { Routes } from '@angular/router';

// // Импортируем компоненты из их папок
// import { HomeComponent } from './shared/components/home/home.component'; 
// import { SearchComponent } from './features/search/search';
// import { SeatSelectionComponent } from './shared/components/seat/seat';
// // import { FlightsComponent } from './features/flights/FlightDetails';

// export const routes: Routes = [
//   { path: '', component: HomeComponent },
//   { path: 'search', component: SearchComponent },
//   { path: 'seat-selection', component: SeatSelectionComponent },
// //   { path: 'flights', component: FlightsComponent },
// ];

// // import { Routes } from '@angular/router';

// // export const routes: Routes = [
// //   {
// //     path: '',
// //     loadComponent: () =>
// //       import('./features/home/pages/home').then(m => m.Home)
// //   },
// //   {
// //     path: 'auth',
// //     loadChildren: () =>
// //       import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES)
// //   },
// //   {
// //     path: 'flights',
// //     loadChildren: () =>
// //       import('./features/flights/flights.routes').then(m => m.FLIGHTS_ROUTES)
// //   },
// //   {
// //     path: 'booking',
// //     loadChildren: () =>
// //       import('./features/booking/booking.routes').then(m => m.BOOKING_ROUTES)
// //   },
// //   {
// //     path: 'checkout',
// //     loadChildren: () =>
// //       import('./features/checkout/checkout.routes').then(m => m.CHECKOUT_ROUTES)
// //   },
// //   {
// //     path: 'profile',
// //     loadChildren: () =>
// //       import('./features/profile/profile.routes').then(m => m.PROFILE_ROUTES)
// //   },
// //   {
// //     path: 'search',
// //     loadChildren: () =>
// //       import('./features/search/search.routes').then(m => m.SEARCH_ROUTES)
// //   },
// //   {
// //     path: 'seat-selection',
// //     loadChildren: () =>
// //       import('./features/seat-selection/seat-selection.routes').then(
// //         m => m.SEAT_SELECTION_ROUTES
// //       )
// //   },
// //   {
// //     path: '**',
// //     redirectTo: ''
// //   }
// // ];

import { Routes } from '@angular/router';
import { HomeComponent } from './shared/components/home/home.component';
import { SearchComponent } from './features/search/search';
import { SeatSelectionComponent } from './shared/components/seat/seat';
import { authGuard } from './core/guards/auth-guard';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'search', component: SearchComponent },
  { path: 'seat-selection', component: SeatSelectionComponent },

  {
    path: 'auth',
    loadChildren: () =>
      import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES)
  },
  {
    path: 'flights',
    loadChildren: () =>
      import('./features/flights/flights.routes').then(m => m.FLIGHTS_ROUTES)
  },
  {
    path: 'bookings',
    // canActivate: [authGuard],
    loadChildren: () =>
      import('./features/bookings/bookings.routes').then(m => m.BOOKINGS_ROUTES)
  },
  {
    path: 'booking',
    // canActivate: [authGuard],
    loadChildren: () =>
      import('./features/booking/booking.routes').then(m => m.BOOKING_ROUTES)
  },
  {
    path: 'checkout',
    // canActivate: [authGuard],
    loadChildren: () =>
      import('./features/checkout/checkout.routes').then(m => m.CHECKOUT_ROUTES)
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/profile/profile.routes').then(m => m.PROFILE_ROUTES)
  },

  { path: '**', redirectTo: '' }
];