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

Domain sequence diagrams, one per group of use cases from the Use-Case Diagram (Section 5). Participants are the Supabase domain entities from the ER diagram (Section 3), not UI screens.

### 2.1 Auth — "Login / Register"

```mermaid
sequenceDiagram
    actor User
    participant S as Session
    participant P as Profile
    participant T as PushToken

    User->>S: signUp(email, password, full_name)
    S->>P: upsert(id, full_name, email)
    P-->>User: profile created
    User->>S: signInWithPassword(email, password)
    S-->>User: session
    User->>S: signInWithOAuth(google)
    S-->>User: session + callback
    S->>P: sync avatar_url
    S->>T: register push token
    User->>S: resetPassword(new_password)
    S-->>User: password updated
    User->>S: signOut()
    S-->>User: session cleared
```

### 2.2 Browse, Save & Compare — "Browse / search properties" · "Save / unsave properties" · "Compare properties"

```mermaid
sequenceDiagram
    actor User
    participant P as Property
    participant SP as SavedProperty

    User->>P: browse (deal_type, property_type)
    P-->>User: public listings (is_flagged = false)
    User->>P: open property
    User->>SP: insert (user_id, property_id)
    SP-->>User: saved (UNIQUE pair)
    User->>SP: delete (user_id, property_id)
    SP-->>User: unsaved
    User->>P: compare (add / remove / clear)
    P-->>User: compare items
```

### 2.3 Search & Map — "Search properties" · "View map markers" · "View property detail"

```mermaid
sequenceDiagram
    actor User
    participant P as Property
    participant R as Region / Township
    participant V as PropertyView
    participant A as Agent (Profile)

    User->>P: search (deal, region, type, price, rooms)
    P->>R: filter by state_region_id / township_id
    R-->>P: matching rows
    P-->>User: result list
    User->>P: view map (lat / lng)
    P-->>User: markers
    User->>P: open property detail
    P->>V: increment_property_views(user_id)
    V-->>P: counted
    P-->>User: property + related
    User->>A: agent profile
    A-->>User: listings + stats
```

### 2.4 Property Detail — "View property detail" · "Call agent" · "Flag & report listing" · "Mark sold / delete"

```mermaid
sequenceDiagram
    actor User
    participant P as Property
    participant V as PropertyView
    participant C as Conversation
    participant R as PropertyReport

    User->>P: open property detail
    P->>V: increment_property_views(user_id)
    V-->>P: view counted
    alt owner
        User->>P: update is_sold = true, sold_at
        P-->>User: marked sold
        User->>P: delete listing
        P-->>User: removed
    else non-owner
        User->>C: find-or-create (property, buyer, seller)
        C-->>User: conversationId
        User->>R: insert (reason)
        R->>P: is_flagged = true
        P-->>User: flagged (hidden from public)
    end
```

### 2.5 Create Post — "Post property listing" · "Post hostel listing" · "Post wanted listing"

```mermaid
sequenceDiagram
    actor User
    participant P as Property
    participant W as WantedListing
    participant N as Notification
    participant O as Other Users

    User->>P: insert (property / hostel, media)
    P-->>User: id + ad_number (PROP-xxxxx)
    P->>N: notify-new-property (fan-out)
    N-->>O: new_property notification + push
    User->>W: insert (deal_type, budget, phone)
    W-->>User: wanted listing created
    User->>W: view (increment_wanted_listing_views)
```

### 2.6 Chat — "Chat with agent / seller" · "Respond via chat" · "Receive notifications"

```mermaid
sequenceDiagram
    actor User
    participant C as Conversation
    participant M as Message
    participant N as Notification
    participant O as Counterpart

    User->>C: open (find-or-create)
    C-->>User: conversation + unread counts
    C-->>M: history (asc)
    User->>M: insert (text / attachment)
    M-->>C: realtime INSERT / UPDATE
    M->>N: notify-new-message
    N-->>O: new_message notification + push
    User->>M: edit / delete / pin / reply
    User->>M: mark read (read_at)
    C-->>User: unread counts updated
```

### 2.7 Profile, My Listings & Notifications — "Manage My Listings" · "Manage profile & settings" · "Receive notifications"

```mermaid
sequenceDiagram
    actor User
    participant P as Profile
    participant L as My Listings
    participant N as Notification
    participant S as Session

    User->>P: fetch profile
    P-->>User: profile row
    User->>L: select own properties + post count
    L-->>User: listings + monthly limit
    User->>P: update (full_name, avatar_url)
    P-->>User: profileUpdated event
    User->>N: fetch notifications
    N-->>User: list
    User->>N: mark read (read_at) / clear all
    User->>S: signOut()
    S-->>User: session cleared → Login
```

### 2.8 Seller Process — "Post property listing" · "Post hostel listing" · "Manage My Listings" · "Mark sold / delete" · "Respond via chat"

