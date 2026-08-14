# Nest Finder — Application Diagrams

Expo React Native (expo-router) + Supabase app for property listing, search, chat, and notifications.

---

## 1. Flow Chart (App Navigation & User Flow)

```mermaid
flowchart TD
    A([App Launch / Splash]) --> B{Logged in?}
    B -- No --> C[Onboarding]
    C --> D{Auth choice}
    D --> E[Login]
    D --> F[Register]
    D --> G[Forgot / Reset Password]
    E --> H
    F --> H
    G --> E
    B -- Yes --> H[(Tabs)]

    H --> I[Home Tab]
    H --> J[Map Tab]
    H --> K[Create Post Tab]
    H --> L[Chat Tab]
    H --> M[Profile Tab]

    I --> I1{Category?}
    I1 --> I2[All / For Rent / For Sale / Apartment / Condo / Hostel]
    I2 --> I3{Sub-filter?}
    I3 --> I4[Affordable / Sold / Rented]
    I4 --> I5[Browse property cards]
    I5 --> I6{Card action}
    I6 --> I7[Open detail]
    I6 --> I8[Save / Unsave]
    I6 --> I9[Compare]
    I5 --> I10[Tap bell icon]
    I10 --> I11[Notifications screen]

    J --> J1[Load map + markers]
    J1 --> J2[Filter by category]
    J2 --> J3[Tap marker]
    J3 --> J4[Property card]
    J4 --> J5[Open detail]

    K --> K1{Listing type}
    K1 --> K2[Property listing]
    K1 --> K3[Wanted listing]
    K2 --> K4[Multi-step form]
    K4 --> K5[Upload images/video]
    K5 --> K6[Publish to properties]
    K3 --> K7[Wanted form]
    K7 --> K8[Publish to wanted_listings]

    L --> L1{Conversation selected?}
    L1 -- Yes --> L2[Chat room]
    L2 --> L3[Send / edit / delete / pin messages]
    L1 -- No --> L4[Empty chat state]

    M --> M1[Profile]
    M1 --> M2{Options}
    M2 --> M3[My Listings]
    M2 --> M4[Saved Properties]
    M2 --> M5[Settings]
    M2 --> M6[Help & Support]
    M2 --> M7[Compare]
    M3 --> M3a[Mark sold / delete]
    M5 --> M5a[Account / Notifications / Privacy]
    M1 --> M8[Logout]
    M8 --> C

    I7 --> I7a[Property detail]
    I7a --> I7b{Owner?}
    I7b -- Yes --> I7c[Mark sold / Delete]
    I7b -- No --> I7d[Call agent / Chat / Save / Compare]
    I7a --> I7e[Flag & Report]
    I7e --> I7f[Submit property report]
```

---

## 2. Sequence Diagram — Send a Chat Message with Notifications

```mermaid
sequenceDiagram
    autonumber
    actor Sender as Sender (User A)
    participant App as Chat Screen
    participant Supa as Supabase API
    participant DB as Postgres
    participant Trig as Trigger notify_new_message
    participant NB as Notifications Table
    participant Recipient as Recipient (User B)

    Sender->>App: Type message + tap send
    App->>App: Check editing / attachments
    App->>Supa: INSERT into messages
    Note over App,Supa: {conversation_id, sender_id, text, attachment?, reply_to_id}
    Supa->>DB: Insert row (RLS: participant only)
    DB-->>Trig: AFTER INSERT fires
    Trig->>Trig: Look up conversation, find OTHER participant
    Trig->>NB: INSERT notification {user_id=other, type='new_message', body=text}
    DB-->>Supa: Return inserted row
    Supa-->>App: Data / error
    App-->>Sender: Optimistic render + clear input
    Recipient->>App: Opens Chat / Notification screen
    App->>Supa: SELECT notifications (user_id = me)
    Supa-->>App: List incl. new_message
    App->>Supa: UPDATE notifications SET read_at (mark read)
    Recipient->>App: Tap notification → open /chat/{conversationId}
```

---

## 3. Sequence Diagram — Publish a Property + Broadcast Notifications

```mermaid
sequenceDiagram
    autonumber
    actor Owner as Owner
    participant App as Create Post Screen
    participant Storage as Supabase Storage
    participant Supa as Supabase API
    participant DB as Postgres
    participant Trig as Trigger notify_new_property
    participant NB as Notifications Table

    Owner->>App: Fill multi-step form
    App->>App: Validate steps (title, phone, location)
    App->>Storage: Upload images / video (property-media)
    Storage-->>App: Public URLs
    App->>Supa: INSERT into properties
    Note over App,Supa: {user_id, deal_type, property_type, price, images, ...}
    Supa->>DB: Insert row (RLS: auth.uid() = user_id)
    DB-->>Trig: AFTER INSERT fires
    Trig->>Trig: SELECT profiles WHERE id <> new.user_id
    Trig->>NB: INSERT notifications {user_id=<each user>, type='new_property', title='New Property'}
    DB-->>Supa: Return inserted row + ad_number
    Supa-->>App: OK (PROP-xxxxx)
    App-->>Owner: Success alert, navigate to home/wanted
```

