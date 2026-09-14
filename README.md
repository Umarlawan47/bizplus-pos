# BizPlus POS

A clean, responsive POS and business-management starter built with HTML, CSS, JavaScript and Supabase.

## Included

- Sign up, login and logout
- Daily, weekly, monthly and yearly sales/profit dashboard
- Sales overview chart
- POS/cart
- Products and inventory
- Low-stock monitoring
- Customers
- Expenses
- Reports
- Customer Care / support tickets
- Business settings
- Supabase Row Level Security
- Vercel-friendly static deployment

## Setup

1. Create a Supabase project.
2. Open Supabase SQL Editor.
3. Run `schema.sql`.
4. Open `supabase.js`.
5. Put your own Project URL and Publishable (anon) Key into:
   `SUPABASE_URL = ""`
   `SUPABASE_PUBLISHABLE_KEY = ""`
6. Upload the whole folder to GitHub.
7. Import the GitHub repository into Vercel.
8. Deploy.

Do not put a Supabase service-role key in the frontend. The browser should use only the Publishable/anon key with RLS enabled.

## Important

For a production business system, database operations such as stock deduction should eventually be moved into a Postgres RPC/transaction so a failed sale cannot leave stock and sales out of sync. This starter keeps the JavaScript intentionally readable for easy handover and maintenance.
