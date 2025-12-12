# MedicalMDB

Quick start to run the MedicalMDB demo locally.

## Requirements
- Node.js 18+ and npm
- MongoDB running locally (`mongodb://127.0.0.1:27017`)

## Setup
1) Install packages:
```bash
npm install
```
2) Seed demo data (optional but recommended):
```bash
node Data/seed.js 100
```
   Change number to control patients generated, e.g. `node Data/seed.js 25`.

3) Start the app:
```bash
node server.js
```
4) Open http://localhost:3000 and sign in:
   - Admin: `demo_admin` / `password123`
   - All generated physicians/patients use `password123`

Connection string lives in `utils/db.js` if you need to point at a different MongoDB.
