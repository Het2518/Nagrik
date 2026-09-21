import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAdminStore } from '../store/adminStore';
import AdminLayout from '../components/layout/AdminLayout';

const AdminLoginPage     = lazy(() => import('../domains/auth/AdminLoginPage'));
const DashboardPage      = lazy(() => import('../domains/dashboard/DashboardPage'));
const ApplicationQueuePage = lazy(() => import('../domains/applications/ApplicationQueuePage'));
const ApplicationReviewPage = lazy(() => import('../domains/applications/ApplicationReviewPage'));
const FamiliesPage       = lazy(() => import('../domains/families/FamiliesPage'));
const FamilyCaseViewPage = lazy(() => import('../domains/families/FamilyCaseViewPage'));
const SchemesAdminPage   = lazy(() => import('../domains/schemes/SchemesAdminPage'));
const AuditLogsPage      = lazy(() => import('../domains/auditlogs/AuditLogsPage'));
const OfficersPage       = lazy(() => import('../domains/officers/OfficersPage'));
const SocialRegistryPage = lazy(() => import('../domains/registry/SocialRegistryPage'));
const DataQualityPage    = lazy(() => import('../domains/quality/DataQualityPage'));

function Loader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--color-offwhite)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, border: '3px solid #0E7490', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: '#6B7280', fontSize: '0.875rem' }}>Loading...</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAdminStore();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function GuestRoute({ children }) {
  const { isAuthenticated } = useAdminStore();
  return !isAuthenticated ? children : <Navigate to="/dashboard" replace />;
}

function AdminApp() {
  return (
    <AdminLayout>
      <Suspense fallback={<div style={{ padding: '2rem' }}><div className="skeleton" style={{ height: 200, borderRadius: 16 }} /></div>}>
        <Routes>
          <Route path="/dashboard"           element={<DashboardPage />} />
          <Route path="/applications"        element={<ApplicationQueuePage />} />
          <Route path="/applications/:id"    element={<ApplicationReviewPage />} />
          <Route path="/families"            element={<FamiliesPage />} />
          <Route path="/families/:id"        element={<FamilyCaseViewPage />} />
          <Route path="/families/:id/case-view" element={<FamilyCaseViewPage />} />
          <Route path="/schemes"             element={<SchemesAdminPage />} />
          <Route path="/social-registry"     element={<SocialRegistryPage />} />
          <Route path="/data-quality"        element={<DataQualityPage />} />
          <Route path="/auditlogs"           element={<AuditLogsPage />} />
          <Route path="/officers"            element={<OfficersPage />} />
          <Route path="*"                    element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </AdminLayout>
  );
}

export default function AppRouter() {
  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        <Route path="/login" element={<GuestRoute><AdminLoginPage /></GuestRoute>} />
        <Route path="/*"     element={<ProtectedRoute><AdminApp /></ProtectedRoute>} />
      </Routes>
    </Suspense>
  );
}
