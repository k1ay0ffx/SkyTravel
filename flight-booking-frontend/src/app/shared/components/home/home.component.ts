import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface CityOption { city: string; code: string; country: string; }

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})

export class HomeComponent implements OnInit {

  // ── trip type ──
  tripType: 'round' | 'one' | 'multi' = 'round';

  // ── origin ──
  origin      = 'Алматы';
  originCode  = 'ALA · Казахстан';
  originFocused = false;
  get originSuggestions(): CityOption[] {
    if (!this.origin || this.origin.length < 2) return [];
    const q = this.origin.toLowerCase();
    return CITIES.filter(c =>
      c.city.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    ).slice(0, 6);
  }

  // ── destination ──
  destination      = '';
  destinationCode  = '';
  destFocused      = false;
  searchAttempted  = false;
  get destSuggestions(): CityOption[] {
    if (!this.destination || this.destination.length < 2) return [];
    const q = this.destination.toLowerCase();
    return CITIES.filter(c =>
      c.city.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    ).slice(0, 6);
  }

  // ── date ──
  departureDateISO = new Date().toISOString().split('T')[0];
  nightsLabel      = '';

  // ── passengers ──
  adults       = 1;
  children     = 0;
  passOpen     = false;
  cabinClass   = 'Эконом';
  cabinOptions = ['Эконом', 'Бизнес', 'Первый'];

  get passengersLabel(): string {
    const total = this.adults + this.children;
    return `${total} ${this.pluralPass(total)}`;
  }

  // ── other ──
  directOnly    = false;
  flexDates     = false;
  wholeMonth    = false;
  isSearching   = false;
  promoEmail    = '';


  CITIES: CityOption[] = [
  { city: 'Алматы',    code: 'ALA', country: 'Казахстан' },
  { city: 'Астана',    code: 'NQZ', country: 'Казахстан' },
  { city: 'Москва',    code: 'SVO', country: 'Россия'    },
  { city: 'Дубай',     code: 'DXB', country: 'ОАЭ'       },
  { city: 'Стамбул',   code: 'IST', country: 'Турция'    },
  { city: 'Лондон',    code: 'LHR', country: 'Великобритания' },
  { city: 'Франкфурт', code: 'FRA', country: 'Германия'  },
  { city: 'Париж',     code: 'CDG', country: 'Франция'   },
  { city: 'Пекин',     code: 'PEK', country: 'Китай'     },
  { city: 'Нью-Йорк',  code: 'JFK', country: 'США'       },
];

  destinations = [
  { city: 'Дубай',     country: 'ОАЭ',     duration: '5 ч',  price: 42500, emoji: '🏙', gradient: 'linear-gradient(160deg,#1a4a6b,#2d1b50)' },
  { city: 'Стамбул',   country: 'Турция',  duration: '4 ч',  price: 38000, emoji: '🕌', gradient: 'linear-gradient(160deg,#1b4332,#0a2e1a)' },
  { city: 'Пекин',     country: 'Китай',   duration: '7 ч',  price: 89000, emoji: '🏯', gradient: 'linear-gradient(160deg,#4a1942,#1e0a2e)' },
  { city: 'Нью-Йорк',  country: 'США',     duration: '16 ч', price: 145000,emoji: '🗽', gradient: 'linear-gradient(160deg,#7b3f00,#3d1f00)' },
  { city: 'Париж',     country: 'Франция', duration: '6 ч',  price: 54000, emoji: '🗼', gradient: 'linear-gradient(160deg,#0d3b57,#061b2e)' },
];

hotDeals = [
  { from: 'Алматы', to: 'Дубай',     airline: 'Air Astana', date: '21 апр', price: 42500,  oldPrice: 61200  },
  { from: 'Алматы', to: 'Стамбул',   airline: 'Turkish',    date: '21 апр', price: 38000,  oldPrice: 55000  },
  { from: 'Алматы', to: 'Москва',    airline: 'S7',         date: '21 апр', price: 28000,  oldPrice: 39000  },
  { from: 'Пекин',  to: 'Франкфурт', airline: 'Lufthansa',  date: '21 апр', price: 641539, oldPrice: 800000 },
  { from: 'Москва', to: 'Лондон',    airline: 'British',    date: '21 апр', price: 95000,  oldPrice: 130000 },
  { from: 'Алматы', to: 'Париж',     airline: 'Air France', date: '21 апр', price: 54000,  oldPrice: 78000  },
];

