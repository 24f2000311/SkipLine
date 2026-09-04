# Skipline Backend API Documentation — V1.0

Base URL: `http://localhost:8000/api/v1`  
WebSocket URL: `ws://localhost:8000/ws`

---

## 1. Authentication Endpoints (`/auth`)

### 1.1 Register Organizer
* **Endpoint**: `POST /api/v1/auth/register`
* **Auth Required**: None
* **Request Body**:
```json
{
  "name": "Jane Organizer",
  "email": "organizer@fest2026.com",
  "password": "SecurePassword123!",
  "phone": "+1234567890"
}
```
* **Response (201 Created)**:
```json
{
  "success": true,
  "message": "Organizer registered successfully",
  "data": {
    "user": {
      "id": "u_9b1deb4d",
      "name": "Jane Organizer",
      "email": "organizer@fest2026.com",
      "status": "ACTIVE"
    },
    "tokens": {
      "accessToken": "eyJhbGciOi...",
      "refreshToken": "sk_ref_7a8f9b..."
    }
  }
}
```

### 1.2 Login Organizer
* **Endpoint**: `POST /api/v1/auth/login`
* **Auth Required**: None
* **Request Body**:
```json
{
  "email": "organizer@fest2026.com",
  "password": "SecurePassword123!"
}
```
* **Response (200 OK)**:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "u_9b1deb4d",
      "name": "Jane Organizer",
      "email": "organizer@fest2026.com"
    },
    "tokens": {
      "accessToken": "eyJhbGciOi...",
      "refreshToken": "sk_ref_7a8f9b..."
    }
  }
}
```

### 1.3 Refresh Access Token
* **Endpoint**: `POST /api/v1/auth/refresh`
* **Request Body**:
```json
{
  "refreshToken": "sk_ref_7a8f9b..."
}
```

### 1.4 Logout
* **Endpoint**: `POST /api/v1/auth/logout`
* **Request Body**:
```json
{
  "refreshToken": "sk_ref_7a8f9b..."
}
```

### 1.5 Get Current Profile
* **Endpoint**: `GET /api/v1/auth/me`
* **Header**: `Authorization: Bearer <accessToken>`

---

## 2. Event Management Endpoints (`/events`)

> **Note**: All event management endpoints require Header `Authorization: Bearer <accessToken>`.

### 2.1 Create Event
* **Endpoint**: `POST /api/v1/events`
* **Request Body**:
```json
{
  "name": "Skipline Tech Summit 2026",
  "description": "Annual Festival Registration",
  "venue": "Auditorium Hall A",
  "startAt": "2026-08-19T09:00:00.000Z",
  "endAt": "2026-08-19T18:00:00.000Z",
  "status": "LIVE"
}
```

### 2.2 Get Organizer Events
* **Endpoint**: `GET /api/v1/events`

### 2.3 Get Event By ID
* **Endpoint**: `GET /api/v1/events/:id`

### 2.4 Update Event
* **Endpoint**: `PUT /api/v1/events/:id`
* **Request Body**: (Any partial set of fields: `name`, `description`, `venue`, `startAt`, `endAt`, `status`)

### 2.5 Delete Event
* **Endpoint**: `DELETE /api/v1/events/:id`

---

## 3. Queue Management Endpoints (`/queues`)

> **Note**: All queue management endpoints require Header `Authorization: Bearer <accessToken>`.

### 3.1 Create Queue
* **Endpoint**: `POST /api/v1/queues`
* **Request Body**:
```json
{
  "eventId": "event_id_uuid",
  "name": "Badge Collection Desk",
  "description": "Counter 1",
  "maxCapacity": 100,
  "priorityPolicy": "WEIGHTED_PRIORITY",
  "vipWeight": 2,
  "normalWeight": 1,
  "maxVipStreak": 2,
  "estimatedServiceTime": 5,
  "agingIntervalSec": 300,
  "agingScoreStep": 10
}
```

### 3.2 Get Queues for Event
* **Endpoint**: `GET /api/v1/events/:eventId/queues`

### 3.3 Get Queue By ID
* **Endpoint**: `GET /api/v1/queues/:id`

### 3.4 Update Queue
* **Endpoint**: `PUT /api/v1/queues/:id`
* **Request Body**:
```json
{
  "name": "Updated Desk Name",
  "status": "OPEN", // 'OPEN' | 'PAUSED' | 'CLOSED'
  "maxCapacity": 150
}
```

### 3.5 Delete Queue
* **Endpoint**: `DELETE /api/v1/queues/:id`

---

## 4. Customer & Queue Engine Endpoints

### 4.1 Join Queue (Anonymous Customer)
* **Endpoint**: `POST /api/v1/queues/:queueId/entries`
* **Auth Required**: None (Anonymous)
* **Request Body**:
```json
{
  "sessionId": "sess_cust_device_999",
  "customerName": "Alice Rivera",
  "customerPhone": "+15550199",
  "priority": "NORMAL" // 'NORMAL' | 'VIP'
}
```
* **Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "entry": {
      "id": "q_entry_uuid",
      "queueId": "queue_uuid",
      "token": "A-001",
      "priority": "NORMAL",
      "status": "WAITING",
      "sequenceNumber": 1
    },
    "accessToken": "sk_live_64char_random_hex_secret",
    "qrPayload": "https://skipline.app/verify?id=q_entry_uuid&key=sk_live_...",
    "position": 1,
    "estimatedWaitTimeMinutes": 5
  }
}
```

