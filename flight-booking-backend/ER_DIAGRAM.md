# AeroBook ER Diagram (Mermaid)

```mermaid
erDiagram
    User ||--o{ Booking : "has"
    User {
        int id PK "unique identifier"
        string email UK "unique username field"
        string username
        string phone
        string passport_number
        boolean is_staff
        boolean is_superuser
    }

    Airport ||--o{ Flight : "origin/destination"
    Airport {
        int id PK
        string name
        string city
        string country
        string iata_code UK "3-letter IATA code"
        decimal latitude
        decimal longitude
    }

    Airplane ||--o{ Flight : "used for"
    Airplane ||--o{ Seat : "has"
    Airplane {
        int id PK
        string model
        int total_rows
        int seats_per_row
        int business_rows
    }

    Seat {
        int id PK
        int airplane_id FK
        int row
        string number "A-F"
        string seat_class "economy|business|first"
        boolean is_available
    }

    Flight ||--o{ Booking : "booked for"
    Flight ||--o{ BookedSeat : "has booked seats"
    Flight {
        int id PK
        int airplane_id FK
        int origin_id FK
        int destination_id FK
        datetime departure_time "indexed"
        datetime arrival_time
        decimal price "KZT"
        string status "scheduled|delayed|cancelled|completed (indexed)"
    }

    Booking ||--o{ Passenger : "contains"
    Booking ||--o{ BookedSeat : "has"
    Booking ||--o{ Extra : "includes"
    Booking ||--o{ Payment : "has"
    Booking ||--|| Cancellation : "maybe has"
    Booking {
        int id PK
        int user_id FK
        int flight_id FK
        datetime created_at
        string status "reserved|paid|cancelled|refunded"
        decimal total_price "KZT"
    }

    Passenger {
        int id PK
        int booking_id FK
        string first_name
        string last_name
        string passport_number
        date date_of_birth
    }

    BookedSeat {
        int id PK
        int booking_id FK
        int seat_id FK
        int flight_id FK
    }

    Extra {
        int id PK
        int booking_id FK
        string extra_type "baggage|meal|insurance"
        string description
        float weight_kg
        decimal price "KZT"
    }

    Payment {
        int id PK
        int booking_id FK
        decimal amount "KZT"
        datetime paid_at
        string status "pending|completed|failed"
        string transaction_id
    }

    Cancellation {
        int id PK
        int booking_id FK
        text reason
        datetime cancelled_at
        decimal refund_amount "KZT"
    }

    Airline ||--o{ FlightSchedule : "operates"
    Airline {
        int id PK
        string iata_code UK
        string name
        string country
    }

    FlightSchedule ||--o{ FlightInstance : "has"
    FlightSchedule {
        int id PK
        int airline_id FK
        int origin_id FK
        int destination_id FK
        int airplane_id FK
        string flight_number UK
        time departure_time
        time arrival_time
        int duration_minutes
        string days_of_week "1234567"
        decimal economy_price "KZT"
        decimal business_price "KZT"
        boolean is_active
    }

    FlightInstance {
        int id PK
        int schedule_id FK
        date date
        datetime departure_datetime
        datetime arrival_datetime
        string status "scheduled|delayed|cancelled|completed"
    }

    %% Unique Constraints %%
    BookedSeat ||--|| Seat : "unique per flight"
    BookedSeat ||--|| Flight : "unique per seat"
    Seat ||--|| Airplane : "unique seat per plane (row+number)"
    FlightInstance ||--|| FlightSchedule : "unique per date"
```

## Legend for Relationships:
- `||--o{`: One to Many
- `||--||`: One to One
- `||--||`: One to One (with unique constraint)

## Key Unique Constraints Highlighted:
- `BookedSeat`: `(seat, flight)` → Prevent double-booking!
- `Seat`: `(airplane, row, number)` → Prevent duplicate seats on same plane!
- `FlightInstance`: `(schedule, date)` → One instance per schedule per date!
