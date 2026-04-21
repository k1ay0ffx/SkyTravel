import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { Booking, BookingStatus } from 'src/app/core/models/booking.model';
import { BookingService } from 'src/app/core/services/booking';

@Component({
  selector: 'app-bookings',
  standalone: true,
  imports: [CommonModule, RouterModule, DatePipe],
  templateUrl: './bookings.html',
  styleUrls: ['./bookings.scss']
})
export class BookingsComponent implements OnInit {
  activeTab: 'upcoming' | 'past' | 'cancelled' = 'upcoming';
  isLoading  = true;
  errorMsg   = '';
  allBookings: Booking[] = [];

  constructor(private router: Router, private bookingService: BookingService) {}

  ngOnInit(): void {
    this.bookingService.getMyBookings().subscribe({
      next:  (list) => { this.allBookings = list; this.isLoading = false; },
      error: ()     => { this.errorMsg = 'Не удалось загрузить бронирования'; this.isLoading = false; }
    });
  }

  get upcoming()  { return this.allBookings.filter(b => b.status === 'confirmed' || b.status === 'pending'); }
  get past()      { return this.allBookings.filter(b => b.status === 'completed'); }
  get cancelled() { return this.allBookings.filter(b => b.status === 'cancelled'); }

  get currentList(): Booking[] {
    if (this.activeTab === 'upcoming') return this.upcoming;
    if (this.activeTab === 'past')     return this.past;
    return this.cancelled;
  }

  statusLabel(s: BookingStatus): string {
    const map: Record<BookingStatus, string> = {
      confirmed: '✓ Подтверждено', pending: '⏳ Ожидает оплаты',
      cancelled: '✗ Отменено',     completed: '✓ Завершено'
    };
    return map[s];
  }

  openBooking(id: number): void { this.router.navigate(['/bookings', id]); }

  downloadTicket(b: Booking): void {
    if (b.pdf_ticket_url) window.open(b.pdf_ticket_url);
    else alert('Билет будет доступен после подтверждения оплаты');
  }

  cancelBooking(id: number): void {
    if (!confirm('Отменить бронирование?')) return;
    this.bookingService.cancelBooking(id).subscribe({
      next: () => {
        const b = this.allBookings.find(x => x.id === id);
        if (b) b.status = 'cancelled';
      },
      error: () => alert('Ошибка при отмене. Попробуйте позже.')
    });
  }
}