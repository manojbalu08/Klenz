import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router'
import { CartIcon } from '../components/icons'
import CartDrawer from './CartDrawer'
import { useCart } from './CartContext'
import Footer from './Footer'
import Header from './Header'
import styles from './ShopLayout.module.css'
import { useSite } from './SiteDataContext'

export default function ShopLayout() {
  const { content } = useSite().data

  return (
    <div className={styles.shop}>
      <ScrollToTop />
      <a className={styles.skipLink} href="#main">
        Skip to content
      </a>
      {content['site.announcement'] && <div className={styles.announcement}>{content['site.announcement']}</div>}
      <Header />
      <main id="main">
        <Outlet />
      </main>
      <Footer />
      <FloatingCart />
      <CartDrawer />
    </div>
  )
}

/** New pages start at the top; links like /#shop jump to their section. */
function ScrollToTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView()
    else window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname, hash])
  return null
}

/** On phones the header scrolls away, so a cart button follows the visitor. */
function FloatingCart() {
  const { count, openCart, isOpen } = useCart()
  if (count === 0 || isOpen) return null
  return (
    <button type="button" className={styles.floatingCart} onClick={openCart} aria-label={`Open cart, ${count} packs`}>
      <CartIcon />
      <span>View cart</span>
      <span className={styles.floatingCount}>{count}</span>
    </button>
  )
}
