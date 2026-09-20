import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute, GuestRoute } from './Guards';
import AppLayout from '../components/layout/AppLayout';
import PageLoader from '../components/ui/PageLoader';

// Lazy-loaded pages — code splitting for performance
const LandingPage      = lazy(() => import('../domains/auth/LandingPage'));
const LoginPage        = lazy(() => import('../domains/auth/LoginPage'));
const RegisterPage     = lazy(() => import('../domains/auth/RegisterPage'));
const HomePage         = lazy(() => import('../domains/auth/HomePage'));
const SchemesPage      = lazy(() => import('../domains/schemes/SchemesPage'));
const SchemeDetailPage = lazy(() => import('../domains/schemes/SchemeDetailPage'));
const ApplyPage        = lazy(() => import('../domains/applications/ApplyPage'));
const ApplicationsPage = lazy(() => import('../domains/applications/ApplicationsPage'));
const ApplicationDetailPage = lazy(() => import('../domains/applications/ApplicationDetailPage'));
const FamilyPage       = lazy(() => import('../domains/family/FamilyPage'));
const OnboardingPage   = lazy(() => import('../domains/family/OnboardingPage'));
const ProfilePage      = lazy(() => import('../domains/auth/ProfilePage'));

function AuthenticatedApp() {
  return (
    <AppLayout>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/home"                        element={<HomePage />} />
          <Route path="/schemes"                     element={<SchemesPage />} />
          <Route path="/schemes/:schemeCode"         element={<SchemeDetailPage />} />
          <Route path="/schemes/:schemeCode/apply"   element={<ApplyPage />} />
          <Route path="/applications"                element={<ApplicationsPage />} />
          <Route path="/applications/:id"            element={<ApplicationDetailPage />} />
          <Route path="/family"                      element={<FamilyPage />} />
          <Route path="/onboarding"                  element={<OnboardingPage />} />
          <Route path="/profile"                     element={<ProfilePage />} />
          <Route path="*"                            element={<Navigate to="/home" replace />} />
        </Routes>
      </Suspense>
    </AppLayout>
  );
}

export default function AppRouter() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public routes */}
        <Route path="/"        element={<GuestRoute><LandingPage /></GuestRoute>} />
        <Route path="/login"   element={<GuestRoute><LoginPage /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />

        {/* Protected routes */}
        <Route path="/*" element={<ProtectedRoute><AuthenticatedApp /></ProtectedRoute>} />
      </Routes>
    </Suspense>
  );
}
