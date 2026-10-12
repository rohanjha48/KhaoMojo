# 🌙 KhaoMojo — Late-Night Hostel Delivery & Print Service

> **KhaoMojo** is a sleek, mobile-first web application designed for hostel students ordering midnight snacks (Maggi, chips, eggs, cold drinks) and urgent 2 AM assignment printouts directly to their hostel room door. Built with Next.js (App Router), Tailwind CSS, Lucide Icons, and Supabase.

---

## ⚡ Key Highlights & Architecture

- **Operating Hours Restriction (10:00 PM – 4:00 AM)**: 
  The app enforces operational hours automatically. Outside these hours, a midnight "Closed for the Day" screen is presented, and checkout is disabled. A handy **"Demo/Testing Override"** toggle is built into the navbar and closed screen so developers and evaluators can preview the open storefront at any time of day.
- **500 Concurrent Users Optimization**:
  - API routes with optimized `Cache-Control` (`stale-while-revalidate`) headers.
  - Zero-latency optimistic UI updates.
  - Minimal database round-trips with transactional multi-item insertion.
  - Supabase Realtime channel subscriptions with rate-limiting parameters.
- **Real-time Inventory & Stock Triggers**:
  - Products show live stock counters.
  - If stock reaches 0, the button turns into an **"Out of Stock"** disabled pill.
  - Postgres function & trigger automatically deducts `stock_count` when items are ordered.
- **Assignment & Document Printing (Supabase Storage)**:
  - Adding a printout opens an interactive modal to upload PDF, DOCX, or images up to 25MB.
  - Uploaded directly to the Supabase Storage `print-files` bucket.
  - Attached document download link appears directly inside the Admin Order Card.
- **Protected Admin Dashboard (`/admin`)**:
  - PIN-protected dispatch portal (Default PIN: `mojo123`).
  - Real-time order listener (`.channel()`) with instant visual banner and sound chime when orders arrive.
  - Action buttons to transition order status (`pending` ➔ `processing` ➔ `delivered`).
  - Live Inventory Manager table to adjust prices and restock (+10, +25, custom) on the fly.
- **Section-Based Categorization & Local Image Assets**:
  - The storefront is organized into 9 dedicated, labeled sections with dynamic headers, branded badges, and item counts:
    1. **Lay's Collection** (4 flavors: Magic Masala, American Cream & Onion, Classic Salted, Spanish Tomato Tango)
    2. **Kurkure Collection** (2 items: Masala Munch, Puffcorn)
    3. **Bingo Collection** (2 items: Achaari Masti, Very Peri Peri)
    4. **Soya Sticks** (1 item: Soya Sticks Classic)
    5. **Packed Maggi** (1 item: Maggi 2-Minute Noodles)
    6. **Fresh Eggs** (1 item: Farm Fresh Eggs Tray/Pack)
    7. **Oreo** (1 item: Oreo Vanilla Cream Biscuits)
    8. **Other Biscuits** (4 items: Parle-G, Bourbon, Milk Bikis, Tiger)
    9. **Print Services** (4 items: B&W Printouts, Color Printouts, A4 Sheets, Spiral Binding)
  - All product images are served locally from `/public` matching the scanned filenames without placeholders.
  - Quick-jump filter tabs allow switching between "All Collections" and individual category sections.
- **Inventory Migration & Retired Item Deletion**:
  - `supabase/migration_update_inventory.sql` provides the clean SQL script to delete retired items (Kurkure Naughty Tomato, Solid Masti, Chilli Chatka, Lay's Chile Limón, Lay's West Indies Chilli, Marie Gold) and upsert the 9 sections.
- **Zero-Friction Fallback (Dual Mode)**:
  - Pre-configured to connect to live Supabase Postgres & Storage.
  - Also includes an in-memory & local-storage fallback with cross-tab `BroadcastChannel` real-time sync, allowing testing immediately even before pasting Supabase keys!

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router), React 19
- **Styling**: Tailwind CSS (Dark Mode default, sleek neon accents)
- **Icons**: Lucide React
- **Database & Storage**: Supabase (PostgreSQL, Realtime Subscriptions, Storage)
- **Audio Feedback**: Synthesized Web Audio API (zero external assets needed)

---

## 🚀 Quick Start Guide

### 1. Installation & Local Development

The project is already installed and set up. To run locally:

```bash
# Start development server
pnpm dev

# App runs on http://localhost:3000
# Admin portal runs on http://localhost:3000/admin (Default PIN: mojo123)
```

### 2. Setting Up Supabase (Database & Realtime)

1. Create a free project at [Supabase](https://supabase.com).
2. Go to **Project Settings -> API** and copy your **Project URL** and **anon public key**.
3. Open `.env.local` in the project root and add your keys:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_ADMIN_PIN=mojo123
```

4. Go to the **SQL Editor** in your Supabase dashboard and execute the scripts located in the `supabase/` directory:
   - For a **new setup**: Run `supabase/schema.sql` followed by `supabase/seed.sql`.
   - For an **existing database**: Run `supabase/migration_update_inventory.sql` (safely deletes the 6 retired items and upserts the 9 updated sections).

---

## 📁 Project Structure

```
├── app/
│   ├── admin/
│   │   └── page.js           # Protected Admin Dashboard (/admin)
│   ├── api/
│   │   ├── orders/route.js   # Orders REST API endpoint
│   │   └── products/route.js # Cached Products API endpoint
│   ├── globals.css           # Tailwind CSS configuration & dark theme
│   ├── layout.js             # Root layout with CartProvider & SEO metadata
│   └── page.js               # User-facing Storefront Home Page
├── components/
│   ├── CartContext.js        # Cart state management & localStorage sync
│   ├── CartDrawer.js         # Slide-out cart & checkout drawer
│   ├── ClosedNotice.js       # "Closed for the Day" operational hours banner
│   ├── Navbar.js             # Top bar with real-time indicators & cart trigger
│   ├── OrderSuccessModal.js  # Order confirmation & receipt dialog
│   ├── PrintUploadModal.js   # Assignment document upload modal
│   └── ProductCard.js        # Product card with live stock count & category badges
├── supabase/
│   ├── schema.sql            # Full PostgreSQL schema, triggers & realtime
│   └── seed.sql              # Seed items (Lays, Kurkure, Oreo, Maggi, Eggs, Prints)
├── utils/
│   ├── audio.js              # Synthesized Web Audio chime utility
│   ├── dataService.js        # Unified Supabase & offline data service
│   ├── operatingHours.js     # 10 PM - 4 AM time calculations & override helpers
│   └── supabase/
│       └── client.js         # Supabase client singleton & configuration check
├── .env.example              # Environment variables template
└── .env.local                # Local environment configuration
```

---

## 🔐 Admin Dashboard Details

- **Route**: `http://localhost:3000/admin`
- **Default PIN**: `mojo123`
- **Features**:
  - Live order cards with customer name, hostel room number (e.g. `Block B - Room 304`), and phone number.
  - Direct download links for student printout assignments.
  - One-tap status updates: `pending` ➔ `processing` ➔ `delivered` or `cancelled`.
  - Live metric counters for tonight's revenue, pending orders, and low-stock warnings.
  - Full table editor to change prices and restock quantities live.
