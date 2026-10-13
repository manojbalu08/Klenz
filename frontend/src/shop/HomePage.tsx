import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { CheckIcon, IdealIcon } from '../components/icons'
import { Reveal, useReducedMotion } from '../components/motion'
import { lines } from '../lib/format'
import type { Product } from '../lib/types'
import Headline from './Headline'
import styles from './HomePage.module.css'
import ProductCard from './ProductCard'
import { useSite } from './SiteDataContext'
import ui from './ui.module.css'
import VideoShowcase from './VideoShowcase'

export default function HomePage() {
  const { content: c, products, videos } = useSite().data
  const highlights = lines(c['home.highlights'])

  return (
    <>
      <title>Klenz — Tissue paper, made by Klenz</title>

      <section className={`${ui.pageHero} ${styles.hero}`}>
        <div className={`${ui.circle} ${styles.driftSlow}`} style={{ right: -120, top: -140, width: 460, height: 460, background: 'var(--soft2)' }} />
        <div
          className={`${ui.circle} ${styles.driftFast}`}
          style={{ left: -90, bottom: -120, width: 320, height: 320, background: 'var(--accent)', opacity: 0.55 }}
        />
        <Bubbles />
        <div className={styles.heroInner}>
          <div className={styles.heroText}>
            <span className={ui.badge}>{c['home.badge']}</span>
            <h1 className={`${ui.display} ${styles.heroTitle}`}>
              <Headline text={c['home.headline']} />
            </h1>
            <p className={`${ui.lead} ${styles.heroLead}`}>{c['home.intro']}</p>
            <div className={styles.ctas}>
              <a href="#shop" className={`${ui.button} ${ui.primary} ${ui.large} ${styles.shine}`}>
                Order now
              </a>
            </div>
          </div>
          <div className={styles.heroArtColumn}>
            <HeroArt photo={c['home.hero_image']} video={c['home.hero_video']} />
          </div>
        </div>
      </section>

      {highlights.length > 0 && <Highlights items={highlights} />}

      <section id="shop" className={`${ui.section} ${styles.anchor} ${styles.shop}`}>
        <span className={`${ui.circle} ${styles.shopGlowA}`} aria-hidden="true" />
        <span className={`${ui.circle} ${styles.shopGlowB}`} aria-hidden="true" />
        <div className={`${ui.container} ${ui.stack} ${styles.shopInner}`}>
          <ProductGrid
            products={products}
            eyebrow={c['home.shop_eyebrow']}
            title={c['home.shop_title']}
            note={c['home.shop_note']}
          />
        </div>
      </section>

      <IdealFor eyebrow={c['home.ideal_eyebrow']} title={c['home.ideal_title']} items={lines(c['home.ideal_items'])} />

      {videos.length > 0 && (
        <section id="videos" className={`${ui.section} ${styles.videos} ${styles.anchor}`}>
          <div className={`${ui.container} ${ui.stack}`}>
            <Reveal className={ui.heading}>
              <span className={`${ui.eyebrow} ${styles.videosEyebrow}`}>{c['home.videos_eyebrow']}</span>
              <h2 className={ui.title}>{c['home.videos_title']}</h2>
              {c['home.videos_note'] && <span className={styles.videosNote}>{c['home.videos_note']}</span>}
            </Reveal>
            <Reveal delay={120}>
              <VideoShowcase videos={videos} />
            </Reveal>
          </div>
        </section>
      )}

      <section className={ui.section}>
        <div className={`${ui.container} ${ui.stack}`}>
          <Reveal>
            <h2 className={ui.title}>{c['home.steps_title']}</h2>
          </Reveal>
          <ol className={`${ui.cards} ${styles.steps}`}>
            {[1, 2, 3].map((step) => (
              <li key={step} className={styles.stepItem}>
                <Reveal delay={(step - 1) * 120} className={`${ui.card} ${styles.stepCard}`}>
                  <span className={styles.stepNumber} data-step={step}>
                    {step}
                  </span>
                  <h3 className={ui.cardTitle}>{c[`home.step${step}_title`]}</h3>
                  <p className={ui.cardText}>{c[`home.step${step}_text`]}</p>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <Branding
        eyebrow={c['home.branding_eyebrow']}
        title={c['home.branding_title']}
        text={c['home.branding_text']}
        points={lines(c['home.branding_points'])}
      />

      <section className={styles.bulkSection}>
        <Reveal className={styles.bulk}>
          <div className={styles.bulkText}>
            <h2 className={`${ui.display} ${styles.bulkTitle}`}>{c['home.bulk_title']}</h2>
            <p>{c['home.bulk_text']}</p>
          </div>
          <a href="#shop" className={`${ui.button} ${ui.accent} ${ui.large}`}>
            Start your order
          </a>
        </Reveal>
      </section>
    </>
  )
}

/** The design's hero shapes with the product video (or photo, or the design's drawing). */
function HeroArt({ photo, video }: { photo: string; video: string }) {
  const reducedMotion = useReducedMotion()
  const videoRef = useRef<HTMLVideoElement>(null)
  const playVideo = Boolean(video) && !reducedMotion

  // Browsers only autoplay muted video; set it directly as well as through the attribute.
  useEffect(() => {
    const player = videoRef.current
    if (!player) return
    player.muted = true
    player.play().catch(() => undefined)
  }, [playVideo, video])

  return (
    <div className={styles.heroArt}>
      <span className={styles.artSun} aria-hidden="true" />
      <span className={styles.artDot} aria-hidden="true" />
      <span className={styles.artTile} aria-hidden="true" />
      {playVideo ? (
        <video
          ref={videoRef}
          className={styles.heroPhoto}
          src={video}
          poster={photo || undefined}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-label="Klenz facial tissue"
        />
      ) : photo ? (
        <img className={styles.heroPhoto} src={photo} alt="Klenz tissue products" width={280} height={420} />
      ) : (
        <>
          <span className={styles.artBox} aria-hidden="true" />
          <span className={styles.artBoxTop} aria-hidden="true" />
          <span className={styles.artBoxBand} aria-hidden="true" />
          <span className={styles.artRoll} aria-hidden="true" />
          <span className={styles.artRollCore} aria-hidden="true" />
        </>
      )}
    </div>
  )
}

/** Soft circles that float up behind the hero, like tissue in the air. */
function Bubbles() {
  return (
    <div className={styles.bubbles} aria-hidden="true">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={styles.bubble} />
      ))}
    </div>
  )
}

