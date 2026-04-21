export interface Airport {
  id: number;
  iata_code: string;
  name: string;
  city: string;
  country: string;
}

export interface Airline {
  id: number;
  name: string;
  iata_code: string;
}

export type CabinClass = 'economy' | 'business' | 'first';
export type TripType = 'one_way' | 'round_trip';

export interface FlightSearchParams {
  origin: string;
  destination: string;
  departure_date: string;
  return_date?: string;
  passengers: number;
  cabin_class: CabinClass;
  trip_type: TripType;
}

export interface Flight {
  id: number;
  flight_number: string;
  airline: Airline;
  origin: Airport;
  destination: Airport;
  departure_time: string;
  arrival_time: string;
  duration_minutes: number;
  stops: number;
  price_economy: number;
  price_business: number;
  price_first: number;
  available_seats_economy: number;
  available_seats_business: number;
  available_seats_first: number;
  aircraft_model: string;
}

// ── API types ──────────────────────────────────────────────

export interface RouteSearchParams {
  origin: string;        // город: 'Almaty', 'Beijing'
  destination: string;
  date: string;          // YYYY-MM-DD
  max_stops: number;     // 0–3
  prefer_price: boolean; // true = дешевле, false = быстрее
}

export interface FlightSegment {
  segment_number: number;
  database_flight_id: number;
  origin_city: string;
  destination_city: string;
  departure_time: string;   // 'YYYY-MM-DD HH:mm'
  arrival_time: string;
  price_tenge: number;
  airplane_model: string;
  layover_time_hours?: number;
}

export interface FlightRoute {
  route_type: string;            // '1 пересадка', 'Прямой'
  total_price: number;
  total_duration_hours: number;
  departure_datetime: string;
  arrival_datetime: string;
  flights_from_db: FlightSegment[];
}

export interface RouteSearchResponse {
  success: boolean;
  routes_found: number;
  direct_flights: number;
  with_connections: number;
  routes: FlightRoute[];
}