import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Passenger } from 'src/app/core/models/booking.model';
import { BookingService } from 'src/app/core/services/booking';
import { BookingStateService } from 'src/app/core/services/booking-state';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './checkout.html',
  styleUrls: ['./checkout.scss']
})
export class CheckoutComponent implements OnInit {
  fromCode = 'ALA'; toCode = 'DXB';
  airline = 'Air Astana'; flightNumber = 'KC123';
  depTime = '25 апр, 06:00';
  seats: string[] = [];

  basePrice   = 42500;
  seatExtra   = 0;
  extrasPrice = 0;
  get totalPrice() { return this.basePrice + this.seatExtra + this.extrasPrice; }

  passengers: Passenger[] = [{
    first_name: '', last_name: '', date_of_birth: '',
    passport_number: '', passport_expiry: '', nationality: 'KZ'
  }];

  contactEmail = '';
  contactPhone = '';

  payMethod  = 'card';
  cardNumber = '';
  cardHolder = '';
  cardExpiry = '';
  cardCvv    = '';

  isLoading = false;
  errorMsg  = '';

  get cardDisplay(): string {
    const raw = this.cardNumber.replace(/\s/g, '');
    return (raw + '•'.repeat(Math.max(0, 16 - raw.length)))
      .replace(/(.{4})/g, '$1 ').trim();
  }

  constructor(
    private route:        ActivatedRoute,
    private router:       Router,
    private bookingSvc:   BookingService,
    private bookingState: BookingStateService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(p => {
      if (p['seatIds'])    this.seats     = p['seatIds'].split(',');
      if (p['totalPrice']) this.basePrice = +p['totalPrice'];
    });
  }

  formatCard(): void {
    this.cardNumber = this.cardNumber
      .replace(/\D/g, '')
      .replace(/(.{4})/g, '$1 ')
      .trim()
      .slice(0, 19);
  }

  pay(): void {
    this.errorMsg = '';

    if (!this.passengers[0].first_name || !this.passengers[0].last_name) {
      this.errorMsg = 'Введите данные пассажира'; return;
    }
    if (!this.contactEmail) { this.errorMsg = 'Введите email'; return; }

    if (this.payMethod === 'card') {
      if (this.cardNumber.replace(/\s/g, '').length < 16) { this.errorMsg = 'Введите номер карты'; return; }
      if (!this.cardHolder) { this.errorMsg = 'Введите имя владельца'; return; }
      if (!this.cardExpiry) { this.errorMsg = 'Введите срок действия'; return; }
      if (!this.cardCvv)    { this.errorMsg = 'Введите CVV'; return; }
    }

    this.isLoading = true;

    const bookingId = this.bookingState.snapshot.flightId ?? 1;

    this.bookingSvc.processPayment({
      booking_id:      bookingId,
      card_number:     this.cardNumber,
      card_expiry:     this.cardExpiry,
      card_cvv:        this.cardCvv,
      cardholder_name: this.cardHolder
    }).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.bookingState.reset();
        this.router.navigate(['/booking/confirmation'], {
          queryParams: { ref: res.booking_reference }
        });
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMsg  = err?.error?.detail ?? 'Ошибка оплаты. Проверьте данные карты.';
      }
    });
  }
}