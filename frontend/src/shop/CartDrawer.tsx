import { useNavigate } from 'react-router'
import Dialog from '../components/Dialog'
import { packs } from '../lib/format'
import { useCart } from './CartContext'
import styles from './CartDrawer.module.css'
import { tintColor } from './ProductArt'
import ui from './ui.module.css'

export default function CartDrawer() {
  const { items, count, isOpen, closeCart, setQuantity } = useCart()
  const navigate = useNavigate()

  function goTo(path: string) {
    closeCart()
    void navigate(path)
  }

  return (
    <Dialog open={isOpen} onClose={closeCart} label="Shopping cart" variant="drawer">
      <div className={styles.panel}>
        <div className={styles.head}>
          <h2 className={ui.display}>Your cart</h2>
          <button type="button" className={styles.close} onClick={closeCart} aria-label="Close cart">
            ×
          </button>
        </div>

        <div className={styles.body}>
          {items.length === 0 && (
            <div className={styles.empty}>
              <span className={styles.emptyTitle}>Your cart is empty</span>
              <span className={styles.emptyText}>Add some tissue to get started.</span>
              <button type="button" className={`${ui.button} ${ui.primary}`} onClick={() => goTo('/#shop')}>
                Shop products
              </button>
            </div>
          )}
          {items.map(({ product, quantity }) => (
            <div key={product.id} className={styles.item}>
              {product.image_url ? (
                <img className={styles.swatch} src={product.image_url} alt="" />
              ) : (
                <div className={styles.swatch} style={{ background: tintColor(product.tint) }} />
              )}
              <div className={styles.details}>
                <span className={styles.name}>{product.name}</span>
                {product.spec && <span className={styles.spec}>{product.spec}</span>}
                <div className={`${ui.stepper} ${styles.stepper}`}>
                  <button
                    type="button"
                    className={ui.stepButton}
                    aria-label={`Decrease quantity of ${product.name}`}
                    onClick={() => setQuantity(product.id, quantity - 1)}
                  >
                    −
                  </button>
                  <span className={ui.stepCount}>{quantity}</span>
                  <button
                    type="button"
                    className={ui.stepButton}
                    aria-label={`Increase quantity of ${product.name}`}
                    onClick={() => setQuantity(product.id, quantity + 1)}
                  >
                    +
                  </button>
                </div>
              </div>
              <button type="button" className={styles.remove} onClick={() => setQuantity(product.id, 0)}>
                Remove
              </button>
            </div>
          ))}
        </div>

        {items.length > 0 && (
          <div className={styles.foot}>
            <div className={styles.subtotal}>
              <span>In your cart</span>
              <span className={ui.display}>{packs(count)}</span>
            </div>
            <span className={styles.note}>We reply on WhatsApp with prices and delivery details.</span>
            <button type="button" className={`${ui.button} ${ui.primary} ${ui.large}`} onClick={() => goTo('/contact')}>
              Checkout &amp; send on WhatsApp
            </button>
          </div>
        )}
      </div>
    </Dialog>
  )
}
