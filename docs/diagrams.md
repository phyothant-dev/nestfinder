# Nest Finder — Diagrams

All diagrams for the Nest Finder app (Expo React Native + Supabase) in one file: full app flowchart, per-flow sequence diagrams, ER diagram, class diagram, use-case diagram, and the database tables.

---

## 1. Full App Flowchart

One flowchart for the whole app. Shape legend:

| Shape | Meaning |
| --- | --- |
| `[ box ]` | Process / action |
| `{ diamond }` | Decision (Yes / No) |
| `[ / box / ]` | Input / output (user input, screen output) |
| `( [ stadium ] )` | Start / End |
| `( ( database ) )` | Database |

```mermaid
%%{init: {"flowchart": {"curve": "stepAfter", "nodeSpacing": 40, "rankSpacing": 50}}}%%
flowchart TB
    Start(["Start"]) --> Splash["Splash + Auth Guard"]
    Splash --> Logged{"Logged in?"}
    Logged -- No --> Onboarding["Onboarding"]
    Logged -- Yes --> Tabs
    Onboarding --> AuthChoice{"Auth choice"}
    AuthChoice -- Login --> Login[/"Login"/]
    AuthChoice -- Register --> Register[/"Register"/]
    AuthChoice -- Forgot --> Forgot[/"Forgot / Reset"/]
    Register --> Login
    Forgot --> Login
    Login --> Tabs

    Tabs["Main Tabs<br/>(Home · Map · Create · Chat · Profile)"]
    Tabs --> HomeTab["Home"]
    Tabs --> MapTab["Map"]
    Tabs --> CreateTab["Create Post"]
    Tabs --> ChatTab["Chat"]
    Tabs --> ProfileTab["Profile"]

    HomeTab --> Browse[/"Browse property cards"/]
    Browse --> SaveCompare["Save / Unsave / Compare"]
    SaveCompare --> EndHome(["End"])
    Browse --> Detail["Property Detail"]
    Detail --> Owner{"Owner?"}
    Owner -- Yes --> Own["Mark Sold / Delete"]
    Own --> EndHome
    Owner -- No --> Guest["Call / Chat / Report"]
    Guest --> EndHome
    HomeTab --> Notif[/"Notifications"/]
    Notif --> EndHome

    MapTab -->|view markers| Detail

    CreateTab --> LType{"Listing type"}
    LType -- Property --> PropForm[/"Property form<br/>(upload + publish)"/]
    PropForm --> EndCreate(["End → Home"])
    LType -- Wanted --> WantedForm[/"Wanted form<br/>(publish)"/]
    WantedForm --> EndWanted(["End → Wanted List"])

    ChatTab --> CList["Conversation list"]
    CList --> CRoom["Chat room<br/>(send / edit / pin)"]
    CRoom --> EndChat(["End"])

    ProfileTab --> MyL["My Listings / Saved"]
    ProfileTab --> Settings["Settings / Account"]
    ProfileTab --> Logout["Logout"]
    MyL --> EndProfile(["End"])
    Settings --> EndProfile
    Logout --> EndLogin(["End → Login"])

    Tabs --> DB[("Supabase")]
```

---

## 2. Sequence Diagrams

Frontend-focused sequence diagrams for each flow in the flowchart, showing the screens the user interacts with and the key Supabase calls. The database is shown as a single participant per flow.

### 2.1 Onboarding & Auth

```mermaid
sequenceDiagram
    actor User
    participant OB as Onboarding (index)
    participant AU as Auth Screens<br/>(Login / Register / Forgot)
    participant CO as App Core<br/>(Session · Language · Push)
    participant SU as Supabase (Auth)

    User->>OB: Launch app
    OB->>CO: loadLanguage() + setup listeners
    OB->>SU: auth.getUser()
    alt logged in
        SU-->>OB: session exists
        OB-->>User: replace → Main Tabs
    else not logged in
        SU-->>OB: no session
        OB-->>User: show onboarding
        User->>OB: tap Get Started
        OB->>AU: open Login / Register
        alt email / password
            User->>AU: enter email + password
            AU->>SU: auth.signInWithPassword()
            SU-->>AU: session / error
            AU->>CO: register push token
            AU-->>User: replace → Main Tabs
        else Google
            User->>AU: tap Continue with Google
            AU->>SU: auth.signInWithOAuth()
            SU-->>AU: open auth/callback
            AU->>AU: handleAuthCallbackUrl()
            AU->>CO: sync profile avatar
            AU-->>User: replace → Main Tabs
        end
    end
```

