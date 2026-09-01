# Nest Finder — Diagrams

All diagrams for the Nest Finder (Expo React Native + Supabase) app. Each diagram lives as a standalone Mermaid `.mmd` file and is embedded below so GitHub renders it in this README.

| Diagram | File | Description |
| --- | --- | --- |
| Flow chart | [flowchart.mmd](./flowchart.mmd) | Full app flow with start / end states for every process |
| Sequence — auth | [sequence-auth.mmd](./sequence-auth.mmd) | Domain flow for "Login / Register" |
| Sequence — home | [sequence-home.mmd](./sequence-home.mmd) | Domain flow for "Browse / search", "Save / unsave", "Compare" |
| Sequence — search & map | [sequence-search.mmd](./sequence-search.mmd) | Domain flow for "Search", "View map markers", "View property detail" |
| Sequence — property detail | [sequence-detail.mmd](./sequence-detail.mmd) | Domain flow for "Call agent", "Flag & report", "Mark sold / delete" |
| Sequence — create post | [sequence-create.mmd](./sequence-create.mmd) | Domain flow for "Post property / hostel / wanted listing" |
| Sequence — chat | [sequence-chat.mmd](./sequence-chat.mmd) | Domain flow for "Chat with agent / seller", "Respond via chat" |
| Sequence — profile | [sequence-profile.mmd](./sequence-profile.mmd) | Domain flow for "Manage My Listings", "Manage profile", "Receive notifications" |
| Sequence — buyer & seller process | [sequence-seller.mmd](./sequence-seller.mmd) | Domain flow for the full deal: seller posts, buyer browses / saves / compares, both negotiate via chat, seller marks sold / deletes |
| Class diagram | [class.mmd](./class.mmd) | Supabase database tables as classes (same schema as ER) |
| ER diagram | [er.mmd](./er.mmd) | Supabase database schema and relationships |
| Use case diagram | [usecase.mmd](./usecase.mmd) | Actors and use cases (rendered as a flowchart; GitHub Mermaid has no `useCaseDiagram` support) |

## Flow chart

Shape legend:

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

## Sequence diagram — auth ("Login / Register")

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

## Sequence diagram — home ("Browse / search", "Save / unsave", "Compare")

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

## Sequence diagram — search & map ("Search", "View map markers", "View property detail")

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

## Sequence diagram — property detail ("Call agent", "Flag & report", "Mark sold / delete")

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

## Sequence diagram — create post ("Post property / hostel / wanted listing")

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

## Sequence diagram — chat ("Chat with agent / seller", "Respond via chat")

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

## Sequence diagram — profile ("Manage My Listings", "Manage profile", "Receive notifications")

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

## Sequence diagram — seller process ("Post property / hostel listing", "Manage My Listings", "Mark sold / delete", "Respond via chat")

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

## Class diagram (Supabase tables)

The same schema as the ER diagram, drawn as a class diagram: each table is a class, its columns are attributes, and the PK/FK associations are class relationships.

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

## ER diagram

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

## Use case diagram

> GitHub Mermaid does not support the native `useCaseDiagram` type, so the use case model is rendered as a flowchart with actors on the left and use cases grouped inside the app system boundary.

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
