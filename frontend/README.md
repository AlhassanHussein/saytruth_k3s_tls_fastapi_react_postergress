# SayTruth - Anonymous Messaging App

A beautiful, mobile-first anonymous messaging application built with React + Vite.

## Features

- 🎨 **Modern UI/UX** - Clean, premium design with smooth animations
- 📱 **Mobile-First** - Optimized for mobile devices with touch-friendly interactions
- 🔗 **Temporary Links** - Create time-limited anonymous messaging links
- ⏱️ **Real-time Countdown** - Live countdown timers for each active link
- 🌍 **Multi-language Support** - EN / AR / ES language selector
- 🐳 **Docker Ready** - Containerized development environment

## Getting Started

### Using Docker (Recommended)

1. **Build and start the container:**
   ```bash
   docker-compose up --build
   ```

2. **Access the app:**
   Open your browser and navigate to `http://localhost:5173`

3. **Stop the container:**
   ```bash
   docker-compose down
   ```

### Local Development (Without Docker)

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Access the app:**
   Open your browser and navigate to `http://localhost:5173`

## Project Structure

```
saytruth/
├── src/
│   ├── components/
│   │   ├── Header.jsx              # App header with language selector
│   │   ├── Header.css
│   │   ├── CreateLinkSection.jsx   # Link creation form
│   │   ├── CreateLinkSection.css
│   │   ├── LinkCard.jsx            # Individual link card component
│   │   ├── LinkCard.css
│   │   ├── ActiveLinksSection.jsx  # Active links container
│   │   ├── ActiveLinksSection.css
│   │   ├── LinksTab.jsx            # Links management tab
│   │   ├── LinksTab.css
│   │   ├── BottomNav.jsx           # Bottom navigation bar
│   │   └── BottomNav.css
│   ├── App.jsx                     # Main app component with routing
│   ├── App.css
│   ├── index.css                   # Global styles & design system
│   └── main.jsx                    # App entry point
├── Dockerfile                      # Docker configuration
├── docker-compose.yml              # Docker Compose configuration
└── vite.config.js                  # Vite configuration

```

## Design System

The app uses a comprehensive design system with:

- **Color Palette**: Soft blues and modern neutrals
- **Typography**: Inter font family
- **Animations**: Smooth transitions and micro-interactions
- **Components**: Reusable button, input, and card styles
- **Responsive**: Mobile-first with breakpoints for larger screens

## Current Features (UI Only)

This is a high-fidelity UI mockup. The following features are implemented:

### Home Tab
✅ Header with username and language selector  
✅ Create temporary link form with duration options  
✅ Active links display with countdown timers  
✅ Copy to clipboard functionality  
✅ Delete link action  
✅ Smooth animations and transitions  

### Links Tab
✅ **Public Links Section**  
  - Display all public shareable links  
  - Copy link functionality with visual feedback  
  - Duration badges (temporary/permanent)  
  - Real-time countdown timers  
  - Visual distinction for expired links  

✅ **Private Links Section**  
  - View received messages interface  
  - Message count display  
  - Purple gradient styling for distinction  
  - Disabled state for expired links  

### General
✅ Bottom navigation bar with tab switching  
✅ Mobile-first responsive design  
✅ Touch-friendly interactions  

## Next Steps (Backend Integration)

- [ ] Connect to backend API
- [ ] User authentication
- [ ] Real link generation and storage
- [ ] Message receiving and display
- [ ] Notifications
- [ ] Multi-language content translation

## Technologies

- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **Docker** - Containerization
- **CSS3** - Styling with custom properties

## License

MIT
