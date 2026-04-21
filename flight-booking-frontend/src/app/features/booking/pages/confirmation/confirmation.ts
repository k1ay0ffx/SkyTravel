import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirmation',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './confirmation.html',
  styleUrls: ['./confirmation.scss']
})
export class ConfirmationComponent implements OnInit {
  bookingRef = '';
  email = 'user@email.com';
  fromCode = 'ALA'; toCode = 'DXB';
  flightNum = 'KC123'; depTime = '25 апр, 06:00'; seats = '15A';

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    this.route.queryParams.subscribe(p => {
      if (p['ref']) this.bookingRef = p['ref'];
    });
  }

  copyRef() {
    navigator.clipboard.writeText(this.bookingRef);
  }

  downloadTicket() {
    // TODO: BookingService.getBookingById -> pdf_ticket_url
    alert('Билет отправлен на ' + this.email);
  }
}