/** The dark strip under the hero, scrolling sideways in a loop. */
function Highlights({ items }: { items: string[] }) {
  const list = (hidden: boolean) => (
    <ul className={styles.highlightTrack} aria-hidden={hidden || undefined}>
      {items.map((text) => (
        <li key={text}>
          <span className={styles.dot} aria-hidden="true" />
          {text}
        </li>
      ))}
    </ul>
  )
  return (
    <section className={styles.highlights} aria-label="Why Klenz">
      <div className={styles.marquee}>
        {list(false)}
        {list(true)}
      </div>
    </section>
  )
}

interface ProductGridProps {
  products: Product[]
  eyebrow: string
  title: string
  note: string
}

function ProductGrid({ products, eyebrow, title, note }: ProductGridProps) {
  const categories = useMemo(() => ['All', ...new Set(products.map((p) => p.category))], [products])
  const [filter, setFilter] = useState('All')
  const active = categories.includes(filter) ? filter : 'All'
  const visible = active === 'All' ? products : products.filter((p) => p.category === active)

  return (
    <>
      <Reveal className={styles.shopHead}>
        <div className={ui.heading}>
          <span className={ui.eyebrow}>{eyebrow}</span>
          <h2 className={ui.title}>{title}</h2>
          {note && <span className={ui.note}>{note}</span>}
        </div>
        {categories.length > 2 && (
          <div className={styles.chips} role="group" aria-label="Filter products by category">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                className={styles.chip}
                aria-pressed={category === active}
                onClick={() => setFilter(category)}
              >
                {category}
              </button>
            ))}
          </div>
        )}
      </Reveal>
      {visible.length > 0 ? (
        // Keyed by filter so the cards animate in again when the filter changes.
        <div key={active} className={styles.grid}>
          {visible.map((product, index) => (
            <ProductCard key={product.id} product={product} index={index} />
          ))}
        </div>
      ) : (
        <p className={styles.noProducts}>New products are on their way — please check back soon.</p>
      )}
    </>
  )
}

function IdealFor({ eyebrow, title, items }: { eyebrow: string; title: string; items: string[] }) {
  if (items.length === 0) return null
  return (
    <section className={`${ui.section} ${styles.ideal}`}>
      <div className={`${ui.container} ${ui.stack}`}>
        <Reveal className={ui.heading}>
          <span className={ui.eyebrow}>{eyebrow}</span>
          <h2 className={ui.title}>{title}</h2>
        </Reveal>
        <ul className={styles.idealGrid}>
          {items.map((item, index) => (
            <li key={item}>
              <Reveal delay={index * 80} className={styles.idealItem}>
                <span className={styles.idealIcon}>
                  <IdealIcon label={item} size={30} />
                </span>
                <span className={styles.idealLabel}>{item}</span>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

interface BrandingProps {
  eyebrow: string
  title: string
  text: string
  points: string[]
}

function Branding({ eyebrow, title, text, points }: BrandingProps) {
  return (
    <section className={`${ui.section} ${styles.branding}`}>
      <div className={`${ui.container} ${styles.brandingInner}`}>
        <Reveal className={styles.brandingMedia}>
          <span className={`${ui.circle} ${styles.brandingGlow}`} aria-hidden="true" />
          <span className={styles.brandingChip} aria-hidden="true">
            <span>✦</span> Your logo, your colours
          </span>
          <img
            className={styles.brandingBox}
            src="/images/catalogue/branding-box.jpg"
            alt="Klenz facial tissue box printed with the Klenz logo"
            width={900}
            height={660}
            loading="lazy"
          />
          <img
            className={styles.brandingCover}
            src="/images/catalogue/branding-napkins.jpg"
            alt="Klenz premium napkins in a printed pack"
            width={900}
            height={660}
            loading="lazy"
          />
        </Reveal>
        <Reveal delay={150} className={styles.brandingText}>
          <span className={ui.eyebrow}>{eyebrow}</span>
          <h2 className={ui.title}>{title}</h2>
          <p className={ui.lead}>{text}</p>
          <ul className={styles.points}>
            {points.map((point) => (
              <li key={point}>
                <span className={styles.check}>
                  <CheckIcon size={16} />
                </span>
                {point}
              </li>
            ))}
          </ul>
          <Link to="/contact" className={`${ui.button} ${ui.primary} ${ui.large} ${styles.brandingCta}`}>
            Ask about custom branding
          </Link>
        </Reveal>
      </div>
    </section>
  )
}
