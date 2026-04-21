import { Routes } from '@angular/router';

export const BOOKINGS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./bookings').then(m => m.BookingsComponent)
  },
  // Добавляем этот путь, чтобы роутер понимал URL вида /bookings/123
  {
    path: ':id', 
    loadComponent: () =>
      import('./bookings').then(m => m.BookingsComponent) 
      // Если будет отдельная страница деталей, замени импорт выше на неё
  }
];