# Nestfinder — Diagrams

UML / architecture diagrams for the Nestfinder (Expo + Supabase) app. Each diagram lives as a standalone Mermaid `.mmd` file and is embedded below so GitHub renders it in this README.

| Diagram | File | Description |
| --- | --- | --- |
| Flow chart | [flowchart.mmd](./flowchart.mmd) | App-level navigation and feature flow |
| Sequence diagram (app flow) | [sequence-app.mmd](./sequence-app.mmd) | UI-screen flow: onboarding, home, login, detail, chat/create, profile/saved |
| Sequence diagram (save flow) | [sequence.mmd](./sequence.mmd) | Save / unsave a property with cross-screen sync |
| Class diagram | [class.mmd](./class.mmd) | Main screens, components, stores and services |
| ER diagram | [er.mmd](./er.mmd) | Supabase database schema and relationships |
| Use case diagram | [usecase.mmd](./usecase.mmd) | Actors and their use cases (rendered as a flowchart; GitHub Mermaid has no `useCaseDiagram` support) |

## Flow chart

```mermaid
flowchart TD
    A([Start]) --> B[Splash]
    B --> SB[(Supabase - Auth / Database / Storage)]
    B --> C{Signed in?}
    C -- No --> D[Onboarding]
    D --> E[Get Started]
    E --> F[Home]
    C -- Yes --> F

    F --> G[Browse & view properties]
    F --> H[Search / Map / Property detail]
    F --> I[Save / Compare / Share]
    F --> J[Chat / Create post / Profile]

    I -- guest --> K[Login / Register → returns to Home]
    J -- guest --> K

    F -- Exit app --> Z([End])
```

## Sequence diagram — app flow (from flowchart)

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant O as Onboarding
    participant H as Home
    participant L as Login / Register
    participant D as Property Detail
    participant C as Chat / Create Post
    participant P as Profile / Saved

    U->>O: Launch app
    O->>O: Check saved session

    opt signed in
        O->>H: Go to Home
    end

    opt signed out
        O->>O: Show onboarding
        U->>O: Tap Get Started
        O->>H: Go to Home
    end

    U->>H: Browse / Search / Map
    H->>D: Open property
    U->>D: View details / map / agent
    D->>H: Back to Home

    U->>H: Save / Chat / Create post / Profile
    opt guest
        H->>L: Open Login / Register
        U->>L: Email / Google
        L->>H: Session stored, back to Home
    end
    H->>C: Open Chat / Create post
    H->>P: Open Profile / Saved

    U->>O: Exit app
    O->>O: End
```

## Sequence diagram — save / unsave a property

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant C as Property Card
    participant H as HomeScreen
    participant S as Supabase
    participant EB as Event Bus
    participant SP as SavedPropertiesScreen

    U->>C: Tap heart icon
    C->>H: onSave(propertyId)
    H->>S: auth.getUser()

    opt user not signed in
        H->>U: Redirect to Login and stop
    end

    Note over H: Check local savedIds.has(propertyId)

    opt already saved
        H->>S: DELETE saved_properties(propertyId)
    end

    opt not saved
        H->>S: INSERT saved_properties(userId, propertyId)
    end

    H-->>C: savedIds updated, heart re-renders
    C->>U: Show animated heart state
    H->>EB: emit("savedPropertiesChanged")
    Note over EB,SP: Cross-screen sync
    EB-->>SP: listener refreshes saved list
    SP->>S: SELECT saved_properties
```

## Class diagram

```mermaid
classDiagram
    direction TB

    class HomeScreen {
        -properties: Property[]
        -savedIds: Set
        +fetchProperties(category)
        +handleSave(propertyId)
    }

    class PropertyDetailScreen {
        -property: Property
        -agent: Profile
        -related: Property[]
        +fetchPropertyDetails()
        +handleChat()
    }

    class AgentScreen {
        -agent: Profile
        -listings: Property[]
        -stats
        +handleCall()
        +handleChat()
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

    class Card {
        +item: Property
        +isSaved: boolean
        +onSave()
        +onCompare()
    }

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

    class useCompareStore {
        +items: Property[]
        +add(property)
        +remove(id)
        +clear()
    }

    class useThemeStore {
        +theme
        +resolvedTheme
        +setTheme()
        +loadTheme()
    }

    class useNetworkStore {
        +isOnline
        +setOnline()
    }

    class useLanguageStore {
        +language
        +setLanguage()
        +loadLanguage()
    }

    class i18n {
        +language
        +changeLanguage(lang)
    }

    class Property {
        +id: string
        +title_en: string
        +title_mm: string
        +price: number
        +currency_unit: string
        +deal_type: string
        +property_type: string
        +images: string[]
        +area_value: number
        +area_unit: string
        +floor: string
        +views: number
        +is_sold: boolean
    }

    class Profile {
        +id: string
        +full_name: string
        +avatar_url: string
        +phone: string
        +city: string
        +region: string
    }

    class Skeleton {
        +PropertyCardSkeleton
        +PropertyListSkeleton
        +ChatListSkeleton
        +ProfileSkeleton
    }

    class SegmentedToggle {
        +options
        +value
        +onChange()
    }

    HomeScreen --> Card : renders
    PropertyDetailScreen --> Card : renders
    AgentScreen --> Card : renders
    SearchScreen --> Card : renders

    HomeScreen --> SupabaseClient
    PropertyDetailScreen --> SupabaseClient
    AgentScreen --> SupabaseClient
    ChatScreen --> SupabaseClient
    Notifications --> SupabaseClient

    HomeScreen --> useCompareStore
    HomeScreen --> useThemeStore
    useThemeStore --> useNetworkStore
    useLanguageStore --> i18n : changes language
```

