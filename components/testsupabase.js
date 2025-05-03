// components/test-env.js
const path = require('path');
const dotenv = require('dotenv');

// Configure dotenv to look in the parent directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

console.log('Supabase URL:', process.env.SUPABASE_URL);
console.log('Supabase Key:', process.env.SUPABASE_KEY);

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  console.error('Supabase credentials are missing or incorrect!');
} else {
  console.log('Supabase credentials loaded successfully!');
}