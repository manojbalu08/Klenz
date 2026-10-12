import { Navigate, Route, Routes } from 'react-router'
import AdminLayout from './AdminLayout'
import { AuthProvider, RequireAuth } from './AuthContext'
import ContentPage from './ContentPage'
import DashboardPage from './DashboardPage'
import EnquiriesPage from './EnquiriesPage'
import LoginPage from './LoginPage'
import ProductsPage from './ProductsPage'
import SettingsPage from './SettingsPage'

/** Everything under /admin. Loaded on demand, so shoppers never download it. */
export default function AdminApp() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="login" element={<LoginPage />} />
        <Route
          element={
            <RequireAuth>
              <AdminLayout />
            </RequireAuth>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="enquiries" element={<EnquiriesPage />} />
          <Route path="content" element={<ContentPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}