### 2.2 Browse & Save / Unsave / Compare (Home)

```mermaid
sequenceDiagram
    actor User
    participant HO as Home Screen
    participant CD as Property Card
    participant CO as App Core<br/>(savedIds · compare store)
    participant SU as Supabase

    User->>HO: open Home tab
    HO->>CO: fetch profile + saved ids
    HO->>SU: select properties (is_flagged = false)
    SU-->>HO: property list
    HO->>HO: render cards
    User->>CD: tap heart (save)
    CD->>HO: onSave(propertyId)
    HO->>CO: auth.getUser()
    alt not signed in
        CO-->>HO: no user → redirect Login
    else saved
        HO->>SU: delete saved_properties
        SU-->>HO: ok
        HO->>HO: remove from savedIds
    else not saved
        HO->>SU: insert saved_properties
        SU-->>HO: ok
        HO->>HO: add to savedIds
    end
    HO->>HO: emit savedPropertiesChanged
    User->>CD: tap compare icon
    CD->>HO: onCompare(property)
    HO->>CO: compareStore.add(property)
    CO-->>HO: floating compare bar
    User->>HO: tap Compare bar
    HO-->>User: open Compare Screen
```

### 2.3 Search & Map

```mermaid
sequenceDiagram
    actor User
    participant SE as Search Screen
    participant MA as Map Tab
    participant SU as Supabase

    User->>SE: open Search
    SE->>SU: load states_regions + townships
    SU-->>SE: location data
    User->>SE: set filters (deal, region, type, price, rooms)
    User->>SE: tap Search
    SE->>SU: select properties (filtered)
    SU-->>SE: results
    SE-->>User: show result cards
    User->>SE: tap result card
    SE-->>User: open Property Detail

    User->>MA: open Map tab
    MA->>SU: request location + select properties (lat/lng)
    SU-->>MA: markers
    MA->>MA: build Leaflet HTML (WebView)
    User->>MA: tap marker
    MA-->>User: open Property Detail
```

### 2.4 Property Detail (Owner / Non-owner / Report)

```mermaid
sequenceDiagram
    actor User
    participant DE as Property Detail
    participant CO as App Core
    participant SU as Supabase

    User->>DE: open property
    DE->>SU: select property + agent + related
    SU-->>DE: property row
    DE->>SU: rpc increment_property_views
    SU-->>DE: view counted

    alt owner
        User->>DE: tap Mark Sold
        DE->>SU: update is_sold = true
        SU-->>DE: ok
        DE-->>User: back
        User->>DE: tap Delete
        DE->>SU: delete property
        SU-->>DE: ok
        DE-->>User: back
    else non-owner
        User->>DE: tap Call
        DE-->>User: open tel: dialer
        User->>DE: tap Chat
        DE->>CO: auth.getUser()
        DE->>SU: find-or-create conversation
        SU-->>DE: conversationId
        DE->>SU: insert first message
        DE-->>User: open Chat room
        User->>DE: tap Flag & Report
        DE->>SU: insert property_reports + set is_flagged
        SU-->>DE: ok
        DE-->>User: thank-you dialog
    end
```

### 2.5 Create Post (Property / Wanted)