---

## 4. Class Diagram (App Components / Modules)

```mermaid
classDiagram
    direction LR

    class AppRoutes {
        +index (Onboarding)
        +(auth)/login|register|forgot|reset
        +(tabs)/index|map|create_post|chat|profile
        +property/[id] | detail
        +wanted/index | [id] | create
        +notifications
        +compare | saved-properties | my-listings
        +settings/* | edit-profile | help-support
    }

    class AuthLayer {
        +LoginScreen
        +RegisterScreen
        +ForgotPasswordScreen
        +ResetPasswordScreen
        +handleAuthCallbackUrl(url)
    }

    class HomeFeature {
        +HomeScreen
        +Cards
        +fetchProperties(category)
        +handleSave(propertyId)
        +handleCompare(property)
    }

    class MapFeature {
        +MapTabScreen
        +buildMapHtml(html)
        +WebView map
        +markers/popups
    }

    class ChatFeature {
        +chat_list
        +chat_screen
        +sendMessage()
        +editMessage()
        +deleteMessage()
        +pinMessage()
        +uploadAttachment()
    }

    class CreatePostFeature {
        +CreatePostScreen
        +createpostform
        +uploadImages()
        +publishProperty()
        +publishWanted()
    }

    class PropertyDetail {
        +Details
        +CompareScreen
        +PropertyMapScreen
        +handleDelete()
        +handleReport()
        +handleContact()
    }

    class ProfileFeature {
        +ProfileScreen
        +MyListingsScreen
        +SavedPropertiesScreen
        +HelpSupportScreen
        +EditProfileScreen
    }

    class SettingsFeature {
        +SettingsScreen
        +AccountSettingsScreen
        +NotificationSettingsScreen
        +PrivacySettingsScreen
    }

    class NotificationFeature {
        +NotificationsScreen
        +fetchNotifications()
        +markRead()
        +handlePress()
    }

    class SharedLib {
        +supabase client
        +i18n (en/mm)
        +notifications (push)
        +handleAuthCallback
    }

    class SharedComponents {
        +BackButton
        +Skeleton
        +ImageViewer
        +AlertDialog
        +BottomSheet
        +ActionSheet
    }

    class Supabase {
        +auth
        +database (14 tables)
        +storage (property-media)
        +realtime (messages/conversations)
        +edge functions (notify-new-property)
    }

    AppRoutes --> AuthLayer
    AppRoutes --> HomeFeature
    AppRoutes --> MapFeature
    AppRoutes --> ChatFeature
    AppRoutes --> CreatePostFeature
    AppRoutes --> PropertyDetail
    AppRoutes --> ProfileFeature
    AppRoutes --> SettingsFeature
    AppRoutes --> NotificationFeature
    HomeFeature --> SharedComponents
    PropertyDetail --> SharedComponents
    ChatFeature --> SharedComponents
    HomeFeature --> SharedLib
    ChatFeature --> SharedLib
    CreatePostFeature --> SharedLib
    NotificationFeature --> SharedLib
    SharedLib --> Supabase
```

---

## 5. ER Diagram (Supabase Database)