  steps = [
    { num: '01', title: 'Введите маршрут',  desc: 'Укажите откуда и куда летите, даты и количество пассажиров. Поиск займёт секунды.' },
    { num: '02', title: 'Сравните цены',    desc: 'Соберём предложения сотен авиакомпаний и покажем лучшие варианты с фильтрами.' },
    { num: '03', title: 'Купите билет',     desc: 'Бронируйте прямо на сайте или перейдите к авиакомпании. Электронный билет — на почту.' },
  ];

  constructor(private router: Router) {}

  ngOnInit() {}

  increment(field: 'adults' | 'children') {
  if (field === 'adults'   && this.adults   < 9) this.adults++;
  if (field === 'children' && this.children < 8) this.children++;
}

 decrement(field: 'adults' | 'children') {
  if (field === 'adults'   && this.adults   > 1) this.adults--;
  if (field === 'children' && this.children > 0) this.children--;
  }

  // ── autocomplete handlers ──
  selectOrigin(c: CityOption) {
    this.origin     = c.city;
    this.originCode = `${c.code} · ${c.country}`;
    this.originFocused = false;
  }

  selectDestination(c: CityOption) {
    this.destination     = c.city;
    this.destinationCode = `${c.code} · ${c.country}`;
    this.destFocused = false;
  }

  onOriginBlur() { setTimeout(() => this.originFocused = false, 150); }
  onDestBlur()   { setTimeout(() => this.destFocused   = false, 150); }

  swapCities() {
    [this.origin, this.destination]         = [this.destination, this.origin];
    [this.originCode, this.destinationCode] = [this.destinationCode, this.originCode];
  }

  // ── search ──
  searchFlights() {
    this.searchAttempted = true;
    if (!this.destination) return;

    this.isSearching = true;
    setTimeout(() => {
      this.isSearching = false;
      this.router.navigate(['/flights/results'], {
        queryParams: {
          from: this.origin,
          to:   this.destination,
          date: this.departureDateISO,
          type: this.tripType,
          passengers: this.adults + this.children,
          cabin: this.cabinClass
        }
      });
    }, 800);
  }

  goToSearch(dest: { city: string }) {
    this.router.navigate(['/flights/results'], {
      queryParams: { from: this.origin, to: dest.city, date: this.departureDateISO }
    });
  }

  selectDeal(deal: { from: string; to: string }) {
    this.router.navigate(['/flights/results'], {
      queryParams: { from: deal.from, to: deal.to, date: this.departureDateISO }
    });
  }

  subscribePromo() {
    if (this.promoEmail) {
      alert(`Подписка оформлена для ${this.promoEmail}`);
      this.promoEmail = '';
    }
  }

  private pluralPass(n: number): string {
    if (n === 1) return 'взрослый';
    if (n < 5)   return 'взрослых';
    return 'пассажиров';
  }
}

// ── city dictionary ──
const CITIES: CityOption[] = [
  { city: 'Алматы',    code: 'ALA', country: 'Казахстан' },
  { city: 'Астана',    code: 'NQZ', country: 'Казахстан' },
  { city: 'Москва',    code: 'SVO', country: 'Россия'    },
  { city: 'Дубай',     code: 'DXB', country: 'ОАЭ'       },
  { city: 'Стамбул',   code: 'IST', country: 'Турция'    },
  { city: 'Лондон',    code: 'LHR', country: 'Великобритания' },
  { city: 'Париж',     code: 'CDG', country: 'Франция'   },
  { city: 'Франкфурт', code: 'FRA', country: 'Германия'  },
  { city: 'Пекин',     code: 'PEK', country: 'Китай'     },
  { city: 'Токио',     code: 'NRT', country: 'Япония'    },
  { city: 'Нью-Йорк',  code: 'JFK', country: 'США'       },
  { city: 'Бангкок',   code: 'BKK', country: 'Таиланд'   },
  { city: 'Рим',       code: 'FCO', country: 'Италия'    },
  { city: 'Барселона', code: 'BCN', country: 'Испания'   },
  { city: 'Амстердам', code: 'AMS', country: 'Нидерланды'},
  { city: 'Бишкек',    code: 'FRU', country: 'Кыргызстан'},
  { city: 'Ташкент',   code: 'TAS', country: 'Узбекистан'},
  { city: 'Тбилиси',   code: 'TBS', country: 'Грузия'    },
  { city: 'Сеул',      code: 'ICN', country: 'Корея'     },
  { city: 'Сингапур',  code: 'SIN', country: 'Сингапур'  },
];