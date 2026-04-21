import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { Extra, ExtraType } from '../../../../core/models/extras.model';
import { BookingStateService } from '../../../../core/services/booking-state';
import { FlightRoute } from '../../../../core/models/flight.model';
import { take } from 'rxjs';

interface ExtraWithMeta extends Extra {
  icon: string;
  selected: boolean;
}

const EXTRA_ICONS: Record<ExtraType, string> = {
  baggage: '🧳', meal: '🍽️', insurance: '🛡️', carry_on: '👜'
};

const MOCK_EXTRAS: Extra[] = [
  { id: 1, type: 'baggage',   name: 'Доп. багаж 23 кг',      description: 'Дополнительное место багажа весом до 23 кг', price: 5000 },
  { id: 2, type: 'baggage',   name: 'Доп. багаж 32 кг',       description: 'Тяжёлый багаж до 32 кг',                    price: 8000 },
  { id: 3, type: 'carry_on',  name: 'Ручная кладь 10 кг',     description: 'Дополнительная ручная кладь до 10 кг',       price: 2500 },
  { id: 4, type: 'meal',      name: 'Стандартное питание',     description: 'Горячее питание на борту',                   price: 2500 },
  { id: 5, type: 'meal',      name: 'Вегетарианское меню',     description: 'Вегетарианское питание на борту',            price: 2500 },
  { id: 6, type: 'insurance', name: 'Базовая страховка',       description: 'Страхование от задержки и отмены рейса',     price: 2000 },
  { id: 7, type: 'insurance', name: 'Расширенная страховка',   description: 'Полное страхование путешественника',         price: 5000 },
];

@Component({
  selector: 'app-extras',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './extras.html',
  styleUrls: ['./extras.scss']
})
export class ExtrasComponent implements OnInit {
  extras: ExtraWithMeta[] = [];

  // Данные маршрута для отображения в шапке
  routeData: FlightRoute | null = null;

  readonly TYPE_LABEL: Record<ExtraType, string> = {
    baggage: 'Багаж', carry_on: 'Ручная кладь', meal: 'Питание', insurance: 'Страховка'
  };
  readonly CATEGORIES: ExtraType[] = ['baggage', 'carry_on', 'meal', 'insurance'];

  constructor(
    private router:       Router,
    private route:        ActivatedRoute,
    private bookingState: BookingStateService
  ) {}

  ngOnInit(): void {
  this.route.queryParams.pipe(take(1)).subscribe(p => {
    if (p['flightId']) {
      this.bookingState.setFlight(+p['flightId'], p['cabin'] ?? 'economy');
    }
  });

  // Читаем routeData из sessionStorage (туда сохраняет results.ts)
  const stored = sessionStorage.getItem('selectedRoute');
  if (stored) {
    try { this.routeData = JSON.parse(stored); } catch {}
  }

  this.extras = MOCK_EXTRAS.map(e => ({
    ...e, icon: EXTRA_ICONS[e.type], selected: false
  }));
}

  byCategory(type: ExtraType): ExtraWithMeta[] {
    return this.extras.filter(e => e.type === type);
  }

  toggle(extra: ExtraWithMeta): void { extra.selected = !extra.selected; }

  get selectedExtras(): ExtraWithMeta[]  { return this.extras.filter(e => e.selected); }
  get totalExtrasPrice(): number         { return this.selectedExtras.reduce((s, e) => s + e.price, 0); }

  continue(): void {
    this.bookingState.setExtras(this.selectedExtras.map(e => e.id));
    this.router.navigate(['/booking/checkout']);
  }

  skip(): void {
    this.bookingState.setExtras([]);
    this.router.navigate(['/booking/checkout']);
  }
}