# Shop-Smart: The AI-Powered Omni-channel Shopping Assistant

Shop-Smart is a cutting-edge full-stack Next.js web application designed to revolutionize the in-store shopping experience. By combining advanced AI vision, natural language processing, and real-time inventory synchronization, Shop-Smart acts as a personal shopping assistant for customers while providing store managers with powerful, event-driven operational tools.

## 🌟 Key Features

### 1. Unified AI Shopping Assistant
A single, intuitive interface (`/customer`) that dynamically adapts to how users want to interact:
- **Visual Product Analysis**: Customers can point their device camera at any item. Using **Google Gemini Vision**, the app instantly analyzes the image, identifies the product type, and matches it with the store's current inventory. The AI intelligently recommends functionally similar alternatives with detailed reasoning.
- **Context-Aware Voice & Chat**: Built-in browser `SpeechRecognition` actively listens to natural language queries. Powered by **LangChain** and **Google Gemini**, the AI returns highly contextual answers and maintains conversation history (session state). It handles complex follow-up questions gracefully, switching topics naturally if the user asks for a different category.
- **Seamless Chat Modes**: The UI automatically manages the conversation flow, defaulting to "New Chat" and smoothly transitioning into a "Follow Up" state after an initial message or image scan.
- **Auditory Feedback**: Text-to-Speech synthesis reads the AI's responses aloud, enabling a completely hands-free and accessible in-store experience.

### 2. Real-Time Shopify Inventory Sync
Seamlessly bridges the gap between a store's digital e-commerce presence and its physical shelves.
- **Direct Integration**: Connects to the Shopify Admin API using the store manager's specific credentials (`shopDomain`, API Token).
- **Automated Catalog Sync**: Automatically fetches and stores `ShopifyProduct`, `ShopifyVariant`, and `ShopifyInventoryLevel` data into the local PostgreSQL database.
- **Accurate Stock Tracking**: Customers interacting with the AI only receive information based on actual, real-time in-store availability.

### 3. Event-Driven Architecture (Apache Kafka)
Designed for high scalability and real-time responsiveness.
- **Kafka Integration**: Uses `kafkajs` to handle high-throughput event streams such as inventory updates, webhook events, and notifications.
- **Smart Fallback**: Features a built-in Node.js `EventEmitter` simulation for local development, allowing developers to test event-driven workflows without needing a live Kafka broker.

### 4. Comprehensive Manager Dashboard
Empowering store managers to coordinate their physical locations and digital inventory.
- **Interactive Location Picker (Google Maps)**: Managers register their store's exact location using an embedded Google Map (`@react-google-maps/api`).
- **Live GPS Tracking & Geocoding**: Fetches physical coordinates via the browser's `navigator.geolocation` API, and automatically reverse-geocodes them using **OpenStreetMap Nominatim** (with intelligent fallbacks if API keys are missing).
- **Live Store Announcements**: Managers can broadcast real-time alerts (e.g., "Aisle 4 is closed") which instantly appear on shoppers' screens via **Server-Sent Events (SSE)**.
- **Direct Customer Feedback**: Customers can submit complaints from the app, which are routed directly to the specific store manager for review.

### 5. Dynamic Store Selection System
- **Searchable Store Combobox**: A highly optimized dropdown that dynamically fetches registered stores from the live database.
- **Persistent State**: The user's selected store is seamlessly maintained across sessions using local storage, ensuring API queries and inventory checks are always routed correctly.

### 6. Secure Authentication System
- **OTP Email Verification**: Uses **Nodemailer** to send secure 6-digit One-Time Passwords to users' and managers' emails during registration to verify identity.
- **Role-Based Access**: Distinct login and dashboard flows ensure customers and managers access only the appropriate tools.

## 🛠️ Tech Stack

- **Frontend Framework**: [Next.js 15 (App Router)](https://nextjs.org/) & React 19
- **AI Integration**: [LangChain](https://js.langchain.com/) & Google Gemini AI (Vision & Chat)
- **Event Streaming**: Apache Kafka (`kafkajs`)
- **E-Commerce Integration**: Shopify Admin API (GraphQL/REST)
- **Maps & Geocoding**: Google Maps API & OpenStreetMap Nominatim
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [shadcn/ui](https://ui.shadcn.com/)
- **Database ORM**: [Prisma](https://www.prisma.io/)
- **Database**: PostgreSQL
- **Authentication/Emails**: [Nodemailer](https://nodemailer.com/)

## 🚀 Getting Started

### Prerequisites
Make sure you have Node.js and `npm` installed.

### 1. Installation
Clone the repository and install the dependencies:
```bash
npm install
```

### 2. Environment Variables
Create a `.env` and `.env.local` file in the root directory and add the necessary keys:
```env
# Database connection string (PostgreSQL)
DATABASE_URL="postgresql://user:password@host:port/database"

# Email Configuration for OTP Verification
SMTP_EMAIL="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"

# Google Maps (For Manager Registration)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="YOUR_GOOGLE_MAPS_API_KEY_HERE"

# Google Gemini API Key (For AI Vision and Chat)
GOOGLE_API_KEY="YOUR_GEMINI_API_KEY_HERE"

# Kafka (Optional, will use local memory fallback if not provided)
# KAFKA_BROKERS="localhost:9092"
```

### 3. Database Migration
Sync the Prisma schema with your PostgreSQL database:
```bash
npx prisma generate
npx prisma db push
```

### 4. Running the Development Server
Start the local server:
```bash
npm run dev
```
Navigate to `http://localhost:3000` to view the application!

## 📦 Build for Production

To create an optimized production build:
```bash
npm run build
npm run start
```

## 🤝 Contributing
Contributions, issues, and feature requests are welcome!
