import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { HabitsProvider } from './context/HabitsContext';
import AppLayout from './components/AppLayout';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const EnvironmentDesign = lazy(() => import('./pages/EnvironmentDesign'));
const WeeklyReview = lazy(() => import('./pages/WeeklyReview'));
const Analytics = lazy(() => import('./pages/Analytics'));


export default function App() {
  return (
    <Router>
      <HabitsProvider>
        <AppLayout>
          <Suspense fallback={
            <div className="min-h-screen bg-bg flex items-center justify-center font-serif text-text">
              <div className="flex flex-col items-center gap-4">
                <svg className="w-12 h-12 animate-spin text-primary" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-xs font-mono font-bold tracking-widest uppercase text-muted">Loading...</p>
              </div>
            </div>
          }>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/environment" element={<EnvironmentDesign />} />
              <Route path="/review" element={<WeeklyReview />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </AppLayout>
        
        {/* Sleek themed toast notifications */}
        <Toaster 
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#FFFFFF',
              color: '#4A4036',
              border: '1px solid #EAE4DD',
              borderRadius: '10px',
              fontFamily: 'Inter, sans-serif',
              fontSize: '13px',
              padding: '12px 16px',
              boxShadow: '0 4px 12px rgba(74, 64, 54, 0.08)'
            },
            success: {
              iconTheme: {
                primary: '#A3C9A8',
                secondary: '#FFFFFF'
              }
            },
            error: {
              iconTheme: {
                primary: '#F6C879',
                secondary: '#FFFFFF'
              }
            }
          }}
        />
      </HabitsProvider>
    </Router>
  );
}
