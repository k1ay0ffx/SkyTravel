import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Flight, FlightSearchParams } from '../../core/models/flight.model';
import { FlightCardComponent } from '../../shared/components/flight-card/flight-card';

interface StopOption  { label: string; value: number; checked: boolean; count: number; }
interface AirlineOption { name: string; code: string; checked: boolean; minPrice: number; }
interface CalendarDay  { label: string; date: string; price: number; active: boolean; }

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, FlightCardComponent],
  templateUrl: './search.html',
  styleUrls: ['./search.scss']
})
export class SearchComponent implements OnInit {

  // ── compact bar ──
  fromCity = 'Алматы';
  toCity   = '';
  dateRange = '25 апр — 5 мая';
  passengers = '1 взрослый';

  // ── filters ──
  priceMin = 0;
  priceMax = 300000;
  sortBy: 'price' | 'duration' | 'departure' = 'price';
  timeFilter = '';
  withBaggage  = false;
  refundableOnly = false;
  selectedFlightId: number | null = null;

  stopOptions: StopOption[] = [
    { label: 'Без пересадок', value: 0, checked: false, count: 4 },
    { label: '1 пересадка',   value: 1, checked: false, count: 6 },
    { label: '2+ пересадки',  value: 2, checked: false, count: 2 },
  ];

  airlineOptions: AirlineOption[] = [
    { name: 'Air Astana',       code: 'KC', checked: false, minPrice: 42000 },
    { name: 'Turkish Airlines', code: 'TK', checked: false, minPrice: 38000 },
    { name: 'Air Arabia',       code: 'G9', checked: false, minPrice: 35000 },
    { name: 'S7 Airlines',      code: 'S7', checked: false, minPrice: 28000 },
    { name: 'Wizz Air',         code: 'W6', checked: false, minPrice: 31000 },
  ];

  calendarDays: CalendarDay[] = [];
  isLoading = false;
  allFlights: Flight[] = [];

