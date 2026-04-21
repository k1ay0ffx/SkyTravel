# ✈️ **SkyTravel**

### *Smart Flight Booking Platform*

---

## 🚀 Overview

**AeroBook** is a modern, high-performance web application built for seamless **flight search**, **booking**, and **management**.
Designed with scalability and user experience in mind, it delivers a smooth and intuitive journey from search to checkout.

---

## 🌍 What You Can Do

✨ **Search Flights**
Find flights by **destination**, **date**, and preferences

🧭 **Explore Options**
Browse available flights with detailed information

💺 **Select Seats**
Interactive seat map with real-time availability

🧾 **Book Tickets**
Create and manage bookings effortlessly

💳 **Simulate Payment**
Experience a mock payment flow

👤 **Manage Profile**
Track bookings and view personal data

---

## 🧩 Architecture

The project is split into two main parts:

### 🎨 Frontend

> Built with **Angular** — fast, reactive, and scalable

### ⚙️ Backend

> Powered by **Django + DRF + JWT** — secure and robust

---

## 👥 Team

| Role             | Name                 |
| ---------------- | -------------------- |
| 🎨 Frontend Dev  | Atamuratov Nursultan |
| ⚙️ Backend Dev   | Orynbasar Ahmedi     |
| 🗄️ Database Dev | Almas                |

---

## 🛠️ Tech Stack

### Frontend

* ⚡ Angular
* 🟦 TypeScript
* 🎨 SCSS
* 🔄 RxJS
* 🧭 Angular Router
* 🌐 HttpClient

### Backend

* 🐍 Django
* 🔗 Django REST Framework
* 🔐 JWT Authentication

### Database

* 🐘 PostgreSQL

---

## 📁 Project Structure

```bash
src/
 ├── app/
 │   ├── core/        # services, guards, interceptors
 │   ├── shared/      # reusable components
 │   ├── features/    # auth, flights, booking, profile
 │   ├── layouts/     # layout components
 │   └── app-routing.module.ts
```

---

## 🔐 Core Features

### 🔑 Authentication

* Registration & Login
* JWT-based authentication
* Get current user profile

### ✈️ Flight Search

* Search by city & date
* Filter and explore results

### 💺 Seat Selection

* Interactive seat map
* Real-time availability

### 🧾 Booking System

* Create bookings
* Select seats

### 💳 Payment (Mock)

* Simulated payment flow
* Booking status updates

### 👤 User Profile

* Personal info
* Booking history

---

## 💡 Highlights

* ⚡ **Fast & Responsive UI**
* 🔐 **Secure Authentication (JWT)**
* 🧩 **Modular Architecture**
* 📱 **Scalable Design**
* 🎯 **User-Centric Experience**

---

## 📌 Future Improvements

* 🔍 Advanced filters (price, airlines, duration)
* 🌐 Real payment integration
* 📊 Admin dashboard
* 📱 Mobile optimization

---

## 🗄️ Database Instructions

Your task is to create a structure in PostgreSQL. We are working through Django ORM, so you must ensure that these specific fields are present in `core/models.py`.

### 1. Main Tables and Rules:

#### User
- The `email` field must have `unique=True` flag. Re-registration with same email is prohibited.

#### Flight
- `price`: Type `Decimal(10,2)`. Currency: Tenge.
- `departure_time` and `arrival_time`: Type `DateTimeField`.

#### Seat
- Fields: `row` (row number), `number` (seat letter, e.g., "A"), `is_available` (boolean).
- Linked to the aircraft via `ForeignKey`.

#### Booking
- `status`: A field with strict choices: `Reserved`, `Paid`, `Cancelled`, `Refunded`.
- `total_price`: The total amount of the order.

#### Passenger
- Relationship: `ForeignKey` to the `Booking` table.
- Logic: One `Booking` can contain multiple `Passengers` (one person buys for everyone).
- Fields: `first_name`, `last_name`, `passport_number`.

### 2. Main Constraint:

The database must be configured to prevent creation of two records for same seat (`seat_id`) on same flight (`flight_id`). This protects us from double bookings (over-selling).

---

## � ER Diagram (Database Schema)

Full Mermaid ER Diagram is available in [ER_DIAGRAM.md](./ER_DIAGRAM.md). It includes all model relationships, unique constraints, and key fields!

---

## �🛫 Final Note

> **AeroBook** is more than just a booking app —
> it's a complete **flight experience platform** built for speed, simplicity, and scalability.

---

⭐ *Feel free to contribute, improve, and take this project to the next level!*
