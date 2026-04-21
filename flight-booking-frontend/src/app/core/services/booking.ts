import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  Booking, CreateBookingRequest,
  PaymentRequest, PaymentResponse, CancelBookingResponse
} from '../models/booking.model';
// import { BookingStateService } from './booking-state';
import { Extra, ExtraType } from '../models/extras.model';

const MOCK_BOOKINGS: Booking[] = [
  {
    id: 1, booking_reference: 'ST-2025-001', status: 'confirmed',
    flight: {
      id: 1, flight_number: 'KC123',
      airline: { id: 1, name: 'Air Astana', iata_code: 'KC' },
      origin: { id: 1, iata_code: 'ALA', name: 'Алматы', city: 'Алматы', country: 'Казахстан' },
      destination: { id: 3, iata_code: 'SVO', name: 'Шереметьево', city: 'Москва', country: 'Россия' },
      departure_time: '2025-06-15T06:00:00', arrival_time: '2025-06-15T09:30:00',
      duration_minutes: 210, stops: 0,
      price_economy: 45000, price_business: 120000, price_first: 200000,
      available_seats_economy: 45, available_seats_business: 12, available_seats_first: 4,
      aircraft_model: 'Boeing 767-300'
    },
    seat_numbers: ['15A'],
    passengers: [{
      first_name: 'Александр', last_name: 'Смирнов',
      date_of_birth: '1990-05-15', passport_number: 'N1234567',
      passport_expiry: '2030-05-15', nationality: 'KZ'
    }],
    extras: [{ id: 1, type: 'baggage', name: 'Багаж 23 кг', description: '', price: 5000 }],
    total_price: 50000, cabin_class: 'economy',
    created_at: '2025-05-01T10:00:00'
  }
];

@Injectable({ providedIn: 'root' })
export class BookingService {
  constructor(private http: HttpClient) {}

  createBooking(request: CreateBookingRequest): Observable<Booking> {
    if (environment.useMock) {
      const booking: Booking = {
        id: Date.now(), booking_reference: `ST-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`,
        status: 'pending', flight: {} as any, seat_numbers: [],
        passengers: request.passengers, extras: [], total_price: 0,
        cabin_class: request.cabin_class, created_at: new Date().toISOString()
      };
      return of(booking).pipe(delay(600));
    }
    return this.http.post<Booking>(`${environment.apiUrl}/bookings/`, request);
  }

  getMyBookings(): Observable<Booking[]> {
    if (environment.useMock) return of(MOCK_BOOKINGS).pipe(delay(500));
    return this.http.get<Booking[]>(`${environment.apiUrl}/bookings/`);
  }

  getBookingById(id: number): Observable<Booking> {
    if (environment.useMock) {
      return of(MOCK_BOOKINGS[0]).pipe(delay(300));
    }
    return this.http.get<Booking>(`${environment.apiUrl}/bookings/${id}/`);
  }

  processPayment(request: PaymentRequest): Observable<PaymentResponse> {
    if (environment.useMock) {
      const resp: PaymentResponse = {
        success: true,
        transaction_id: `TXN-${Date.now()}`,
        booking_reference: `ST-2025-${Math.floor(Math.random() * 9000 + 1000)}`,
        message: 'Оплата прошла успешно'
      };
      return of(resp).pipe(delay(1500));
    }
    return this.http.post<PaymentResponse>(`${environment.apiUrl}/payments/`, request);
  }

  cancelBooking(id: number): Observable<CancelBookingResponse> {
    if (environment.useMock) {
      return of({ success: true, refund_amount: 40000, message: 'Бронирование отменено, возврат в течение 5-7 дней' }).pipe(delay(600));
    }
    return this.http.put<CancelBookingResponse>(`${environment.apiUrl}/bookings/${id}/cancel/`, {});
  }
}