### 4.2 Get Queue Entry Status
* **Endpoint**: `GET /api/v1/queue-entries/:id`
* **Header**: `x-queue-access-token: sk_live_64char_random_hex_secret`

### 4.3 Customer Leave Queue
* **Endpoint**: `POST /api/v1/queue-entries/:id/leave`
* **Header**: `x-queue-access-token: sk_live_64char_random_hex_secret`

### 4.4 Get Active Entries for Device Session
* **Endpoint**: `GET /api/v1/queue-entries/session/:sessionId`

---

## 5. Organizer Queue Engine Control Endpoints

### 5.1 Call Next Customer
* **Endpoint**: `POST /api/v1/queues/:queueId/call-next`
* **Auth Required**: None (or Organizer)
* **Description**: Invokes the dynamic weighted scoring algorithm ($\text{Base Weight} + \text{Aging Bonus}$) and applies maximum VIP streak guardrails.
* **Response (200 OK)**:
```json
{
  "success": true,
  "message": "Customer called successfully",
  "data": {
    "id": "q_entry_uuid",
    "token": "V-003",
    "status": "CALLED",
    "calledAt": "2026-08-18T22:30:00.000Z"
  }
}
```

### 5.2 Start Serving Customer
* **Endpoint**: `POST /api/v1/queue-entries/:id/start`

### 5.3 Handle Customer No-Show
* **Endpoint**: `POST /api/v1/queue-entries/:id/no-show`
* **Description**: Increments no-show counter. Requeues back into `WAITING` status with call backoff offset (+5 calls for Normal, +3 calls for VIP), or marks as terminal `SKIPPED` if 3rd attempt is reached.

### 5.4 Complete Customer Service
* **Endpoint**: `POST /api/v1/queue-entries/:id/complete`

---

## 6. Real-Time WebSocket Interface

* **URL**: `ws://localhost:8000/ws`
* **Subscribe Command**:
```json
{
  "action": "SUBSCRIBE",
  "queueId": "queue_uuid_here"
}
```
* **Event Frames Received**:
  * `QUEUE_ENTRY_JOINED`
  * `QUEUE_ENTRY_CALLED`
  * `QUEUE_ENTRY_SERVING`
  * `QUEUE_ENTRY_COMPLETED`
  * `QUEUE_ENTRY_NO_SHOW`
  * `QUEUE_ENTRY_CANCELLED`
