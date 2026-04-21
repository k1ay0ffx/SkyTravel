import { Routes } from '@angular/router';

export const BOOKING_ROUTES: Routes = [
  {
    path: 'extras',
    loadComponent: () =>
      import('./pages/extras/extras').then(m => m.ExtrasComponent)
  },
  {
    path: 'checkout',
    loadComponent: () =>
      import('./pages/checkout/checkout').then(m => m.CheckoutComponent)
  },
  {
    path: 'confirmation',
    loadComponent: () =>
      import('./pages/confirmation/confirmation').then(m => m.ConfirmationComponent)
  }
];