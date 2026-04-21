import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FlightRoute, RouteSearchParams } from '../../../../core/models/flight.model';
import { FlightService } from '../../../../core/services/flight';
import { take } from 'rxjs/operators';

interface StopOption { label: string; value: number; checked: boolean; count: number; }
interface CalDay     { label: string; date: string; price: number; active: boolean; isCheapest: boolean; }

@Component({
  selector: 'app-results',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './results.html',
  styleUrls: ['./results.scss']
})
export class Results implements OnInit {

  // Добавить в начало класса:
// results.ts - CITY_MAP
private readonly CITY_MAP: Record<string, string> = {
  'Алматы':   'Almaty',
  'Астана':   'Astana',
  'Москва':   'Moscow',
  'Стамбул':  'Istanbul',
  'Дубай':    'Dubai',
  'Лондон':   'London',
  'Франкфурт':'Frankfurt',
  'Париж':    'Paris',
  'Пекин':    'Beijing',
  'Нью-Йорк': 'New York',
};

private toIATA(city: string): string {
  return this.CITY_MAP[city] ?? city;
}

  // ── compact bar ──
  fromCity        = '';
  toCity          = '';
  dateLabel       = '';
  passengersLabel = '1 взрослый';

  // ── filters ──
  priceMin   = 0;
  priceMax   = 1000000;
  directOnly = false;
  timeFilter = '';
  sortBy: 'price' | 'duration' | 'departure' = 'price';

  stopOptions: StopOption[] = [
    { label: 'Без пересадок', value: 0, checked: false, count: 0 },
    { label: '1 пересадка',   value: 1, checked: false, count: 0 },
    { label: '2+ пересадки',  value: 2, checked: false, count: 0 },
  ];

  timeOptions = [
    { val: 'morning', label: 'Утро',  icon: '🌅' },
    { val: 'day',     label: 'День',  icon: '☀' },
    // { val: 'evening', label: 'Вечер', icon: '🌆' },
    { val: 'night',   label: 'Ночь',  icon: '🌙' },
  ];

  // ── calendar ──
  allCalendar: CalDay[] = [];
  calOffset = 0;
  get visibleCalendar(): CalDay[] { return this.allCalendar.slice(this.calOffset, this.calOffset + 7); }

  // ── state ──
  isLoading     = true;
  errorMsg      = '';
  allRoutes:    FlightRoute[] = [];
  selectedIndex: number | null = null;
  expandedIndex: number | null = null;

  get minPrice(): number { return Math.min(...this.allRoutes.map(r => r.total_price), 999999); }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private flightService: FlightService
  ) {}

  private searchDone = false;

