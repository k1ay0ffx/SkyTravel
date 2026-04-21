import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  Flight, FlightSearchParams, Airport,
  FlightRoute, RouteSearchParams, RouteSearchResponse
} from '../models/flight.model';

const AIRPORTS: Airport[] = [
  { id: 1, iata_code: 'ALA', name: 'Международный аэропорт Алматы', city: 'Алматы',     country: 'Казахстан' },
  { id: 2, iata_code: 'NQZ', name: 'Аэропорт Астана',               city: 'Астана',     country: 'Казахстан' },
  { id: 3, iata_code: 'SVO', name: 'Шереметьево',                   city: 'Москва',     country: 'Россия' },
  { id: 4, iata_code: 'DXB', name: 'Dubai International',           city: 'Дубай',      country: 'ОАЭ' },
  { id: 5, iata_code: 'IST', name: 'Стамбул Аэропорт',              city: 'Стамбул',    country: 'Турция' },
  { id: 6, iata_code: 'LHR', name: 'Heathrow',                      city: 'Лондон',     country: 'Великобритания' },
  { id: 7, iata_code: 'FRA', name: 'Франкфурт',                     city: 'Франкфурт',  country: 'Германия' },
  { id: 8, iata_code: 'BKK', name: 'Суварнабхуми',                  city: 'Бангкок',    country: 'Таиланд' },
];

const MOCK_FLIGHTS: Flight[] = [
  {
    id: 1, flight_number: 'KC123',
    airline: { id: 1, name: 'Air Astana', iata_code: 'KC' },
    origin: AIRPORTS[0], destination: AIRPORTS[2],
    departure_time: '2025-06-15T06:00:00', arrival_time: '2025-06-15T09:30:00',
    duration_minutes: 210, stops: 0,
    price_economy: 45000, price_business: 120000, price_first: 200000,
    available_seats_economy: 45, available_seats_business: 12, available_seats_first: 4,
    aircraft_model: 'Boeing 767-300'
  },
  {
    id: 2, flight_number: 'TK890',
    airline: { id: 4, name: 'Turkish Airlines', iata_code: 'TK' },
    origin: AIRPORTS[0], destination: AIRPORTS[2],
    departure_time: '2025-06-15T10:30:00', arrival_time: '2025-06-15T16:20:00',
    duration_minutes: 350, stops: 1,
    price_economy: 38000, price_business: 95000, price_first: 0,
    available_seats_economy: 80, available_seats_business: 20, available_seats_first: 0,
    aircraft_model: 'Airbus A330-300'
  },
  {
    id: 3, flight_number: 'KC451',
    airline: { id: 1, name: 'Air Astana', iata_code: 'KC' },
    origin: AIRPORTS[0], destination: AIRPORTS[3],
    departure_time: '2025-06-15T14:00:00', arrival_time: '2025-06-15T17:45:00',
    duration_minutes: 225, stops: 0,
    price_economy: 52000, price_business: 145000, price_first: 250000,
    available_seats_economy: 28, available_seats_business: 8, available_seats_first: 2,
    aircraft_model: 'Boeing 757-200'
  },
  {
    id: 4, flight_number: 'DV204',
    airline: { id: 3, name: 'FlyArystan', iata_code: 'DV' },
    origin: AIRPORTS[0], destination: AIRPORTS[1],
    departure_time: '2025-06-15T08:00:00', arrival_time: '2025-06-15T09:15:00',
    duration_minutes: 75, stops: 0,
    price_economy: 12000, price_business: 28000, price_first: 0,
    available_seats_economy: 120, available_seats_business: 16, available_seats_first: 0,
    aircraft_model: 'Airbus A320'
  },
  {
    id: 5, flight_number: 'KC789',
    airline: { id: 1, name: 'Air Astana', iata_code: 'KC' },
    origin: AIRPORTS[0], destination: AIRPORTS[4],
    departure_time: '2025-06-15T22:00:00', arrival_time: '2025-06-16T02:30:00',
    duration_minutes: 270, stops: 0,
    price_economy: 61000, price_business: 160000, price_first: 280000,
    available_seats_economy: 34, available_seats_business: 14, available_seats_first: 6,
    aircraft_model: 'Boeing 787-9'
  },
];

const MOCK_ROUTES: FlightRoute[] = [
  {
    route_type: 'Прямой',
    total_price: 45000,
    total_duration_hours: 3.5,
    departure_datetime: '2025-06-15 06:00',
    arrival_datetime: '2025-06-15 09:30',
    flights_from_db: [
      {
        segment_number: 1,
        database_flight_id: 1,
        origin_city: 'Almaty',
        destination_city: 'Moscow',
        departure_time: '2025-06-15 06:00',
        arrival_time: '2025-06-15 09:30',
        price_tenge: 45000,
        airplane_model: 'Boeing 767-300',
      }
    ]
  },
  {
    route_type: '1 пересадка',
    total_price: 38000,
    total_duration_hours: 7.5,
    departure_datetime: '2025-06-15 10:30',
    arrival_datetime: '2025-06-15 18:00',
    flights_from_db: [
      {
        segment_number: 1,
        database_flight_id: 2,
        origin_city: 'Almaty',
        destination_city: 'Istanbul',
        departure_time: '2025-06-15 10:30',
        arrival_time: '2025-06-15 14:00',
        price_tenge: 20000,
        airplane_model: 'Airbus A321',
      },
      {
        segment_number: 2,
        database_flight_id: 3,
        origin_city: 'Istanbul',
        destination_city: 'Moscow',
        departure_time: '2025-06-15 15:30',
        arrival_time: '2025-06-15 18:00',
        price_tenge: 18000,
        airplane_model: 'Airbus A320',
        layover_time_hours: 1.5,
      }
    ]
  },
];

@Injectable({ providedIn: 'root' })
export class FlightService {
  constructor(private http: HttpClient) {}

  getAirports(): Observable<Airport[]> {
    if (environment.useMock) return of(AIRPORTS).pipe(delay(200));
    return this.http.get<Airport[]>(`${environment.apiUrl}/flights/airports/`);
  }

  // Старый метод — оставлен для обратной совместимости с компонентами на моках
  searchFlights(params: FlightSearchParams): Observable<Flight[]> {
    if (environment.useMock) {
      const filtered = MOCK_FLIGHTS.filter(f =>
        (f.origin.iata_code === params.origin || params.origin === '') &&
        (f.destination.iata_code === params.destination || params.destination === '')
      );
      return of(filtered.length ? filtered : MOCK_FLIGHTS).pipe(delay(800));
    }
    const httpParams = new HttpParams({ fromObject: params as any });
    return this.http.get<Flight[]>(`${environment.apiUrl}/flights/search/`, { params: httpParams });
  }

  // Новый метод для реального API
  searchRoutes(params: RouteSearchParams): Observable<FlightRoute[]> {
    if (environment.useMock) {
      return of(MOCK_ROUTES).pipe(delay(800));
    }
    return this.http
      .post<RouteSearchResponse>(`${environment.apiUrl}/routes/search/`, params)
      .pipe(map(r => r.routes));
  }

  getFlightById(id: number): Observable<Flight> {
    if (environment.useMock) {
      const flight = MOCK_FLIGHTS.find(f => f.id === id) ?? MOCK_FLIGHTS[0];
      return of(flight).pipe(delay(300));
    }
    return this.http.get<Flight>(`${environment.apiUrl}/flights/${id}/`);
  }
}