```mermaid
sequenceDiagram
    actor User
    participant CP as Create Post Screen
    participant FM as Listing Form
    participant CO as App Core
    participant ST as Storage
    participant SU as Supabase

    User->>CP: open Create Post tab
    CP->>CO: auth.getSession()
    alt not signed in
        CO-->>CP: no session
        CP-->>User: login dialog → Login
    else signed in
        User->>CP: choose listing type (sale / rent / hostel / wanted)
        CP->>FM: render form
        User->>FM: fill info + details + location
        alt wanted
            User->>FM: set budget / fee range + phone
            FM->>SU: insert wanted_listings
            SU-->>FM: ok
            FM-->>User: alert → Wanted List
        else property
            User->>FM: pick photos / video
            FM->>ST: upload to property-media
            ST-->>FM: public URLs
            FM->>SU: insert properties
            SU-->>FM: id + ad_number
            FM->>SU: invoke notify-new-property
            FM-->>User: alert (PROP-xxxxx) → Home
        end
    end
```

### 2.6 Chat

```mermaid
sequenceDiagram
    actor User
    participant CL as Chat List
    participant CR as Chat Room
    participant CO as App Core<br/>(unread badge)
    participant RT as Realtime Channel
    participant SU as Supabase

    User->>CL: open Chat tab
    CL->>SU: select conversations + profiles
    SU-->>CL: conversations (unread counts)
    CL->>CO: rpc get_total_unread_count
    CO-->>CL: badge
    User->>CL: open conversation
    CL-->>User: open Chat room
    CR->>SU: select messages (asc)
    SU-->>CR: history
    CR->>RT: subscribe messages:{channelId}
    RT-->>CR: realtime INSERT / UPDATE
    User->>CR: type + tap send
    CR->>SU: insert message (text / attachment)
    SU-->>CR: ok
    CR->>CR: optimistic render + clear input
    CR->>CO: mark read + refresh unread
    User->>CR: long-press message
    User->>CR: edit / delete / pin / reply
    CR->>SU: update / delete message
    SU-->>CR: ok
```

### 2.7 Profile / My Listings / Settings

```mermaid
sequenceDiagram
    actor User
    participant PR as Profile Screen
    participant ML as My Listings
    participant SE as Settings / Account
    participant CO as App Core
    participant SU as Supabase

    User->>PR: open Profile tab
    PR->>CO: auth.getUser()
    alt not signed in
        CO-->>PR: no user → redirect Login
    else signed in
        PR->>SU: select profile
        SU-->>PR: profile row
        PR-->>User: header + menus
        User->>PR: My Listings
        PR->>ML: open My Listings
        ML->>SU: select own properties + rpc post count
        SU-->>ML: listings + limit
        User->>ML: open listing → detail (mark sold / delete)
        User->>PR: Edit Profile
        PR->>SE: open Settings / Account
        User->>SE: edit full_name / avatar
        SE->>SU: upload avatar + update profile
        SU-->>SE: ok
        SE->>CO: emit profileUpdated
        User->>PR: tap Sign Out
        PR->>SU: auth.signOut()
        SU-->>PR: ok
        PR-->>User: redirect → Login
    end
```

---

## 3. ER Diagram (Supabase Database)

