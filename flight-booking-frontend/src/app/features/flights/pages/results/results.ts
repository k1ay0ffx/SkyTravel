import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Flight } from '../../../../core/models/flight.model';

interface StopOption    { label: string; value: number; checked: boolean; count: number; }
interface AirlineOption { name: string; code: string; checked: boolean; minPrice: number; }
interface CalDay        { label: string; date: string; price: number; active: boolean; isCheapest: boolean; }

@Component({
  selector: 'app-results',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, DatePipe],
  templateUrl: './results.html',
  styleUrls: ['./results.scss']
})
export class Results implements OnInit {

  // ── compact bar ──
  fromCity       = 'Алматы';
  toCity         = '';
  dateLabel      = '25 апр 2025';
  passengersLabel = '1 взрослый';

  // ── filters ──
  priceMin    = 0;
  priceMax    = 300000;
  directOnly  = false;
  withBaggage = false;
  refundOnly  = false;
  timeFilter  = '';
  sortBy: 'price' | 'duration' | 'departure' = 'price';
  cabinClass: 'economy' | 'business' = 'economy';

  stopOptions: StopOption[] = [
    { label: 'Без пересадок', value: 0, checked: false, count: 3 },
    { label: '1 пересадка',   value: 1, checked: false, count: 5 },
    { label: '2+ пересадки',  value: 2, checked: false, count: 2 },
  ];

  airlineOptions: AirlineOption[] = [
    { name: 'Air Astana',       code: 'KC', checked: false, minPrice: 42500 },
    { name: 'Turkish Airlines', code: 'TK', checked: false, minPrice: 38000 },
    { name: 'Air Arabia',       code: 'G9', checked: false, minPrice: 35000 },
    { name: 'S7 Airlines',      code: 'S7', checked: false, minPrice: 28500 },
    { name: 'Wizz Air',         code: 'W6', checked: false, minPrice: 31000 },
  ];

  timeOptions = [
    { val: 'morning', label: 'Утро',  icon: '🌅' },
    { val: 'day',     label: 'День',  icon: '☀' },
    { val: 'evening', label: 'Вечер', icon: '🌆' },
    { val: 'night',   label: 'Ночь',  icon: '🌙' },
  ];

  // ── calendar ──
  allCalendar: CalDay[] = [];
  calOffset = 0;
  get visibleCalendar(): CalDay[] { return this.allCalendar.slice(this.calOffset, this.calOffset + 7); }

  // ── state ──
  isLoading       = true;
  allFlights:     Flight[] = [];
  selectedFlightId: number | null = null;
  expandedId:       number | null = null;

  // ── price shortcuts ──
  get minPriceEconomy():  number { return Math.min(...this.allFlights.map(f => f.price_economy),  999999); }
  get minPriceBusiness(): number { return Math.min(...this.allFlights.map(f => f.price_business), 999999); }

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit() {
    this.route.queryParams.subscribe(p => {
      if (p['from']) this.fromCity = p['from'];
      if (p['to'])   this.toCity   = p['to'];
      if (p['date']) this.dateLabel = p['date'];
    });
    this.buildCalendar();
    this.loadFlights();
  }

  private buildCalendar() {
    const labels = ['22 апр','23 апр','24 апр','25 апр','26 апр','27 апр','28 апр','29 апр','30 апр','1 мая','2 мая','3 мая'];
    const prices = [51000,44000,39000,35000,42500,67000,38500,72000,54200,89000,41000,36000];
    const minP   = Math.min(...prices);
    this.allCalendar = labels.map((label, i) => ({
      label, date: label, price: prices[i],
      active: i === 3,
      isCheapest: prices[i] === minP
    }));
  }

  private loadFlights() {
    this.isLoading = true;
    // TODO: replace with FlightService.searchFlights(params)
    setTimeout(() => {
      this.allFlights = MOCK_FLIGHTS;
      this.isLoading  = false;
    }, 900);
  }

  get filteredFlights(): Flight[] {
    let list = [...this.allFlights];

    // price
    list = list.filter(f => f.price_economy >= this.priceMin && f.price_economy <= this.priceMax);

    // stops
    if (this.directOnly) list = list.filter(f => f.stops === 0);
    const activeStops = this.stopOptions.filter(s => s.checked).map(s => s.value);
    if (activeStops.length) list = list.filter(f => activeStops.includes(f.stops));

    // airlines
    const activeAirlines = this.airlineOptions.filter(a => a.checked).map(a => a.code);
    if (activeAirlines.length) list = list.filter(f => activeAirlines.includes(f.airline.iata_code));

    // time
    if (this.timeFilter) {
      list = list.filter(f => {
        const h = new Date(f.departure_time).getHours();
        if (this.timeFilter === 'morning') return h >= 5  && h < 12;
        if (this.timeFilter === 'day')     return h >= 12 && h < 17;
        if (this.timeFilter === 'evening') return h >= 17 && h < 22;
        return h >= 22 || h < 5;
      });
    }

    // sort
    list.sort((a, b) => {
      if (this.sortBy === 'price')     return a.price_economy - b.price_economy;
      if (this.sortBy === 'duration')  return a.duration_minutes - b.duration_minutes;
      return new Date(a.departure_time).getTime() - new Date(b.departure_time).getTime();
    });

    return list;
  }

