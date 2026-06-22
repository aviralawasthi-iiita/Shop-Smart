# Shop-Smart: Empowering Inclusive Shopping & Smart Store Management

Shop-Smart is a comprehensive full-stack Next.js web application designed to create a more accessible and inclusive shopping experience for all customers, while providing store managers with powerful tools to manage their stores. By offering tailored interfaces and specialized workflows, the application addresses the unique needs of visually impaired, hearing impaired, and neurodivergent individuals, while seamlessly syncing real-time inventory from Shopify.

## 🌟 Detailed Features

### 1. Neurodivergent Shopping Experience
Designed to reduce sensory overload and help shoppers stay on track.
- **Interactive Timer Checklists**: Create shopping lists where each item has a specific allocated time (e.g., 15 minutes). Visual circular progress rings track remaining time.
- **"Time's Up" Fallbacks**: When an item's timer runs out, a gentle audio and visual prompt allows the user to either "Rewind Timer" or "Cancel Item", helping to manage time-blindness.
- **Quiet Time Requests**: Customers can securely request sensory-friendly shopping windows. Users can view their past requests and track whether a manager has "Approved", "Rejected", or left the request "Pending".

### 2. Visually Impaired Assistance
An audio-first interface ensuring independent store navigation.
- **AI Vision Analysis**: Uses LangChain and Google Gemini Vision to analyze camera input and describe products or surroundings to the user.
- **Voice-Guided Shopping**: Built-in Speech Recognition (`SpeechRecognition` API) actively listens for user commands and questions.
- **Auditory Feedback**: Text-to-Speech synthesis answers user queries and describes the surrounding environment, creating a completely hands-free and accessible experience.

### 3. Hearing Impaired Support
A text-first interface that eliminates the reliance on audio queues.
- **AI-Powered Chat Interface**: A dedicated messaging interface powered by LangChain and Google Gemini where users can type their queries and receive contextual, clear, text-based guidance from the AI assistant.

### 4. Real-Time Shopify Inventory Sync
Seamlessly connects the physical store with digital inventory.
- **Live Inventory Tracking**: Syncs products, variants, and real-time inventory levels directly from the store's Shopify account using the Shopify Admin API.
- **Automated Sync**: Background synchronization ensures that stock levels presented to shoppers are always accurate and up to date.

### 5. Dynamic Store Selection System
A unified approach to store selection across all user interfaces.
- **Searchable Store Combobox**: Highly optimized, searchable Combobox that dynamically fetches all registered store names and their locations from the live PostgreSQL database.
- **Consistent Selection State**: Once a store is selected, it is seamlessly maintained throughout the user's journey using local storage.

### 6. Comprehensive Manager Dashboard
Empowering store managers to coordinate accessibility requests and store operations.
- **Interactive Location Picker (Google Maps)**: Managers register their store using an embedded Google Map interface (`@react-google-maps/api`).
- **Live GPS Tracking**: Managers can click "Live Location" to fetch their exact physical GPS coordinates via the browser's `navigator.geolocation` API.
- **Smart Geocoding (with OpenStreetMap Fallback)**: Automatically reverse-geocodes map clicks and GPS coordinates into readable text addresses (Area, Pincode, City). If the Google API key is missing or fails, it elegantly falls back to the free **OpenStreetMap Nominatim API**.
- **Quiet Time Management**: Managers receive all "Quiet Time" requests for their specific store and can approve or deny them based on store traffic.
- **Store Announcements**: Managers can broadcast real-time announcements (e.g., "Aisle 4 is closed for cleaning") which are visible to the customers.

### 7. Secure Authentication System
- **OTP Email Verification**: Uses Nodemailer to send secure 6-digit One-Time Passwords directly to users' and managers' emails during registration to verify their identity.
- **Role-Based Access**: Distinct login and registration flows ensure customers and managers access only the dashboards meant for them.

## 🛠️ Tech Stack

- **Frontend Framework**: [Next.js 15 (App Router)](https://nextjs.org/) & React 19
- **Maps Integration**: Google Maps API (`@react-google-maps/api`) & OpenStreetMap Nominatim
- **AI Integration**: [LangChain](https://js.langchain.com/) & Google Gemini AI (`@langchain/google-genai`)
- **Inventory Management**: Shopify API
- **Event Streaming**: Kafka (`kafkajs`)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [shadcn/ui](https://ui.shadcn.com/)
- **Database ORM**: [Prisma](https://www.prisma.io/)
- **Database**: PostgreSQL
- **Authentication/Emails**: [Nodemailer](https://nodemailer.com/) (OTP-based email verification)

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
Contributions, issues, and feature requests are welcome! Let's build a more inclusive shopping world together.
