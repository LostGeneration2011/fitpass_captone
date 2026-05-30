# FitPass Monorepo

A comprehensive fitness management platform built with modern technologies.

## 🏗️ Project Structure

```
fitpass-captone/
├── backend/              # Express.js + TypeScript API
├── fitpass-admin/        # Next.js Admin Dashboard
├── fitpass-app/          # Expo React Native Mobile App
├── package.json          # Root package.json for monorepo
└── README.md
```

## 🛠️ Technologies

### Backend (API)
- **Express.js** - Web framework
- **TypeScript** - Type safety
- **MongoDB/Mongoose** - Database
- **JWT** - Authentication
- **Bcrypt** - Password hashing

### Admin Dashboard
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Headless UI** - Accessible components

### Mobile App
- **Expo** - React Native development platform
- **React Navigation** - Navigation library
- **NativeBase** - UI components
- **TypeScript** - Type safety

## 🚀 Getting Started

### Prerequisites
- Node.js >= 18.0.0
- npm >= 8.0.0
- MongoDB (for backend)
- Expo CLI (for mobile development)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd fitpass-captone
   ```

2. **Install dependencies for all projects**
   ```bash
   npm run install:all
   ```

3. **Set up environment variables**
   
   **Backend:**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your configuration
   ```

### Development

1. **Run all services concurrently**
   ```bash
   npm run dev
   ```
   This starts:
   - Backend API on http://localhost:3000
   - Admin dashboard on http://localhost:3001
   - Mobile app with Expo

2. **Run services individually**
   ```bash
   # Backend only
   npm run dev:backend
   
   # Admin dashboard only
   npm run dev:admin
   
   # Mobile app only
   npm run dev:app
   ```

### Building for Production

```bash
# Build all
npm run build

# Build individually
npm run build:backend
npm run build:admin
```

## 📱 Features

### For Students
- 🔐 Authentication & Profile Management
- 📅 Class Booking & Scheduling
- 💳 Package Purchases
- 📊 Progress Tracking
- 💬 Chat with Trainers

### For Teachers/Trainers
- 👥 Student Management
- 🏋️ Class Creation & Management
- 📈 Performance Analytics
- 💬 Communication Tools
- 💰 Earnings Dashboard

### For Admins
- 👤 User Management (Students & Teachers)
- 🏢 Gym/Studio Management
- 📦 Package Management
- 💳 Payment Processing
- 📊 Analytics & Reports
- 💬 Customer Support

## 🔧 Development Guidelines

### Code Style
- Use TypeScript for type safety
- Follow ESLint configurations
- Use Prettier for code formatting
- Follow component-based architecture

### Git Workflow
- Use conventional commits
- Create feature branches
- Submit pull requests for review
- Ensure all tests pass

### Database Schema
- Use Mongoose schemas for data modeling
- Implement proper validation
- Add indexes for performance
- Use migrations for schema changes

## 🧪 Testing

```bash
# Backend tests
cd backend && npm test

# Admin dashboard tests
cd fitpass-admin && npm test

# Mobile app tests
cd fitpass-app && npm test
```

## 📦 Deployment

### Backend (API)
- Deploy to Heroku, AWS, or similar
- Set up MongoDB Atlas for database
- Configure environment variables

### Admin Dashboard
- Deploy to Railway or similar Node.js hosting
- Set up CI/CD pipeline
- Configure environment variables

### Mobile App
- Build for iOS/Android using EAS Build
- Submit to App Store/Google Play
- Configure over-the-air updates

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support, email support@fitpass.com or join our Slack channel.

## 🙏 Acknowledgments

- Thanks to all contributors
- Built with amazing open-source libraries
- Inspired by modern fitness platforms