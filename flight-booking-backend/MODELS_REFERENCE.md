# AeroBook Models Reference

This document provides a reference for the models implemented in the `core` app of the AeroBook project.

## General Information
- **Auth User Model**: `core.User` (Extends `AbstractUser`)
- **Time Zone**: `Asia/Almaty`
- **Currency**: Kazakhstani Tenge (KZT)

## Models and Key Fields

### 1. User
- `email` (Unique, Username Field)
- `phone`
- `passport_number`

### 2. Airport
- `name`
- `city`
- `country`
- `iata_code` (Unique, 3 chars)

### 3. Airplane
- `model`
- `total_rows`
- `seats_per_row`
- `business_rows`

### 4. Flight
- `airplane` (FK)
- `origin` (FK to Airport)
- `destination` (FK to Airport)
- `departure_time` (Indexed)
- `arrival_time`
- `price`
- `status` (Indexed, choices below)

### 5. Seat
- `airplane` (FK)
- `row`
- `number` (A, B, C, etc.)
- `seat_class` (choices below)
- `is_available`
- **Unique Together**: `('airplane', 'row', 'number')`

### 6. Booking
- `user` (FK)
- `flight` (FK)
- `created_at`
- `status` (choices below)
- `total_price`

### 7. Passenger
- `booking` (FK)
- `first_name`
- `last_name`
- `passport_number`
- `date_of_birth`

### 8. BookedSeat
- `booking` (FK)
- `seat` (FK)
- `flight` (FK)
- **Critical Constraint**: `UniqueConstraint(fields=['seat', 'flight'], name='unique_seat_per_flight')`

### 9. Extra (Additional Services)
- `booking` (FK)
- `extra_type` (choices below)
- `description`
- `weight_kg`
- `price`

### 10. Payment
- `booking` (FK)
- `amount`
- `paid_at`
- `status` (choices below)
- `transaction_id`

### 11. Cancellation
- `booking` (FK)
- `reason`
- `cancelled_at`
- `refund_amount`

---

## Choice Values (Status Fields)

### Flight.status
- `scheduled`
- `delayed`
- `cancelled`
- `completed`

### Seat.seat_class
- `economy`
- `business`
- `first`

### Booking.status
- `reserved`
- `paid`
- `cancelled`
- `refunded`

### Extra.extra_type
- `baggage`
- `meal`
- `insurance`

### Payment.status
- `pending`
- `completed`
- `failed`

---

## ForeignKey Relationships Map
- `Flight` -> `Airplane`, `Airport` (origin, destination)
- `Seat` -> `Airplane`
- `Booking` -> `User`, `Flight`
- `Passenger` -> `Booking`
- `BookedSeat` -> `Booking`, `Seat`, `Flight`
- `Extra` -> `Booking`
- `Payment` -> `Booking`
- `Cancellation` -> `Booking`
