import { Component, OnInit, HostListener } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './header.html',
  styleUrls: ['./header.scss']
})
export class HeaderComponent implements OnInit {
  isScrolled = false;
  isLoggedIn = false;
  menuOpen = false;
  mobileOpen = false;
  selectedCurrency = 'KZT';
  userInitials = 'АИ';

  constructor(private router: Router) {}

  ngOnInit() {}

  @HostListener('window:scroll')
  onScroll() {
    this.isScrolled = window.scrollY > 20;
  }

  toggleUserMenu() {
    this.menuOpen = !this.menuOpen;
  }

  toggleMobile() {
    this.mobileOpen = !this.mobileOpen;
  }

  closeMobile() {
    this.mobileOpen = false;
  }

  logout() {
    this.isLoggedIn = false;
    this.router.navigate(['/']);
  }
}