```mermaid
erDiagram
    PROFILES ||--o{ PROPERTIES : posts
    PROFILES ||--o{ WANTED_LISTINGS : posts
    PROFILES ||--o{ SAVED_PROPERTIES : saves
    PROFILES ||--o{ SAVED_SEARCHES : owns
    PROFILES ||--o{ PUSH_TOKENS : has
    PROFILES ||--o{ NOTIFICATIONS : receives
    PROFILES ||--o{ PROPERTY_REPORTS : reports
    PROFILES ||--o{ CONVERSATIONS : "participates (buyer)"
    PROFILES ||--o{ CONVERSATIONS : "participates (seller)"
    PROFILES ||--o{ MESSAGES : sends
    PROPERTIES ||--o{ SAVED_PROPERTIES : "saved in"
    PROPERTIES ||--o{ PROPERTY_REPORTS : "flagged in"
    PROPERTIES ||--o{ PROPERTY_VIEWS : viewed
    PROPERTIES ||--o{ CONVERSATIONS : "chat about"
    CONVERSATIONS ||--o{ MESSAGES : contains
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

## 4. Class Diagram

The main screens, stores, services, and domain models, grouped into namespaces.

```mermaid
classDiagram
    direction TB

    namespace Screens {
        class HomeScreen {
            -properties: Property[]
            -savedIds: Set
            +fetchProperties(category)
            +handleSave(propertyId)
            +handleCompare(property)
        }
        class PropertyDetailScreen {
            -property: Property
            -agent: Profile
            +fetchPropertyDetails()
            +handleChat()
            +handleReport()
            +handleDelete()
        }
        class AgentScreen {
            -agent: Profile
            -listings: Property[]
            +handleCall()
            +handleChat()
            +handleSave()
        }
        class SearchScreen {
            -results: Property[]
            -filters
            +handleSearchSubmit()
        }
        class ChatScreen {
            -messages: Message[]
            +sendMessage()
        }
        class MapTabScreen {
            +loadProperties(loc)
            +centerOnUser()
        }
        class CreatePostForm {
            -dealType
            +handleSubmitPost()
            +uploadImages()
        }
        class ProfileScreen {
            +fetchProfile()
            +handleLogout()
        }
    }

    namespace Stores {
        class useThemeStore {
            +theme
            +setTheme()
        }
        class useLanguageStore {
            +language
            +setLanguage()
        }
        class useCompareStore {
            +items: Property[]
            +add(property)
            +remove(id)
            +clear()
        }
        class useNetworkStore {
            +isOnline
            +setOnline()
        }
    }

    namespace Services {
        class SupabaseClient {
            +auth
            +from(table)
            +storage
            +rpc(name)
        }
        class Notifications {
            +registerForPushNotifications()
            +savePushToken()
            +setupNotificationListeners()
        }
    }

    namespace Models {
        class Property {
            +id: string
            +title_en: string
            +title_mm: string
            +price: number
            +deal_type: string
            +property_type: string
            +images: string[]
            +is_sold: boolean
        }
        class Profile {
            +id: string
            +full_name: string
            +avatar_url: string
            +phone: string
        }
        class Message {
            +id: string
            +text: string
            +attachment
            +reply_to_id
            +pinned_by_buyer
            +pinned_by_seller
        }
        class Conversation {
            +id: string
            +buyer_unread_count
            +seller_unread_count
            +muted
            +archived
            +pinned
        }
    }

    namespace UI {
        class Card {
            +item: Property
            +isSaved: boolean
            +onSave()
            +onCompare()
        }
        class Skeleton {
            +PropertyCardSkeleton
            +ChatListSkeleton
        }
        class SegmentedToggle {
            +options
            +value
            +onChange()
        }
    }

    HomeScreen --> Card : renders
    PropertyDetailScreen --> Card : renders
    AgentScreen --> Card : renders
    SearchScreen --> Card : renders

    HomeScreen --> SupabaseClient
    PropertyDetailScreen --> SupabaseClient
    AgentScreen --> SupabaseClient
    SearchScreen --> SupabaseClient
    ChatScreen --> SupabaseClient
    MapTabScreen --> SupabaseClient
    CreatePostForm --> SupabaseClient
    ProfileScreen --> SupabaseClient
    Notifications --> SupabaseClient

    HomeScreen --> useCompareStore
    HomeScreen --> useThemeStore
    HomeScreen --> useLanguageStore
    useThemeStore --> useNetworkStore
    ProfileScreen --> useLanguageStore
