import { Link, NavLink, Outlet } from 'react-router'
import { ContentIcon, DashboardIcon, EnquiriesIcon, ProductsIcon, SettingsIcon } from '../components/icons'
import Logo from '../components/Logo'
import styles from './AdminLayout.module.css'

const NAV = [
  { to: '/admin', label: 'Dashboard', Icon: DashboardIcon, end: true },
  { to: '/admin/products', label: 'Products', Icon: ProductsIcon, end: false },
  { to: '/admin/enquiries', label: 'Enquiries', Icon: EnquiriesIcon, end: false },
  { to: '/admin/content', label: 'Page content', Icon: ContentIcon, end: false },
  { to: '/admin/settings', label: 'Settings', Icon: SettingsIcon, end: false },
]

export default function AdminLayout() {
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <Link to="/admin" className={styles.brand}>
          <Logo size={40} />
          <span>Klenz Admin</span>
        </Link>
        <nav className={styles.nav} aria-label="Admin">
          {NAV.map(({ to, label, Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}>
              <Icon />
              {label}
            </NavLink>
          ))}
        </nav>
        <Link to="/" className={styles.viewSite}>
          ← View website
        </Link>
      </aside>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}
