import { Link, NavLink } from 'react-router'
import { CartIcon } from '../components/icons'
import Logo from '../components/Logo'
import { useCart } from './CartContext'
import styles from './Header.module.css'

const NAV = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About Us' },
  { to: '/contact', label: 'Contact Us' },
]

export default function Header() {
  const { count, openCart } = useCart()

  return (
    <header className={styles.header}>
      <Link to="/" className={styles.brand} aria-label="Klenz home">
        <Logo size={48} className={styles.logo} />
        <span className={styles.wordmark}>Klenz</span>
      </Link>

      <nav className={styles.nav} aria-label="Main">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end
            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className={styles.actions}>
        <button type="button" className={styles.cart} onClick={openCart} aria-label={`Open cart, ${count} packs`}>
          <CartIcon />
          Cart
          <span key={count} className={styles.count}>
            {count}
          </span>
        </button>
        <Link to="/admin" className={styles.admin}>
          Admin
        </Link>
      </div>
    </header>
  )
}