  formatDuration(min: number): string {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${h}ч ${m}м`;
  }

  selectDay(day: CalDay) {
    this.allCalendar.forEach(d => d.active = false);
    day.active = true;
    this.loadFlights();
  }

  shiftCalendar(dir: number) {
    const next = this.calOffset + dir;
    if (next < 0 || next + 7 > this.allCalendar.length) return;
    this.calOffset = next;
  }

  toggleDetails(id: number) {
    this.expandedId = this.expandedId === id ? null : id;
  }

  viewDetails(flight: Flight) {
    this.router.navigate(['/flights/details', flight.id]);
  }

  selectFlight(flight: Flight) {
    this.selectedFlightId = flight.id;
    setTimeout(() => {
      this.router.navigate(['/booking/extras'], {
        queryParams: { flightId: flight.id, cabin: this.cabinClass }
      });
    }, 250);
  }

  resetFilters() {
    this.priceMin = 0; this.priceMax = 300000;
    this.directOnly = false; this.withBaggage = false; this.refundOnly = false;
    this.timeFilter = '';
    this.stopOptions.forEach(s => s.checked = false);
    this.airlineOptions.forEach(a => a.checked = false);
  }

  goBack() { this.router.navigate(['/']); }
}

// ── mock data ──
const MOCK_FLIGHTS: Flight[] = [
  {
    id: 1, flight_number: 'KC123',
    airline: { id: 1, name: 'Air Astana', iata_code: 'KC' },
    origin:      { id: 1, iata_code: 'ALA', name: 'Алматы', city: 'Алматы', country: 'Казахстан' },
    destination: { id: 2, iata_code: 'DXB', name: 'Дубай Инт.', city: 'Дубай', country: 'ОАЭ' },
    departure_time: '2025-04-25T06:00:00', arrival_time: '2025-04-25T09:30:00',
    duration_minutes: 210, stops: 0,
    price_economy: 42500, price_business: 110000, price_first: 0,
    available_seats_economy: 34, available_seats_business: 8, available_seats_first: 0,
    aircraft_model: 'Boeing 767-300'
  },
  {
    id: 2, flight_number: 'TK892',
    airline: { id: 2, name: 'Turkish Airlines', iata_code: 'TK' },
    origin:      { id: 1, iata_code: 'ALA', name: 'Алматы', city: 'Алматы', country: 'Казахстан' },
    destination: { id: 2, iata_code: 'DXB', name: 'Дубай Инт.', city: 'Дубай', country: 'ОАЭ' },
    departure_time: '2025-04-25T11:00:00', arrival_time: '2025-04-25T18:45:00',
    duration_minutes: 465, stops: 1,
    price_economy: 38000, price_business: 95000, price_first: 0,
    available_seats_economy: 20, available_seats_business: 4, available_seats_first: 0,
    aircraft_model: 'Airbus A321'
  },
  {
    id: 3, flight_number: 'G9441',
    airline: { id: 3, name: 'Air Arabia', iata_code: 'G9' },
    origin:      { id: 1, iata_code: 'ALA', name: 'Алматы', city: 'Алматы', country: 'Казахстан' },
    destination: { id: 2, iata_code: 'DXB', name: 'Дубай Инт.', city: 'Дубай', country: 'ОАЭ' },
    departure_time: '2025-04-25T21:30:00', arrival_time: '2025-04-26T02:15:00',
    duration_minutes: 285, stops: 0,
    price_economy: 35000, price_business: 0, price_first: 0,
    available_seats_economy: 56, available_seats_business: 0, available_seats_first: 0,
    aircraft_model: 'Airbus A320'
  },
  {
    id: 4, flight_number: 'S7 722',
    airline: { id: 4, name: 'S7 Airlines', iata_code: 'S7' },
    origin:      { id: 1, iata_code: 'ALA', name: 'Алматы', city: 'Алматы', country: 'Казахстан' },
    destination: { id: 2, iata_code: 'DXB', name: 'Дубай Инт.', city: 'Дубай', country: 'ОАЭ' },
    departure_time: '2025-04-25T14:00:00', arrival_time: '2025-04-25T20:30:00',
    duration_minutes: 390, stops: 1,
    price_economy: 31000, price_business: 82000, price_first: 0,
    available_seats_economy: 28, available_seats_business: 6, available_seats_first: 0,
    aircraft_model: 'Boeing 737-800'
  },
];