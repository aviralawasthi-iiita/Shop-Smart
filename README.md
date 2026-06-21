# Walmart Assist: Empowering Inclusive Shopping

Walmart Assist is a comprehensive Next.js web application designed to create a more accessible and inclusive shopping experience for all customers. By offering tailored interfaces and specialized workflows, the application addresses the unique needs of visually impaired, hearing impaired, and neurodivergent individuals.

## 🌟 Detailed Features

### 1. Neurodivergent Shopping Experience
Designed to reduce sensory overload and help shoppers stay on track.
- **Interactive Timer Checklists**: Create shopping lists where each item has a specific allocated time (e.g., 15 minutes). Visual circular progress rings track remaining time.
- **"Time's Up" Fallbacks**: When an item's timer runs out, a gentle audio and visual prompt allows the user to either "Rewind Timer" or "Cancel Item", helping to manage time-blindness.
- **Searchable Store Selection**: Users can search through a live database of registered Walmart stores using an intuitive Combobox.
- **Quiet Time Requests**: Customers can select a store and request a sensory-friendly shopping window. Users can view their past requests and track whether a manager has "Approved", "Rejected", or left the request "Pending".

### 2. Visually Impaired Assistance
An audio-first interface ensuring independent store navigation.
- **AI Vision Analysis**: Uses LangChain and Google Gemini Vision to analyze camera input and describe products or surroundings to the user.
- **Voice-Guided Shopping**: Built-in Speech Recognition (`SpeechRecognition` API) actively listens for user commands and questions.
- **Auditory Feedback**: Text-to-Speech synthesis answers user queries and describes the surrounding environment, creating a completely hands-free and accessible experience.

### 3. Hearing Impaired Support
A text-first interface that eliminates the reliance on audio queues.
- **AI-Powered Chat Interface**: A dedicated messaging interface powered by LangChain and Google Gemini where users can type their queries and receive contextual, clear, text-based guidance from the AI assistant.

### 4. Comprehensive Manager Dashboard
Empowering store managers to coordinate accessibility requests.
- **Dynamic Store Registration**: Managers register and dynamically create their store (capturing Store Name and Location) without relying on hardcoded lists.
- **Quiet Time Management**: Managers receive all "Quiet Time" requests for their specific store and can approve or deny them based on store traffic.
- **Store Announcements**: Managers can broadcast real-time announcements (e.g., "Aisle 4 is closed for cleaning") which are visible to the customers.

### 5. Secure Authentication System
- **OTP Email Verification**: Uses Node Mailer to send secure 6-digit One-Time Passwords directly to users' and managers' emails during registration to verify their identity.
- **Role-Based Access**: Distinct login and registration flows ensure customers and managers access only the dashboards meant for them.

## 🛠️ Tech Stack

- **Frontend Framework**: [Next.js 15 (App Router)](https://nextjs.org/) & React
- **AI Integration**: [LangChain](https://js.langchain.com/) & Google Gemini AI (For visual analysis and conversational assistance)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [shadcn/ui](https://ui.shadcn.com/)
- **Database ORM**: [Prisma](https://www.prisma.io/)
- **Database Hosting**: PostgreSQL (Aiven)
- **Authentication/Emails**: [Nodemailer](https://nodemailer.com/) (OTP-based email verification)
- **Deployment**: Configured for static builds and edge deployments.

## 🚀 Getting Started

### Prerequisites
Make sure you have Node.js and `npm` installed.

### 1. Installation
Clone the repository and install the dependencies:
```bash
npm install
```

### 2. Environment Variables
Create a `.env` and `.env.local` file in the root directory and add the following keys:
```env
# Database connection string (PostgreSQL)
DATABASE_URL="postgresql://user:password@host:port/database"

# Email Configuration for OTP Verification
SMTP_EMAIL="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"
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
