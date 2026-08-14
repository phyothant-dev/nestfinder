# NestFinder

A modern real estate marketplace app for buying, selling, and renting properties in Myanmar. Built with React Native and Expo, featuring bilingual support (English/Myanmar), real-time chat, and map-based property discovery.

## Features

- **Property Listings** — Buy, rent, and wanted listings with detailed property information
- **Map View** — Discover properties on an interactive map with Google Maps integration
- **Real-time Chat** — messaging between buyers and sellers/agents
- **Bilingual Support** — Full English and Myanmar language support
- **Property Search** — Advanced filters by location, property type, price range, rooms, and area
- **User Profiles** — Agent profiles, listings, and reviews
- **Saved Properties** — Bookmark and compare properties
- **Push Notifications** — Stay updated on new listings and messages
- **Image & Video Upload** — Property media gallery with camera and gallery support
- **Dark Mode** — Theme support (light/dark/system)

## Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | React Native 0.81 |
| SDK | Expo SDK 54 |
| Language | TypeScript |
| Navigation | Expo Router (file-based) |
| Styling | NativeWind (Tailwind CSS) |
| State Management | Zustand |
| Backend | Supabase (Auth, Database, Storage, Realtime) |
| Maps | Google Maps API |
| UI Components | Gluestack UI |
| Icons | Lucide React Native |
| Internationalization | i18next + react-i18next |
| Image Handling | Expo Image Picker, Expo Image Manipulator |

## Project Structure

```
src/
├── app/                    # Expo Router pages
│   ├── (auth)/             # Auth screens (login, register)
│   ├── (tabs)/             # Tab navigation (home, search, create, chat, profile)
│   ├── agent/              # Agent profiles and listings
│   ├── property/           # Property detail screens
│   ├── search/             # Search and filter screens
│   ├── settings/           # App settings
│   └── wanted/             # Wanted listing screens
├── components/
│   ├── features/           # Feature-specific components
│   │   ├── chat/           # Chat UI components
│   │   ├── form/           # Post creation form
│   │   ├── home/           # Home screen components
│   │   ├── map/            # Map components
│   │   ├── property/       # Property cards and details
│   │   ├── search/         # Search and filter UI
│   │   └── ui/             # Shared UI components
│   └── ui/                 # Base UI primitives
├── lib/                    # Utilities and configurations
│   ├── supabase.ts         # Supabase client
│   ├── i18n.ts             # Internationalization setup
│   └── translations/       # Language files (en.json, mm.json)
├── store/                  # Zustand state stores
├── hooks/                  # Custom React hooks
├── services/               # API service layer
├── types/                  # TypeScript type definitions
└── utils/                  # Helper functions
```

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- Supabase project (for backend)

### Installation

1. Clone the repository

   ```bash
   git clone https://github.com/thetnaung-dev/Internship.git
   cd Internship
   ```

2. Install dependencies

   ```bash
   npm install
   ```

3. Set up environment variables

   Create a `.env` file in the root directory:

   ```
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_KEY=your_supabase_anon_key
   EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key
   ```

4. Start the development server

   ```bash
   npx expo start
   ```

5. Run on your device

   - **Android**: Press `a` to open in Android emulator or scan QR code with Expo Go
   - **iOS**: Press `i` to open in iOS simulator or scan QR code with Expo Go
   - **Web**: Press `w` to open in browser

## Supabase Setup

1. Create a new Supabase project
2. Run the migrations in `supabase/migrations/` to set up the database schema
3. Enable Row Level Security (RLS) policies
4. Configure Storage buckets for property images and videos
5. Enable Realtime for chat functionality

## License

MIT
