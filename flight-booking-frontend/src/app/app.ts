import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './shared/components/header/header'; 
import { FooterComponent } from './shared/components/footer/footer'; 
imports: [RouterOutlet, HeaderComponent, FooterComponent]

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [RouterOutlet, HeaderComponent, FooterComponent], 
    templateUrl: './app.html',
    styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('flight-booking-frontend');
}