// Seeded demo logins. All passwords are 'test1234' (see backend/db/seed.js).
export const DEMO_ACCOUNTS = [
  { label: 'Household — Ramesh Patel', phone: '9876500001', password: 'test1234', role: 'household' },
  { label: 'Worker — Jignesh Parmar',  phone: '9876500012', password: 'test1234', role: 'worker' },
  { label: 'Worker — Suresh Thakor',   phone: '9876500011', password: 'test1234', role: 'worker' },
  { label: 'Co-op Admin',              phone: '9876500000', password: 'test1234', role: 'admin' },
];

export const HOME_ROUTE_BY_ROLE = {
  household: '/household',
  worker: '/worker',
  admin: '/admin',
};
