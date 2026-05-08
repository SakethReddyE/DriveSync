/**
 * DriveSync — Database Seed Script
 * Run once to populate the database with the four sample drivers
 * that were hard-coded in the original frontend.
 *
 * Usage:  node seed.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('./config/db');
const Driver = require('./models/Driver');

const SEED_DRIVERS = [
  {
    name: 'Ramesh Kumar',
    age: 34,
    phone: '9876543210',
    email: 'ramesh@drv.in',
    password: 'Drv@1234',
    licence: 'TS04 20180034567',
    experience: '5–10 years',
    location: 'Kukatpally',
    pastExperience: 'Ola Driver — 4 years',
    status: 'approved',
    online: true,
    rating: 4.9,
    totalRides: 320,
    color: '#0071e3',
  },
  {
    name: 'Suresh Babu',
    age: 41,
    phone: '9876501234',
    email: 'suresh@drv.in',
    password: 'Drv@1234',
    licence: 'TS09 20150021890',
    experience: '10+ years',
    location: 'Madhapur',
    pastExperience: 'Private employer — 6 years',
    status: 'approved',
    online: true,
    rating: 4.7,
    totalRides: 512,
    color: '#28cd41',
  },
  {
    name: 'Pradeep Varma',
    age: 28,
    phone: '9871234560',
    email: 'pradeep@drv.in',
    password: 'Drv@1234',
    licence: 'TS12 20200056789',
    experience: '3–5 years',
    location: 'Hitech City',
    pastExperience: 'Uber Driver — 3 years',
    status: 'approved',
    online: true,
    rating: 4.8,
    totalRides: 198,
    color: '#ff9500',
  },
  {
    name: 'Mohammed Irfan',
    age: 36,
    phone: '9812345670',
    email: 'irfan@drv.in',
    password: 'Drv@1234',
    licence: 'TS08 20160043210',
    experience: '5–10 years',
    location: 'Banjara Hills',
    pastExperience: 'Corporate driver — 5 years',
    status: 'approved',
    online: false,
    rating: 4.6,
    totalRides: 280,
    color: '#ff3b30',
  },
];

const seed = async () => {
  await connectDB();

  console.log('🌱  Seeding drivers...');

  for (const driverData of SEED_DRIVERS) {
    const existing = await Driver.findOne({ email: driverData.email });
    if (existing) {
      console.log(`  ⏭  Skipping ${driverData.name} (already exists)`);
      continue;
    }

    // Password will be hashed by the pre-save hook
    await Driver.create(driverData);
    console.log(`  ✅  Created driver: ${driverData.name}`);
  }

  console.log('✅  Seeding complete!');
  process.exit(0);
};

seed().catch((err) => {
  console.error('❌  Seed error:', err);
  process.exit(1);
});
