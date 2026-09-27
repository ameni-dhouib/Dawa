# Dawa — doctor module

Doctors issue prescriptions, Dawa matches each medicine to the nearest regional pharmacy that has it,
and anything missing is dispatched from the central pharmacy with an estimated arrival time printed on
the patient's transcript, together with every pharmacy that stocks the medicines, nearest first.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

Demo account: `doctor@dawa.tn`, password `demo` (or the one-click button on the sign-in page).

## Demo script (2 minutes)

1. Sign in as the doctor. Fill in the patient (name, 8-digit CIN, phone, street, town **Moknine**).
2. In the medicine list, search "amlo" and add **Amlodipine** (green: in stock in the doctor's governorate).
   Click the **Heart & blood** class and add **Enoxaparin** (amber: shows its arrival time).
   Switch the availability filter to **Needs delivery** and add **Oseltamivir** (central pharmacy is out, so the
   estimate includes the supplier lead time).
3. Issue the prescription. The transcript shows the prescription with each medicine's availability, then every
   pharmacy stocking the medicines, nearest to the patient's address first, with which medicines each one has.

## How it works

| Piece | File |
|---|---|
| Regions, towns, pharmacies, medicines and synthetic stock | `lib/data.ts` |
| Nearest-pharmacy matching and arrival-time estimate | `lib/allocation.ts` |
| In-memory database | `lib/store.ts` |
| REST API | `app/api/*` |
| Doctor screens | `app/doctor/*` |

**Doctor's catalog:** availability is shown for the doctor's own governorate (set on the account). Filters: text
search, therapeutic class, form, availability (in stock / needs delivery) and sort order.

**Transcript:** every pharmacy (any governorate) holding enough boxes of at least one prescribed medicine, sorted by
distance from the patient's address, with the medicines it has. The nearest pharmacy that has everything is always listed.

**Matching rule:** for each medicine, the nearest pharmacy in the patient's governorate holding enough boxes.
If none, the medicine ships from the central pharmacy (Tunis) to the pharmacy nearest the patient.

**Arrival estimate:** 4 h preparation + road distance at 70 km/h + 1 h handover. Orders after 16:00 start the next
morning at 08:00. If the central pharmacy is also out of stock, 72 h supplier lead time is added.

## Going further

- **Database:** replace `lib/store.ts` with Prisma + PostgreSQL (tables: pharmacies, medicines, stock, prescriptions,
  prescription_lines, transfers). The API contract stays the same.
- **Auth:** the session cookie is unsigned for the demo; use NextAuth or signed JWTs in production.
- **Maps and addresses:** geocode real addresses and use a routing API for road distances.
- **SMS:** notify the patient when a delivery arrives at their pharmacy.

Data is regenerated when the server restarts.
