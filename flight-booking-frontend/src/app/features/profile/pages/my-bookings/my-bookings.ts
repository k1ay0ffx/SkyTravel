import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BookingService } from '../../../../core/services/booking';
import { Booking, BookingStatus } from '../../../../core/models/booking.model';

@Component({
  selector: 'app-my-bookings',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './my-bookings.html',
  styleUrls: ['./my-bookings.scss']
})
export class MyBookingsComponent implements OnInit {
  bookings: Booking[]  = [];
  loading              = true;
  error                = '';
  cancellingId: number | null = null;
  cancelError          = '';

  readonly STATUS_LABEL: Record<BookingStatus, string> = {
    pending:   'Ожидает оплаты',
    confirmed: 'Подтверждено',
    cancelled: 'Отменено',
    completed: 'Выполнено'
  };

  constructor(private bookingService: BookingService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error   = '';
    this.bookingService.getMyBookings().subscribe({
      next:  (list) => { this.bookings = list; this.loading = false; },
      error: ()     => { this.error = 'Не удалось загрузить бронирования'; this.loading = false; }
    });
  }

  canCancel(b: Booking): boolean {
    return b.status === 'pending' || b.status === 'confirmed';
  }

  cancel(booking: Booking): void {
    if (!confirm(`Отменить рейс ${booking.flight.flight_number}? Возврат средств — до 7 рабочих дней.`)) return;
    this.cancellingId = booking.id;
    this.cancelError  = '';

    this.bookingService.cancelBooking(booking.id).subscribe({
      next:  (res) => {
        booking.status = 'cancelled';
        this.cancellingId = null;
        if (res.refund_amount > 0) {
          alert(`Возврат ${res.refund_amount.toLocaleString('ru-RU')} ₸ будет обработан в течение 7 дней.`);
        }
      },
      error: () => {
        this.cancelError  = 'Ошибка отмены. Попробуйте позже.';
        this.cancellingId = null;
      }
    });
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }

  formatDuration(min: number): string {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${h}ч ${m ? m + 'м' : ''}`.trim();
  }
}