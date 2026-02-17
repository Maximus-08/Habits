# AtomicTracker - Setup Instructions

## 🚀 Quick Start

### 1. Navigate to the project directory
```powershell
cd c:\Projects\Habit_tracker\atomic-tracker-react
```

### 2. Install dependencies
```powershell
npm install
```

### 3. Start the development server
```powershell
npm run dev
```

The app will open automatically at `http://localhost:3000`

## 📁 Project Structure

```
atomic-tracker-react/
├── src/
│   ├── pages/
│   │   ├── LandingPage.jsx       # Home/Auth page
│   │   ├── Dashboard.jsx         # Main habit tracking dashboard
│   │   ├── IdentityManagement.jsx # Identity architect page
│   │   ├── PerformanceTracker.jsx # Analytics & history
│   │   └── WeeklyReview.jsx      # Weekly reflection
│   ├── components/
│   │   └── NavBar.jsx            # Shared navigation
│   ├── App.jsx                   # Main app with routing
│   ├── main.jsx                  # Entry point
│   └── index.css                 # Global styles
├── index.html                     # HTML template
├── package.json                   # Dependencies
├── tailwind.config.js            # Tailwind configuration
└── vite.config.js                # Vite configuration
```

## 🎨 Pages Overview

### Landing Page (`/`)
- Hero section with gradient backgrounds
- Feature cards explaining the Atomic Habits philosophy
- Authentication form with compound interest visualization
- Identity claim CTA

### Dashboard (`/dashboard`)
- Identity progress tracker with level system
- Habit cards with completion tracking
- GitHub-style contribution heatmap
- Streak tracking sidebar
- Accountability circle

### Identity Management (`/identity`)
- Core identity editor
- Evidence tracking (habit votes)
- Bad habit inversion tools
- Environment design section

### Performance Tracker (`/analytics`)
- Key statistics cards
- Yearly consistency heatmap
- Insights panel
- Data export functionality

### Weekly Review (`/review`)
- Reflection prompts
- Satisfaction rating
- Week summary statistics
- Progress tracking

## 🔧 Customization

### Colors
Edit `tailwind.config.js` to change the color scheme:
- `primary`: Emerald green (#10b981)
- `secondary`: Royal blue (#2563eb)
- `coral`: For warning/negative habits (#f47274)

### Data
Currently using mock data. To connect to a backend:
1. Replace `useState` with API calls
2. Add state management (Context API or Redux)
3. Integrate with your authentication system

## 📦 Build for Production

```powershell
npm run build
```

The optimized files will be in the `dist/` folder.

## 🌐 Deploy

### Vercel
```powershell
npm install -g vercel
vercel
```

### Netlify
```powershell
npm run build
# Then drag the 'dist' folder to Netlify
```

## 💡 Features Implemented

✅ Responsive design for mobile/tablet/desktop
✅ Smooth transitions and hover effects
✅ Material Icons integration
✅ GitHub-style heatmap
✅ Interactive habit cards
✅ Progress tracking UI
✅ Identity-based habit architecture
✅ Weekly reflection system

## 🔜 Future Enhancements

- [ ] Backend API integration
- [ ] User authentication
- [ ] Data persistence
- [ ] Push notifications
- [ ] Social features
- [ ] Dark mode
- [ ] Mobile app (React Native)
- [ ] Export to PDF
- [ ] Calendar integration
- [ ] Habit templates

## 📚 Technologies Used

- **React 18** - UI framework
- **Vite** - Build tool & dev server
- **Tailwind CSS** - Utility-first CSS
- **React Router** - Client-side routing
- **Material Symbols** - Icon library

## 🐛 Troubleshooting

### Port already in use
```powershell
# Change port in vite.config.js or kill the process
```

### Icons not showing
- Check internet connection (Material Icons loaded from CDN)
- Verify the link tag in `index.html`

### Styles not applying
```powershell
# Clear Tailwind cache
rm -rf node_modules/.vite
npm run dev
```

## 📖 Learn More

- [Atomic Habits by James Clear](https://jamesclear.com/atomic-habits)
- [React Documentation](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Vite Guide](https://vitejs.dev)

---

**Built with ❤️ based on Atomic Habits principles**