```mermaid
erDiagram
    PROFILES ||--o{ PROPERTIES : posts
    PROFILES ||--o{ WANTED_LISTINGS : posts
    PROFILES ||--o{ SAVED_PROPERTIES : saves
    PROFILES ||--o{ SAVED_SEARCHES : owns
    PROFILES ||--o{ PUSH_TOKENS : has
    PROFILES ||--o{ NOTIFICATIONS : receives
    PROFILES ||--o{ PROPERTY_REPORTS : reports
    PROPERTIES ||--o{ SAVED_PROPERTIES : "saved in"
    PROPERTIES ||--o{ PROPERTY_REPORTS : "flagged in"
    PROPERTIES ||--o{ PROPERTY_VIEWS : viewed
    PROPERTIES ||--o{ CONVERSATIONS : "chat about"
    CONVERSATIONS ||--o{ MESSAGES : contains
    PROFILES ||--o{ MESSAGES : sends
    PROFILES ||--o{ CONVERSATIONS : "participates (buyer)"
    PROFILES ||--o{ CONVERSATIONS : "participates (seller)"
    WANTED_LISTINGS ||--o{ WANTED_LISTING_VIEWS : viewed
    STATES_REGIONS ||--o{ TOWNSHIPS : has
    TOWNSHIPS ||--o{ PROPERTIES : locates
    STATES_REGIONS ||--o{ WANTED_LISTINGS : locates

    PROFILES {
        uuid id PK
        text full_name
        text email
        text avatar_url
        text phone
        text city
        text region
        timestamptz created_at
    }

    PROPERTIES {
        uuid id PK
        uuid user_id FK
        int ad_number
        text deal_type
        text property_type
        text state_region_id FK
        text township_id FK
        text floor
        numeric price
        text currency_unit
        numeric sqft
        int bedrooms
        int bathrooms
        text title_mm
        text title_en
        text[] images
        text video_url
        text description
        float latitude
        float longitude
        boolean is_sold
        boolean is_rented
        boolean is_flagged
        int views
        timestamptz created_at
        timestamptz sold_at
    }

    WANTED_LISTINGS {
        uuid id PK
        uuid user_id FK
        text title
        text description
        text deal_type
        text property_type
        text region_id FK
        text township_id FK
        numeric budget_min
        numeric budget_max
        text contact_phone
        text status
        int views
        timestamptz created_at
    }

    CONVERSATIONS {
        uuid id PK
        uuid property_id FK
        uuid buyer_id FK
        uuid seller_id FK
        int buyer_unread_count
        int seller_unread_count
        boolean muted
        boolean archived
        boolean pinned
        timestamptz created_at
        timestamptz updated_at
    }

    MESSAGES {
        uuid id PK
        uuid conversation_id FK
        uuid sender_id FK
        text text
        jsonb attachment
        uuid reply_to_id
        boolean private
        boolean pinned_by_buyer
        boolean pinned_by_seller
        timestamptz read_at
        timestamptz created_at
    }

    NOTIFICATIONS {
        uuid id PK
        uuid user_id FK
        text type
        uuid actor_id FK
        uuid property_id FK
        uuid conversation_id FK
        text title
        text body
        timestamptz read_at
        timestamptz created_at
    }

    SAVED_PROPERTIES {
        uuid id PK
        uuid user_id FK
        uuid property_id FK
        timestamptz created_at
    }

    SAVED_SEARCHES {
        uuid id PK
        uuid user_id FK
        text name
        jsonb search_params
        timestamptz created_at
    }

    PROPERTY_VIEWS {
        uuid user_id FK
        uuid property_id FK
        timestamptz viewed_at
    }

    WANTED_LISTING_VIEWS {
        uuid user_id FK
        uuid listing_id FK
        timestamptz viewed_at
    }

    PROPERTY_REPORTS {
        uuid id PK
        uuid property_id FK
        uuid reporter_id FK
        text reason
        timestamptz created_at
    }

    PUSH_TOKENS {
        uuid id PK
        uuid user_id FK
        text token
        text platform
        timestamptz created_at
        timestamptz updated_at
    }

    STATES_REGIONS {
        text id PK
        text name_en
        text name_mm
    }

    TOWNSHIPS {
        text id PK
        text name_en
        text name_mm
        text state_region_id FK
    }
```

---

## 6. Use Case Diagram

```mermaid
flowchart TB
    subgraph Guest["Guest (unauthenticated)"]
        GU1[Browse properties]
        GU2[Search / filter properties]
        GU3[View map markers]
        GU4[View property detail]
        GU5[Login / Register]
        GU6[Forgot / Reset password]
    end

    subgraph User["Registered User"]
        U1[Post property listing]
        U2[Post wanted listing]
        U3[Chat with agents / sellers]
        U4[Send images in chat]
        U5[Save / unsave properties]
        U6[Compare properties]
        U7[Report a listing]
        U8[Receive notifications]
        U9[View notifications]
        U10[Manage My Listings]
        U11[Mark listing as sold]
        U12[Delete listing]
        U13[Manage profile & settings]
        U14[Call agent directly]
        U15[View saved properties]
        U16[Track post limit]
    end

    subgraph System["Supabase Backend"]
        S1[RLS policies]
        S2[Realtime channels]
        S3[View counters]
        S4[Unread counts]
        S5[Notification triggers]
        S6[Storage uploads]
    end

    Guest --> GU1
    Guest --> GU2
    Guest --> GU3
    Guest --> GU4
    Guest --> GU5
    Guest --> GU6

    User --> U1
    User --> U2
    User --> U3
    User --> U4
    User --> U5
    User --> U6
    User --> U7
    User --> U8
    User --> U9
    User --> U10
    User --> U10
    User --> U11
    User --> U12
    User --> U13
    User --> U14
    User --> U15
    User --> U16

    U1 --> S6
    U4 --> S6
    U3 --> S2
    U9 --> S5
    U3 --> S4
    U1 --> S1
    GU4 --> S1
    GU1 --> S3
```

---

## Notes

- **Tech stack**: Expo SDK 54, expo-router v6 (file-based routing), NativeWind v4 (Tailwind), gluestack-ui, react-i18next (en + mm), @shopify/flash-list, react-native-webview (Leaflet map), Supabase (auth, Postgres, Storage, Realtime).
- **Auth guard**: App launch → `index.tsx` checks `supabase.auth.getUser()` → redirects to `(tabs)` or onboarding.
- **RLS model**: Most tables enforce `auth.uid()` ownership; properties are publicly readable (except flagged), writes restricted to owner.
- **Flagged listings**: `property_reports` sets `is_flagged = true`; all public queries filter `is_flagged = false`. Owners still see their own in My Listings.
- **Notifications**: DB triggers `notify_new_property` (fan-out to all other users) and `notify_new_message` (to conversation counterpart) insert into `notifications`.
