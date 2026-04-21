import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Seat } from '../../../core/models/seat.model';

interface SeatRow {
  number: number;
  left:  Seat[];
  right: Seat[];
}

interface SelectedSeat {
  row: number;
  col: string;
  type: string;
  extraCost: number;
  seatId: number;
}

@Component({
  selector: 'app-seat-selection',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './seat.html',
  styleUrls: ['./seat.scss']
})
export class SeatSelectionComponent implements OnInit {

  // ── flight info ──
  flightId   = 0;
  fromCode   = 'ALA';
  toCode     = 'DXB';
  airline    = 'Air Astana';
  flightNumber = 'KC123';
  flightDate = '25 апр 2025';

  // ── pricing ──
  basePrice    = 42500;
  extraSeatCost = 0;
  get totalPrice() { return this.basePrice + this.extraSeatCost; }

  // ── seat state ──
  seatRows: SeatRow[] = [];
  selectedSeats: SelectedSeat[] = [];
  maxSeats = 1; // = passengers count

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.flightId = +params['flightId'] || 1;
    });
    this.buildSeatMap();
  }

  private buildSeatMap() {
    const occupied = [2, 5, 8, 11, 14, 19, 22, 25, 28, 31, 34, 3, 9, 15, 27];
    const extraLeg  = [1, 7, 13]; // row numbers with extra legroom

    const rows: SeatRow[] = [];
    const totalRows = 30;

    for (let r = 1; r <= totalRows; r++) {
      const isOccupied  = (col: string) => occupied.includes(r * 10 + col.charCodeAt(0) % 10);
      const isExtraLeg  = extraLeg.includes(r);
      const isBusiness  = r <= 4;

      const makeSeat = (col: string): Seat => ({
        id: r * 100 + col.charCodeAt(0),
        seat_number: `${r}${col}`,
        row: r,
        column: col,
        cabin_class: isBusiness ? 'business' : 'economy',
        status: isOccupied(col) ? 'occupied' : 'available',
        extra_legroom: isExtraLeg,
        window: col === 'A' || col === 'F',
        aisle:  col === 'C' || col === 'D',
        price_surcharge: isBusiness ? 50000 : isExtraLeg ? 5000 : 0
      });

      rows.push({
        number: r,
        left:  ['A', 'B', 'C'].map(makeSeat),
        right: ['D', 'E', 'F'].map(makeSeat),
      });
    }

    this.seatRows = rows;
  }

  getSeatClass(seat: Seat): string {
    if (seat.status === 'occupied') return 'seat-btn occupied';
    if (this.isMySelected(seat))    return 'seat-btn seat-selected';
    if (seat.cabin_class === 'business') return 'seat-btn business-seat';
    if (seat.extra_legroom)         return 'seat-btn extra-legroom';
    return 'seat-btn available';
  }

  getSeatTitle(seat: Seat): string {
    if (seat.status === 'occupied') return 'Занято';
    const parts: string[] = [`${seat.row}${seat.column}`];
    if (seat.cabin_class === 'business') parts.push('Бизнес-класс');
    if (seat.extra_legroom) parts.push('Доп. место для ног');
    if (seat.window) parts.push('У окна');
    if (seat.aisle)  parts.push('У прохода');
    if (seat.price_surcharge && seat.price_surcharge > 0)
      parts.push(`+${seat.price_surcharge.toLocaleString()} ₸`);
    return parts.join(' · ');
  }

  isMySelected(seat: Seat): boolean {
    return this.selectedSeats.some(s => s.seatId === seat.id);
  }

  selectSeat(seat: Seat) {
    if (seat.status === 'occupied') return;

    if (this.isMySelected(seat)) {
      // deselect
      this.selectedSeats = this.selectedSeats.filter(s => s.seatId !== seat.id);
      this.recalcExtra();
      return;
    }

    if (this.selectedSeats.length >= this.maxSeats) {
      // replace last selected if maxSeats reached
      this.selectedSeats.pop();
    }

    const type = seat.cabin_class === 'business'
      ? 'Бизнес-класс'
      : seat.extra_legroom
        ? 'Доп. место для ног'
        : seat.window ? 'У окна' : seat.aisle ? 'У прохода' : 'Стандартное';

    this.selectedSeats.push({
      row:       seat.row,
      col:       seat.column,
      type,
      extraCost: seat.price_surcharge ?? 0,
      seatId:    seat.id,
    });

    this.recalcExtra();
  }

  removeSeat(s: SelectedSeat) {
    this.selectedSeats = this.selectedSeats.filter(x => x.seatId !== s.seatId);
    this.recalcExtra();
  }

  private recalcExtra() {
    this.extraSeatCost = this.selectedSeats.reduce((sum, s) => sum + s.extraCost, 0);
  }

  goToCheckout() {
    const seatIds = this.selectedSeats.map(s => s.seatId);
    this.router.navigate(['/checkout'], {
      queryParams: {
        flightId:  this.flightId,
        seatIds:   seatIds.join(','),
        totalPrice: this.totalPrice,
      }
    });
  }
}