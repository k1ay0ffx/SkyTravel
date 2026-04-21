import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface BookingDraft {
  flightId:       number | null;
  returnFlightId: number | null;
  seatIds:        number[];
  cabinClass:     string;
  extraIds:       number[];
  passengersCount: number;
}

const INITIAL: BookingDraft = {
  flightId:        null,
  returnFlightId:  null,
  seatIds:         [],
  cabinClass:      'economy',
  extraIds:        [],
  passengersCount: 1
};

@Injectable({ providedIn: 'root' })
export class BookingStateService {
  private draft = new BehaviorSubject<BookingDraft>({ ...INITIAL });
  draft$ = this.draft.asObservable();

  get snapshot(): BookingDraft {
    return this.draft.value;
  }

  setFlight(flightId: number, cabinClass = 'economy'): void {
    this.patch({ flightId, cabinClass });
  }

  setReturnFlight(returnFlightId: number | null): void {
    this.patch({ returnFlightId });
  }

  setSeats(seatIds: number[]): void {
    this.patch({ seatIds });
  }

  setExtras(extraIds: number[]): void {
    this.patch({ extraIds });
  }

  setPassengersCount(n: number): void {
    this.patch({ passengersCount: n });
  }

  reset(): void {
    this.draft.next({ ...INITIAL });
  }

  private patch(partial: Partial<BookingDraft>): void {
    this.draft.next({ ...this.draft.value, ...partial });
  }
}