## ER diagram

```mermaid
erDiagram
    PROFILES {
        uuid id PK
        text full_name
        text avatar_url
        text phone
        text city
        text region
        timestamptz created_at
    }

    PROPERTIES {
        uuid id PK
        uuid user_id FK
        text title_en
        text title_mm
        numeric price
        text currency_unit
        text deal_type
        text property_type
        text[] images
        int bedrooms
        int bathrooms
        numeric area_value
        text area_unit
        numeric width
        numeric length
        text floor
        text furnished_status
        text region_id FK
        text township_id FK
        boolean is_sold
        int views
        float latitude
        float longitude
        timestamptz created_at
    }

    SAVED_PROPERTIES {
        uuid id PK
        uuid user_id FK
        uuid property_id FK
        timestamptz created_at
    }

    CONVERSATIONS {
        uuid id PK
        uuid property_id FK
        uuid buyer_id FK
        uuid seller_id FK
        timestamptz created_at
        timestamptz updated_at
    }

    MESSAGES {
        uuid id PK
        uuid conversation_id FK
        uuid sender_id FK
        text text
        jsonb attachment
        timestamptz read_at
        boolean pinned_by_buyer
        boolean pinned_by_seller
        timestamptz created_at
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
        timestamptz created_at
    }

    SAVED_SEARCHES {
        uuid id PK
        uuid user_id FK
        text name
        jsonb search_params
        timestamptz created_at
    }

    PUSH_TOKENS {
        uuid id PK
        uuid user_id FK
        text token
        text platform
        timestamptz created_at
    }

    STATES_REGIONS {
        text id PK
        text name_en
        text name_mm
    }

    TOWNSHIPS {
        text id PK
        text region_id FK
        text name_en
        text name_mm
    }

    PROFILES ||--o{ PROPERTIES : owns
    PROFILES ||--o{ WANTED_LISTINGS : posts
    PROFILES ||--o{ SAVED_PROPERTIES : saves
    PROFILES ||--o{ SAVED_SEARCHES : owns
    PROFILES ||--o{ PUSH_TOKENS : registers
    PROFILES ||--o{ CONVERSATIONS : "buyer"
    PROFILES ||--o{ CONVERSATIONS : "seller"
    PROFILES ||--o{ MESSAGES : sends
    PROPERTIES ||--o{ SAVED_PROPERTIES : "saved by"
    PROPERTIES ||--o{ CONVERSATIONS : "about"
    CONVERSATIONS ||--o{ MESSAGES : contains
    STATES_REGIONS ||--o{ TOWNSHIPS : contains
    STATES_REGIONS ||--o{ PROPERTIES : locates
    TOWNSHIPS ||--o{ PROPERTIES : locates
    STATES_REGIONS ||--o{ WANTED_LISTINGS : locates
    TOWNSHIPS ||--o{ WANTED_LISTINGS : locates
```

## Use case diagram

> GitHub Mermaid does not support the native `useCaseDiagram` type, so the use case model is rendered as a flowchart below.

```mermaid
flowchart LR
    subgraph Guest["Guest (unauthenticated)"]
        direction TB
        G1[Browse Properties]
        G2[Register Account]
        G3[Login]
        G4[Switch Language]
    end

    subgraph User["Registered User / Buyer"]
        direction TB
        U1[Search & Filter Properties]
        U2[View Property Detail]
        U3[Save / Unsave Property]
        U4[Compare Properties]
        U5[View Map / Get Directions]
        U6[Call Agent]
        U7[Chat with Agent]
        U8[Manage Saved Properties]
        U9[Post Wanted Listing]
        U10[Save Search]
        U11[Edit Profile]
        U12[Change Settings]
        U13[Toggle Dark Mode]
    end

    subgraph Agent["Registered User / Seller - Agent"]
        direction TB
        A1[Create Property Listing]
        A2[Manage Own Listings]
        A3[Respond to Buyers via Chat]
        A4[View Agent Profile]
    end

    subgraph System["System"]
        direction TB
        S1[Authenticate via Email / Google]
        S2[Send Push Notifications]
        S3[Track Property Views]
        S4[Enforce Monthly Post Limit]
    end
```
