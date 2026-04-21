import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { BookingService } from '../../../../core/services/booking';
import { BookingStateService } from '../../../../core/services/booking-state';
import { PaymentRequest, PaymentResponse } from '../../../../core/models/booking.model';

type CheckoutStep = 'passenger' | 'payment' | 'success';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './checkout.html',
  styleUrls: ['./checkout.scss']
})
export class CheckoutComponent implements OnInit {
  step: CheckoutStep = 'passenger';

  passengerForm!: FormGroup;
  paymentForm!:   FormGroup;

  submitting    = false;
  error         = '';
  paymentResult: PaymentResponse | null = null;

  // Pulled from booking state
  flightSummary = { from: 'ALA', to: 'SVO', date: '10 июл 2025', flight: 'KC123', price: 45000 };
  extrasTotal   = 0;

  get orderTotal(): number {
    return this.flightSummary.price + this.extrasTotal;
  }

  constructor(
    private fb:           FormBuilder,
    private router:       Router,
    private bookingSvc:   BookingService,
    private bookingState: BookingStateService
  ) {}

  ngOnInit(): void {
    this.passengerForm = this.fb.group({
      first_name:       ['', [Validators.required, Validators.minLength(2)]],
      last_name:        ['', [Validators.required, Validators.minLength(2)]],
      date_of_birth:    ['', Validators.required],
      passport_number:  ['', [Validators.required, Validators.pattern(/^[A-Z0-9]{6,9}$/i)]],
      passport_expiry:  ['', Validators.required],
      nationality:      ['', [Validators.required, Validators.minLength(2)]],
      email:            ['', [Validators.required, Validators.email]],
      phone:            ['']
    });

    this.paymentForm = this.fb.group({
      cardholder_name: ['', Validators.required],
      card_number:     ['', [Validators.required, Validators.pattern(/^\d{4}\s\d{4}\s\d{4}\s\d{4}$/)]],
      card_expiry:     ['', [Validators.required, Validators.pattern(/^\d{2}\/\d{2}$/)]],
      card_cvv:        ['', [Validators.required, Validators.pattern(/^\d{3,4}$/)]]
    });
  }

  /* ── Step 1: passenger ─────────────────────────────────── */
  submitPassenger(): void {
    if (this.passengerForm.invalid) { this.passengerForm.markAllAsTouched(); return; }
    this.step = 'payment';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ── Step 2: payment ───────────────────────────────────── */
  submitPayment(): void {
    if (this.paymentForm.invalid) { this.paymentForm.markAllAsTouched(); return; }
    this.submitting = true;
    this.error      = '';

    const payload: PaymentRequest = {
      booking_id:      1, // from booking state in real flow
      cardholder_name: this.paymentForm.value.cardholder_name,
      card_number:     this.paymentForm.value.card_number,
      card_expiry:     this.paymentForm.value.card_expiry,
      card_cvv:        this.paymentForm.value.card_cvv
    };

    this.bookingSvc.processPayment(payload).subscribe({
      next: (res) => {
        this.paymentResult = res;
        this.step          = 'success';
        this.submitting    = false;
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: (err) => {
        this.error      = err?.error?.detail ?? 'Ошибка оплаты. Проверьте данные карты.';
        this.submitting = false;
      }
    });
  }

  /* ── Card number formatting ────────────────────────────── */
  formatCard(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 16);
    const formatted = digits.match(/.{1,4}/g)?.join(' ') ?? digits;
    input.value = formatted;
    this.paymentForm.get('card_number')?.setValue(formatted, { emitEvent: false });
  }

  formatExpiry(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 4);
    const formatted = digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
    input.value = formatted;
    this.paymentForm.get('card_expiry')?.setValue(formatted, { emitEvent: false });
  }

  goHome(): void { this.router.navigate(['/']); }
  goBookings(): void { this.router.navigate(['/profile/my-bookings']); }

  err(form: FormGroup, field: string, rule: string): boolean {
    const c = form.get(field);
    return !!(c?.touched && c.hasError(rule));
  }
}