```

---

## 5. Use-Case Diagram

Mermaid has no native use-case diagram, so this uses a flowchart with actor nodes and use-case ellipses inside the system boundary.

```mermaid
flowchart LR
    subgraph SYSTEM["📱 Nest Finder App (system boundary)"]
        direction TB
        subgraph G1["Guest use cases"]
            U1(("🔍 Browse / search properties"))
            U2(("🗺️ View map markers"))
            U3(("📄 View property detail"))
            U4(("🔑 Login / Register"))
        end
        subgraph G2["Buyer use cases"]
            U5(("💾 Save / unsave properties"))
            U6(("⚖️ Compare properties"))
            U7(("💬 Chat with agent / seller"))
            U8(("📞 Call agent"))
            U9(("🚩 Flag & report listing"))
            U10(("📋 Post wanted listing"))
            U11(("🔔 Receive notifications"))
        end
        subgraph G3["Owner / Seller use cases"]
            U12(("🏠 Post property listing"))
            U13(("🏢 Post hostel listing"))
            U14(("📂 Manage My Listings"))
            U15(("✅ Mark sold / delete"))
            U16(("💬 Respond via chat"))
        end
        subgraph G4["Any-user use cases"]
            U17(("🛠️ Manage profile & settings"))
            U18(("🌐 Switch language (EN / MM)"))
        end
    end
    A1(["👤 Guest"]) --> U1
    A1 --> U2
    A1 --> U3
    A1 --> U4
    A2(["👤 Buyer"]) --> U5
    A2 --> U6
    A2 --> U7
    A2 --> U8
    A2 --> U9
    A2 --> U10
    A2 --> U11
    A3(["👤 Owner / Seller"]) --> U12
    A3 --> U13
    A3 --> U14
    A3 --> U15
    A3 --> U16
    A4(["👤 Any user"]) --> U17
    A4 --> U18
