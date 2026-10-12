import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router'
import PageLoader from './components/PageLoader'
import AboutPage from './shop/AboutPage'
import { CartProvider } from './shop/CartContext'
import ContactPage from './shop/ContactPage'
import HomePage from './shop/HomePage'
import NotFoundPage from './shop/NotFoundPage'
import ShopLayout from './shop/ShopLayout'
import { SiteDataProvider } from './shop/SiteDataContext'

// Visitors never download the admin code; it loads when someone opens /admin.
const AdminApp = lazy(() => import('./admin/AdminApp'))

export default function App() {
  return (
    <Routes>
      <Route
        element={
          <SiteDataProvider>
            <CartProvider>
              <ShopLayout />
            </CartProvider>
          </SiteDataProvider>
        }
      >
        <Route index element={<HomePage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
      <Route
        path="admin/*"
        element={
          <Suspense fallback={<PageLoader />}>
            <AdminApp />
          </Suspense>
        }
      />
    </Routes>
  )
}