```mermaid
sequenceDiagram
    actor Seller
    participant P as Property
    participant L as My Listings
    participant N as Notification
    participant C as Conversation
    participant M as Message
    participant B as Buyer

    Seller->>P: post listing (property / hostel, media)
    P-->>Seller: id + ad_number (PROP-xxxxx)
    P->>N: notify-new-property (fan-out)
    N-->>B: new_property notification + push
    Seller->>L: open My Listings
    L-->>Seller: own listings + monthly post limit
    Seller->>L: filter tab (For Sale / For Rent / Sold)
    L-->>Seller: filtered listings
    Seller->>P: update is_sold = true, sold_at
    P-->>Seller: marked sold
    Seller->>P: delete listing
    P-->>Seller: removed
    Seller->>C: open conversation (property, buyer)
    C-->>Seller: seller_unread_count
    Seller->>M: insert reply (text / attachment)
    M->>N: notify-new-message
    N-->>B: new_message notification + push
    Seller->>M: mark read (read_at)
    C-->>Seller: unread cleared
```



Frontend-focused sequence diagrams for each flow in the flowchart, showing the screens the user interacts with and the key Supabase calls. The database is shown as a single participant per flow.

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

## 4. Class Diagram (Supabase Tables)

Class representation of the Supabase database tables — the same schema as the ER diagram (Section 3) — with each table's columns as class attributes and the PK/FK associations between them.

```mermaid
classDiagram
    direction TB

    namespace Tables {
        class Profile {
            +uuid id PK
            +text full_name
            +text email
            +text avatar_url
            +text phone
            +text city
            +text region
            +timestamptz created_at
        }
        class Property {
            +uuid id PK
            +uuid user_id FK
            +int ad_number
            +text deal_type
            +text property_type
            +text state_region_id FK
            +text township_id FK
            +text floor
            +numeric price
            +text currency_unit
            +numeric sqft
            +int bedrooms
            +int bathrooms
            +text title_mm
            +text title_en
            +text[] images
            +text video_url
            +text description
            +float latitude
            +float longitude
            +boolean is_sold
            +boolean is_rented
            +boolean is_flagged
            +int views
            +timestamptz created_at
            +timestamptz sold_at
        }
        class WantedListing {
            +uuid id PK
            +uuid user_id FK
            +text title
            +text deal_type
            +text property_type
            +text region_id FK
            +text township_id FK
            +numeric budget_min
            +numeric budget_max
            +text contact_phone
            +text status
            +int views
            +timestamptz created_at
        }
        class Conversation {
            +uuid id PK
            +uuid property_id FK
            +uuid buyer_id FK
            +uuid seller_id FK
            +int buyer_unread_count
            +int seller_unread_count
            +boolean muted
            +boolean archived
            +boolean pinned
            +timestamptz created_at
            +timestamptz updated_at
        }
        class Message {
            +uuid id PK
            +uuid conversation_id FK
            +uuid sender_id FK
            +text text
            +jsonb attachment
            +uuid reply_to_id FK
            +boolean private
            +boolean pinned_by_buyer
            +boolean pinned_by_seller
            +timestamptz read_at
            +timestamptz created_at
        }
        class Notification {
            +uuid id PK
            +uuid user_id FK
            +text type
            +uuid actor_id FK
            +uuid property_id FK
            +uuid conversation_id FK
            +text title
            +text body
            +timestamptz read_at
            +timestamptz created_at
        }
        class SavedProperty {
            +uuid id PK
            +uuid user_id FK
            +uuid property_id FK
            +timestamptz created_at
        }
        class SavedSearch {
            +uuid id PK
            +uuid user_id FK
            +text name
            +jsonb search_params
            +timestamptz created_at
        }
        class PropertyView {
            +uuid user_id FK
            +uuid property_id FK
            +timestamptz viewed_at
        }
        class WantedListingView {
            +uuid user_id FK
            +uuid listing_id FK
            +timestamptz viewed_at
        }
        class PropertyReport {
            +uuid id PK
            +uuid property_id FK
            +uuid reporter_id FK
            +text reason
            +timestamptz created_at
        }
        class PushToken {
            +uuid id PK
            +uuid user_id FK
            +text token
            +text platform
            +timestamptz created_at
            +timestamptz updated_at
        }
        class StatesRegion {
            +text id PK
            +text name_en
            +text name_mm
        }
        class Township {
            +text id PK
            +text name_en
            +text name_mm
            +text state_region_id FK
        }
    }

    Profile "1" --> "many" Property : posts
    Profile "1" --> "many" WantedListing : posts
    Profile "1" --> "many" SavedProperty : saves
    Profile "1" --> "many" Notification : receives
    Profile "1" --> "many" PropertyReport : reports
    Profile "1" --> "many" Conversation : buyer
    Profile "1" --> "many" Conversation : seller
    Profile "1" --> "many" Message : sends
    Property "1" --> "many" SavedProperty : has
    Property "1" --> "many" PropertyReport : has
    Property "1" --> "many" PropertyView : viewed
    Property "1" --> "many" Conversation : about
    Conversation "1" --> "many" Message : contains
    StatesRegion "1" --> "many" Township : has
    StatesRegion "1" --> "many" Property : locates
    Township "1" --> "many" Property : locates

```

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
