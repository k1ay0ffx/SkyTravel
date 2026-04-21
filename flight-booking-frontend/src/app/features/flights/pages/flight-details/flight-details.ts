import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { Flight } from '../../../../core/models/flight.model';

@Component({
  selector: 'app-flight-details',
  standalone: true,
  imports: [CommonModule, RouterModule, DatePipe],
  templateUrl: './flight-details.html',
  styleUrls: ['./flight-details.scss']
})
export class FlightDetails implements OnInit {
  flight: Flight | null = null;
  isLoading = true;
  selectedCabin: 'economy' | 'business' = 'economy';
  passengers = 1;

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit() {
    const id = +this.route.snapshot.paramMap.get('id')!;

    setTimeout(() => {
      this.flight = MOCK_FLIGHT;
      this.isLoading = false;
    }, 500);
  }

  decreasePassengers() {
    if (this.passengers > 1) {
      this.passengers--;
    }
  }

  increasePassengers() {
    if (this.passengers < 9) {
      this.passengers++;
    }
  }

  formatDuration(min: number): string {
    return `${Math.floor(min / 60)}ч ${min % 60}м`;
  }

  bookFlight() {
    if (!this.flight) return;

    this.router.navigate(['/booking/extras'], {
      queryParams: {
        flightId: this.flight.id,
        cabin: this.selectedCabin,
        passengers: this.passengers
      }
    });
  }

  goBack() {
    this.router.navigate(['/flights']);
  }
}

const MOCK_FLIGHT: Flight = {
  id: 1,
  flight_number: 'KC123',
  airline: { id: 1, name: 'Air Astana', iata_code: 'KC' },
  origin: { id: 1, iata_code: 'ALA', name: 'Международный аэропорт Алматы', city: 'Алматы', country: 'Казахстан' },
  destination: { id: 2, iata_code: 'DXB', name: 'Международный аэропорт Дубай', city: 'Дубай', country: 'ОАЭ' },
  departure_time: '2025-04-25T06:00:00',
  arrival_time: '2025-04-25T09:30:00',
  duration_minutes: 210,
  stops: 0,
  price_economy: 42500,
  price_business: 110000,
  price_first: 0,
  available_seats_economy: 34,
  available_seats_business: 8,
  available_seats_first: 0,
  aircraft_model: 'Boeing 767-300'
};