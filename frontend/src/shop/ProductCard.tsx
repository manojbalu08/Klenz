import { revealClass, revealDelay, useInView } from '../components/motion'
import { rupees } from '../lib/format'
import type { Product } from '../lib/types'
import { useCart } from './CartContext'
import ProductArt, { tintColor } from './ProductArt'
import styles from './ProductCard.module.css'
import ui from './ui.module.css'

/** `index` staggers the entrance animation across a row of cards. */
export default function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const { quantityOf, setQuantity } = useCart()
  const [ref, shown] = useInView<HTMLElement>()
  const quantity = quantityOf(product.id)

  return (
    <article ref={ref} className={`${styles.card} ${revealClass(shown)}`} style={revealDelay((index % 4) * 90)}>
      <div
        className={`${styles.picture} ${product.image_url ? styles.withPhoto : ''}`}
        style={product.image_url ? undefined : { background: tintColor(product.tint) }}
      >
        {product.image_url ? (
          <img className={styles.photo} src={product.image_url} alt={product.name} loading="lazy" />
        ) : (
          <ProductArt art={product.art} tint={product.tint} />
        )}
        <span className={styles.category}>{product.category}</span>
      </div>
      <div className={styles.body}>
        <h3 className={styles.name}>{product.name}</h3>
        <p className={styles.description}>{product.description}</p>
        {product.price > 0 ? (
          <p className={styles.price}>
            {rupees(product.price)}
            <span className={styles.per}> / pack</span>
          </p>
        ) : (
          <p className={`${styles.price} ${styles.onRequest}`}>Price on request</p>
        )}
        <div className={styles.buy}>
          {product.spec && <span className={styles.spec}>{product.spec}</span>}
          {quantity > 0 ? (
            <div className={`${ui.stepper} ${styles.stepper}`}>
              <button
                type="button"
                className={ui.stepButton}
                aria-label={`Decrease quantity of ${product.name}`}
                onClick={() => setQuantity(product.id, quantity - 1)}
              >
                −
              </button>
              <span className={ui.stepCount} aria-live="polite">
                {quantity}
              </span>
              <button
                type="button"
                className={ui.stepButton}
                aria-label={`Increase quantity of ${product.name}`}
                onClick={() => setQuantity(product.id, quantity + 1)}
              >
                +
              </button>
            </div>
          ) : (
            <button type="button" className={`${ui.button} ${ui.primary}`} onClick={() => setQuantity(product.id, 1)}>
              Add to cart
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