ngOnInit() {
  this.route.queryParams.pipe(take(1)).subscribe(p => {
    if (this.searchDone) return;
    this.searchDone = true;

    this.fromCity  = p['from'] || '';
    this.toCity    = p['to']   || '';
    this.dateLabel = p['date'] || new Date().toISOString().split('T')[0];

    if (!this.fromCity || !this.toCity) {
      this.errorMsg  = 'Укажите откуда и куда летите';
      this.isLoading = false;
      return;
    }

    this.buildCalendar();
    this.loadRoutes();
  });
}

  private buildCalendar() {
    // Генерируем 12 дней вокруг выбранной даты
    const base = this.dateLabel ? new Date(this.dateLabel) : new Date();
    const prices = [51000,44000,39000,35000,42500,67000,38500,72000,54200,89000,41000,36000];
    const minP = Math.min(...prices);
    this.allCalendar = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(base);
      d.setDate(d.getDate() - 3 + i);
      return {
        label: d.toLocaleDateString('ru', { day: 'numeric', month: 'short' }),
        date: d.toISOString().split('T')[0],
        price: prices[i],
        active: i === 3,
        isCheapest: prices[i] === minP
      };
    });
  }

  loadRoutes() {
  this.isLoading = true;
  this.errorMsg  = '';

  const params: RouteSearchParams = {
  origin:      this.toIATA(this.fromCity),
  destination: this.toIATA(this.toCity),
  date:        this.dateLabel,
  max_stops:   2,
  prefer_price: this.sortBy === 'price'
};  

  console.log('Отправляем в API:', params);

  this.flightService.searchRoutes(params).subscribe({
    next: (res) => {
      this.allRoutes = res;
      this.updateStopCounts(); // 👈 вызываем здесь
      this.isLoading = false;
    },
    error: (err) => {
      console.error(err);
      this.errorMsg = 'Ошибка загрузки';
      this.isLoading = false;
      }
    });
  }

    private updateStopCounts() {
    this.stopOptions[0].count = this.allRoutes.filter(r => r.flights_from_db.length === 1).length;
    this.stopOptions[1].count = this.allRoutes.filter(r => r.flights_from_db.length === 2).length;
    this.stopOptions[2].count = this.allRoutes.filter(r => r.flights_from_db.length  > 2).length;
  }

  get filteredRoutes(): FlightRoute[] {
    let list = [...this.allRoutes];

    list = list.filter(r => r.total_price >= this.priceMin && r.total_price <= this.priceMax);

    if (this.directOnly) list = list.filter(r => r.flights_from_db.length === 1);

    const activeStops = this.stopOptions.filter(s => s.checked).map(s => s.value);
    if (activeStops.length) {
      list = list.filter(r => {
        const stops = r.flights_from_db.length - 1;
        return activeStops.includes(stops >= 2 ? 2 : stops);
      });
    }

    if (this.timeFilter) {
      list = list.filter(r => {
        const h = new Date(r.departure_datetime.replace(' ', 'T')).getHours();
        if (this.timeFilter === 'morning') return h >= 5  && h < 12;
        if (this.timeFilter === 'day')     return h >= 12 && h < 17;
        if (this.timeFilter === 'evening') return h >= 17 && h < 22;
        return h >= 22 || h < 5;
      });
    }

    list.sort((a, b) => {
      if (this.sortBy === 'duration')  return a.total_duration_hours - b.total_duration_hours;
      if (this.sortBy === 'departure') return a.departure_datetime.localeCompare(b.departure_datetime);
      return a.total_price - b.total_price;
    });

    return list;
  }

  formatDuration(hours: number): string {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h}ч ${m}м` : `${h}ч`;
  }

  stopsLabel(route: FlightRoute): string {
    const n = route.flights_from_db.length - 1;
    if (n === 0) return 'Прямой';
    if (n === 1) return '1 пересадка';
    return `${n} пересадки`;
  }

  selectDay(day: CalDay) {
    this.allCalendar.forEach(d => d.active = false);
    day.active    = true;
    this.dateLabel = day.date;
    this.loadRoutes();
  }

  shiftCalendar(dir: number) {
    const next = this.calOffset + dir;
    if (next < 0 || next + 7 > this.allCalendar.length) return;
    this.calOffset = next;
  }

  toggleDetails(i: number) {
    this.expandedIndex = this.expandedIndex === i ? null : i;
  }

  selectRoute(route: FlightRoute, i: number) {
  this.selectedIndex = i;
  const firstId = route.flights_from_db[0].database_flight_id;

  sessionStorage.setItem('selectedRoute', JSON.stringify(route));

  setTimeout(() => {
    this.router.navigate(['/booking/extras'], {
      queryParams: { flightId: firstId }
    });
  }, 250);
}

  // Добавить в начало класса (поля для редактирования):
isEditingSearch = false;
editFrom        = '';
editTo          = '';
editDate        = '';
editPassengers  = 1;

openEdit() {
  this.editFrom       = this.fromCity;
  this.editTo         = this.toCity;
  this.editDate       = this.dateLabel;
  this.editPassengers = 1;
  this.isEditingSearch = true;
}


get today(): string {
  return new Date().toISOString().split('T')[0];
}

swapCities() {
  [this.editFrom, this.editTo] = [this.editTo, this.editFrom];
}
applyEdit() {
  if (!this.editFrom || !this.editTo) return;
  this.fromCity  = this.editFrom;
  this.toCity    = this.editTo;
  this.dateLabel = this.editDate || this.dateLabel;
  this.passengersLabel = `${this.editPassengers} взросл${this.editPassengers === 1 ? 'ый' : this.editPassengers < 5 ? 'ых' : 'ых'}`;
  this.isEditingSearch = false;
  this.buildCalendar();
  this.loadRoutes();
}

  resetFilters() {
    this.priceMin  = 0;
    this.priceMax  = 1000000;
    this.directOnly = false;
    this.timeFilter = '';
    this.stopOptions.forEach(s => s.checked = false);
  }

  goBack() { this.router.navigate(['/']); }
}