  // ── mock data ──
  private mockFlights: Flight[] = [
    {
      id: 1, flight_number: 'KC123',
      airline: { id: 1, name: 'Air Astana', iata_code: 'KC' },
      origin:      { id: 1, iata_code: 'ALA', name: 'Алматы',      city: 'Алматы',   country: 'Казахстан' },
      destination: { id: 2, iata_code: 'DXB', name: 'Дубай',       city: 'Дубай',    country: 'ОАЭ' },
      departure_time: '2025-04-25T06:00:00', arrival_time: '2025-04-25T10:30:00',
      duration_minutes: 270, stops: 0,
      price_economy: 42500, price_business: 110000, price_first: 0,
      available_seats_economy: 34, available_seats_business: 8, available_seats_first: 0,
      aircraft_model: 'Boeing 767-300'
    },
    {
      id: 2, flight_number: 'TK892',
      airline: { id: 2, name: 'Turkish Airlines', iata_code: 'TK' },
      origin:      { id: 1, iata_code: 'ALA', name: 'Алматы',      city: 'Алматы',   country: 'Казахстан' },
      destination: { id: 2, iata_code: 'DXB', name: 'Дубай',       city: 'Дубай',    country: 'ОАЭ' },
      departure_time: '2025-04-25T11:00:00', arrival_time: '2025-04-25T18:45:00',
      duration_minutes: 465, stops: 1,
      price_economy: 38000, price_business: 95000, price_first: 0,
      available_seats_economy: 20, available_seats_business: 4, available_seats_first: 0,
      aircraft_model: 'Airbus A321'
    },
    {
      id: 3, flight_number: 'G9441',
      airline: { id: 3, name: 'Air Arabia', iata_code: 'G9' },
      origin:      { id: 1, iata_code: 'ALA', name: 'Алматы',      city: 'Алматы',   country: 'Казахстан' },
      destination: { id: 2, iata_code: 'DXB', name: 'Дубай',       city: 'Дубай',    country: 'ОАЭ' },
      departure_time: '2025-04-25T21:30:00', arrival_time: '2025-04-26T02:15:00',
      duration_minutes: 285, stops: 0,
      price_economy: 35000, price_business: 0, price_first: 0,
      available_seats_economy: 56, available_seats_business: 0, available_seats_first: 0,
      aircraft_model: 'Airbus A320'
    },
    {
      id: 4, flight_number: 'S7 722',
      airline: { id: 4, name: 'S7 Airlines', iata_code: 'S7' },
      origin:      { id: 1, iata_code: 'ALA', name: 'Алматы',      city: 'Алматы',   country: 'Казахстан' },
      destination: { id: 3, iata_code: 'SVO', name: 'Москва',      city: 'Москва',   country: 'Россия' },
      departure_time: '2025-04-25T07:30:00', arrival_time: '2025-04-25T10:10:00',
      duration_minutes: 220, stops: 0,
      price_economy: 28500, price_business: 75000, price_first: 0,
      available_seats_economy: 40, available_seats_business: 6, available_seats_first: 0,
      aircraft_model: 'Boeing 737-800'
    },
    {
      id: 5, flight_number: 'W6 5511',
      airline: { id: 5, name: 'Wizz Air', iata_code: 'W6' },
      origin:      { id: 1, iata_code: 'ALA', name: 'Алматы',      city: 'Алматы',   country: 'Казахстан' },
      destination: { id: 4, iata_code: 'FCO', name: 'Рим Фьюмичино', city: 'Рим',   country: 'Италия' },
      departure_time: '2025-04-30T14:00:00', arrival_time: '2025-04-30T19:30:00',
      duration_minutes: 390, stops: 1,
      price_economy: 54200, price_business: 0, price_first: 0,
      available_seats_economy: 18, available_seats_business: 0, available_seats_first: 0,
      aircraft_model: 'Airbus A320neo'
    },
  ];

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['from']) this.fromCity = params['from'];
      if (params['to'])   this.toCity   = params['to'];
    });

    this.buildCalendar();
    this.loadFlights();
  }

  private buildCalendar() {
    const days = ['25 апр', '26 апр', '27 апр', '28 апр', '29 апр', '30 апр', '1 мая', '2 мая', '3 мая', '4 мая'];
    const prices = [42500, 38000, 51000, 35000, 44000, 67000, 38500, 42000, 89000, 54200];
    this.calendarDays = days.map((d, i) => ({
      label: d, date: d, price: prices[i], active: i === 0
    }));
  }

  private loadFlights() {
    this.isLoading = true;
    setTimeout(() => {
      this.allFlights = this.mockFlights;
      this.isLoading = false;
    }, 800);
  }

  get filteredFlights(): Flight[] {
    let result = [...this.allFlights];

    // price filter
    result = result.filter(f => f.price_economy >= this.priceMin && f.price_economy <= this.priceMax);

    // stops filter
    const checkedStops = this.stopOptions.filter(s => s.checked).map(s => s.value);
    if (checkedStops.length > 0) {
      result = result.filter(f => checkedStops.includes(f.stops));
    }

    // airline filter
    const checkedAirlines = this.airlineOptions.filter(a => a.checked).map(a => a.code);
    if (checkedAirlines.length > 0) {
      result = result.filter(f => checkedAirlines.includes(f.airline.iata_code));
    }

    // baggage filter (mock: flights with id 1,4 have baggage)
    if (this.withBaggage) {
      result = result.filter(f => [1, 4].includes(f.id));
    }

    // sort
    if (this.sortBy === 'price')     result.sort((a, b) => a.price_economy - b.price_economy);
    if (this.sortBy === 'duration')  result.sort((a, b) => a.duration_minutes - b.duration_minutes);
    if (this.sortBy === 'departure') result.sort((a, b) =>
      new Date(a.departure_time).getTime() - new Date(b.departure_time).getTime()
    );

    return result;
  }

  selectDay(day: CalendarDay) {
    this.calendarDays.forEach(d => d.active = false);
    day.active = true;
  }

  resetFilters() {
    this.priceMin = 0;
    this.priceMax = 300000;
    this.stopOptions.forEach(s => s.checked = false);
    this.airlineOptions.forEach(a => a.checked = false);
    this.withBaggage = false;
    this.refundableOnly = false;
    this.timeFilter = '';
  }

  onFlightSelected(flight: Flight) {
    this.selectedFlightId = flight.id;
    setTimeout(() => {
      this.router.navigate(['/seat-selection'], {
        queryParams: { flightId: flight.id }
      });
    }, 300);
  }
}