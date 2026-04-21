import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Flight } from '../../../core/models/flight.model';

// export interface Flight {
//   id: string;
//   airline: string;
//   airlineCode: string;
//   flightNumber: string;
//   fromCity: string;
//   fromCode: string;
//   toCity: string;
//   toCode: string;
//   departureTime: string;
//   arrivalTime: string;
//   duration: string;
//   stops: number;
//   price: number;
//   baggage?: string;
//   handLuggage: boolean;
//   refundable: boolean;
//   discount?: number;
//   cabinClass: string;
//   aircraft?: string;
//   terminal?: string;
//   layover?: string;
// }

@Component({
  selector: 'app-flight-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './flight-card.html',
  styleUrls: ['./flight-card.scss']
})
export class FlightCardComponent {
  @Input() flight!: Flight;
  @Input() isSelected = false;
  @Output() selected = new EventEmitter<Flight>();

  showDetails = false;

  selectFlight() {
    this.isSelected = true;
    this.selected.emit(this.flight);
  }

  toggleDetails() {
    this.showDetails = !this.showDetails;
  }
}