```

---

## 6. Database Tables

Enums: `deal_type` (`sale`, `rent`, `buy`, `launch`, `building`), `wanted.deal_type` (`buy`, `rent`), `wanted.status` (`active`, `filled`, `expired`).

### profiles

| Column | Type | Constraints |
| --- | --- | --- |
| id | uuid | PK → auth.users(id) |
| full_name | text | |
| email | text | |
| avatar_url | text | |
| phone | text | |
| city | text | |
| region | text | |
| created_at | timestamptz | default now() |

### properties

| Column | Type | Constraints |
| --- | --- | --- |
| id | uuid | PK |
| user_id | uuid | FK → profiles(id) |
| ad_number | int | server sequence → `PROP-{10000 + ad_number}` |
| deal_type | text | `sale` / `rent` / `launch` / `building` |
| property_type | text | `condo` / `apartment` / `house` / `land` / `hostel` |
| state_region_id | text | FK → states_regions(id) |
| township_id | text | FK → townships(id) |
| floor | text | |
| price | numeric | |
| currency_unit | text | |
| sqft | numeric | |
| bedrooms | int | |
| bathrooms | int | |
| title_mm | text | |
| title_en | text | |
| images | text[] | |
| video_url | text | |
| description | text | |
| latitude / longitude | float | |
| is_sold | boolean | |
| is_rented | boolean | |
| is_flagged | boolean | default false |
| views | int | |
| created_at | timestamptz | default now() |
| sold_at | timestamptz | |

### wanted_listings

| Column | Type | Constraints |
| --- | --- | --- |
| id | uuid | PK |
| user_id | uuid | FK → profiles(id) |
| title | text | |
| description | text | |
| deal_type | text | check `buy` / `rent` |
| property_type | text | |
| region_id | text | FK → states_regions(id) |
| township_id | text | FK → townships(id) |
| budget_min / budget_max | numeric | |
| contact_phone | text | |
| status | text | check `active` / `filled` / `expired` |
| views | int | |
| created_at | timestamptz | default now() |

### conversations

| Column | Type | Constraints |
| --- | --- | --- |
| id | uuid | PK |
| property_id | uuid | FK → properties(id) |
| buyer_id | uuid | FK → profiles(id) |
| seller_id | uuid | FK → profiles(id) |
| buyer_unread_count | int | |
| seller_unread_count | int | |
| muted | boolean | |
| archived | boolean | |
| pinned | boolean | |
| created_at / updated_at | timestamptz | |

### messages

| Column | Type | Constraints |
| --- | --- | --- |
| id | uuid | PK |
| conversation_id | uuid | FK → conversations(id) |
| sender_id | uuid | FK → profiles(id) |
| text | text | |
| attachment | jsonb | `{url, type, name, size}` |
| reply_to_id | uuid | FK → messages(id) |
| private | boolean | |
| pinned_by_buyer / pinned_by_seller | boolean | |
| read_at | timestamptz | |
| created_at | timestamptz | default now() |

### notifications

| Column | Type | Constraints |
| --- | --- | --- |
| id | uuid | PK |
| user_id | uuid | FK → profiles(id) |
| type | text | `new_property` / `new_message` |
| actor_id | uuid | FK → profiles(id) |
| property_id | uuid | FK → properties(id) |
| conversation_id | uuid | FK → conversations(id) |
| title / body | text | |
| read_at | timestamptz | null = unread |
| created_at | timestamptz | default now() |

### saved_properties

| Column | Type | Constraints |
| --- | --- | --- |
| id | uuid | PK |
| user_id | uuid | FK → profiles(id) |
| property_id | uuid | FK → properties(id) |
| created_at | timestamptz | default now() |
| — | — | UNIQUE (user_id, property_id) |

### saved_searches

| Column | Type | Constraints |
| --- | --- | --- |
| id | uuid | PK |
| user_id | uuid | FK → profiles(id) |
| name | text | |
| search_params | jsonb | |
| created_at | timestamptz | default now() |

### property_views

| Column | Type | Constraints |
| --- | --- | --- |
| user_id | uuid | FK → profiles(id) |
| property_id | uuid | FK → properties(id) |
| viewed_at | timestamptz | |
| — | — | PK (user_id, property_id) |

### wanted_listing_views

| Column | Type | Constraints |
| --- | --- | --- |
| user_id | uuid | FK → profiles(id) |
| listing_id | uuid | FK → wanted_listings(id) |
| viewed_at | timestamptz | |
| — | — | PK (user_id, listing_id) |

### property_reports

| Column | Type | Constraints |
| --- | --- | --- |
| id | uuid | PK |
| property_id | uuid | FK → properties(id) |
| reporter_id | uuid | FK → profiles(id) |
| reason | text | `spam` / `misleading` / `off_topic` / `other` |
| created_at | timestamptz | default now() |

### push_tokens

| Column | Type | Constraints |
| --- | --- | --- |
| id | uuid | PK |
| user_id | uuid | FK → profiles(id) |
| token | text | Expo push token |
| platform | text | |
| created_at / updated_at | timestamptz | |

### states_regions

| Column | Type | Constraints |
| --- | --- | --- |
| id | text | PK |
| name_en | text | |
| name_mm | text | |

### townships

| Column | Type | Constraints |
| --- | --- | --- |
| id | text | PK |
| name_en | text | |
| name_mm | text | |
| state_region_id | text | FK → states_regions(id) |

---

## Notes

- **Tech stack**: Expo SDK 54, expo-router v6 (file-based routing), NativeWind v4 (Tailwind), gluestack-ui, react-i18next (en + mm), @shopify/flash-list, react-native-webview (Leaflet map), Supabase (auth, Postgres, Storage, Realtime).
- **Auth guard**: App launch → `index.tsx` checks `supabase.auth.getUser()` → redirects to `(tabs)` or onboarding. Guests may still browse (Save/Chat/Create require login).
- **RLS model**: Most tables enforce `auth.uid()` ownership; properties are publicly readable (except flagged), writes restricted to owner.
- **Flagged listings**: `property_reports` sets `is_flagged = true`; all public queries filter `is_flagged = false`. Owners still see their own in My Listings.
- **Notifications**: DB triggers `notify_new_property` (fan-out to all other users) and `notify_new_message` (to conversation counterpart) insert into `notifications`; client additionally fires `notify-new-property` / `send-notification` edge functions for Expo push.
- **Views**: `increment_property_views` / `increment_wanted_listing_views` count each logged-in user once (owner's own views are skipped); anonymous views increment directly.
- **Monthly post limit**: `get_monthly_post_count` + `can_user_post` RPCs enforce 5 property/hostel posts per month (wanted posts are not limited).
