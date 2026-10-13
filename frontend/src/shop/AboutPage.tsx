import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router'
import {
  ArrowRightIcon,
  BoxIcon,
  IdealIcon,
  LayersIcon,
  PinIcon,
  TopicIcon,
  UserIcon,
  WhatsAppIcon,
} from '../components/icons'
import { Reveal } from '../components/motion'
import ThemeBackdrop from '../components/ThemeBackdrop'
import { lines, pairs } from '../lib/format'
import type { Product } from '../lib/types'
import { whatsappLink, whatsappNumber } from '../lib/whatsapp'
import styles from './AboutPage.module.css'
import Headline from './Headline'
import ProductArt from './ProductArt'
import { useSite } from './SiteDataContext'
import ui from './ui.module.css'

interface Range {
  name: string
  products: Product[]
}

interface Fact {
  icon: ReactNode
  title: string
  text: string
}

function plural(count: number, word: string): string {
  return `${word}${count === 1 ? '' : 's'}`
}

/** About Us: story, values, the range, the founders, customers and a partner banner. All text is in the admin. */
export default function AboutPage() {
  const { content: c, products, settings } = useSite().data
  const waNumber = whatsappNumber(settings.whatsapp_number, settings.country_code)

  // Products grouped by category, in the order the admin sorted them.
  const ranges = useMemo<Range[]>(() => {
    const grouped = new Map<string, Product[]>()
    for (const product of products) grouped.set(product.category, [...(grouped.get(product.category) ?? []), product])
    return [...grouped].map(([name, items]) => ({ name, products: items }))
  }, [products])

  const facts: Fact[] = [
    ...(products.length > 0
      ? [
          { icon: <BoxIcon size={26} />, title: String(products.length), text: plural(products.length, 'product') },
          { icon: <LayersIcon size={26} />, title: String(ranges.length), text: plural(ranges.length, 'range') },
        ]
      : []),
    ...pairs(c['about.facts']).map((fact) => ({
      icon: <TopicIcon label={`${fact.title} ${fact.text}`} size={26} />,
      ...fact,
    })),
  ]
  const promise = pairs(c['about.promise'])
  const values = [1, 2, 3, 4]
    .map((n) => ({ title: c[`about.value${n}_title`], text: c[`about.value${n}_text`] }))
    .filter((value) => value.title)
  const people = [1, 2]
    .map((n) => ({
      name: c[`about.person${n}_name`].trim(),
      role: c[`about.person${n}_role`],
      bio: c[`about.person${n}_bio`],
      photo: c[`about.person${n}_photo`],
    }))
    .filter((person) => person.name)
  const customerTypes = pairs(c['about.customer_types'])
  const customerNames = lines(c['about.customer_names'])

  return (
    <>
      <title>About Klenz</title>

      <section className={`${ui.pageHero} ${ui.themed} ${styles.hero}`}>
        <ThemeBackdrop tone="hero" />
        <div className={styles.heroInner}>
          <div className={styles.heroText}>
            <span className={ui.badge}>{c['about.badge']}</span>
            <h1 className={`${ui.display} ${styles.title}`}>
              <Headline text={c['about.headline']} />
            </h1>
            <p className={`${ui.lead} ${styles.lead}`}>{c['about.intro']}</p>
            <div className={styles.ctas}>
              <Link to="/#shop" className={`${ui.button} ${ui.primary} ${ui.large}`}>
                Shop our range
              </Link>
              <Link to="/contact" className={`${ui.button} ${ui.ghost} ${ui.large}`}>
                Talk to us
              </Link>
            </div>
          </div>
          {c['about.hero_image'] && (
            <div className={styles.heroMedia}>
              <div className={styles.heroPhoto}>
                <img src={c['about.hero_image']} alt="Klenz tissue" />
              </div>
              {c['about.made_in'] && (
                <span className={`${styles.chip} ${styles.chipPlace}`}>
                  <PinIcon size={18} />
                  {c['about.made_in']}
                </span>
              )}
              {promise.length > 0 && (
                <span className={`${styles.chip} ${styles.chipPromise}`}>
                  {promise.map((item) => item.title).join(' · ')}
                </span>
              )}
            </div>
          )}
        </div>
      </section>

      {facts.length > 0 && (
        <div className={styles.factsBand}>
          <ul className={styles.facts}>
            {facts.map((fact, index) => (
              <li key={`${fact.title}-${fact.text}`}>
                <Reveal delay={index * 90} className={styles.fact}>
                  <span className={styles.factIcon}>{fact.icon}</span>
                  <span className={styles.factText}>
                    <strong className={ui.display}>{fact.title}</strong>
                    {fact.text}
                  </span>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      )}

      <section className={`${ui.section} ${ui.themed} ${styles.story}`}>
        <ThemeBackdrop layout={2} />
        <div className={`${ui.container} ${styles.storyInner}`}>
          {c['about.photo_url'] && (
            <Reveal className={styles.storyMedia}>
              <span className={`${ui.circle} ${styles.storyCircle}`} aria-hidden="true" />
              <img className={styles.storyPhoto} src={c['about.photo_url']} alt="Klenz tissue" loading="lazy" />
            </Reveal>
          )}
          <Reveal delay={120} className={styles.storyText}>
            <span className={ui.eyebrow}>{c['about.story_eyebrow']}</span>
            <h2 className={ui.title}>{c['about.story_title']}</h2>
            <p>{c['about.story_p1']}</p>
            {c['about.story_p2'] && <p>{c['about.story_p2']}</p>}
            {promise.length > 0 && (
              <ul className={styles.promise}>
                {promise.map((item) => (
                  <li key={item.title}>
                    <span className={styles.promiseIcon}>
                      <TopicIcon label={item.title} size={22} />
                    </span>
                    <span className={styles.promiseText}>
                      <strong>{item.title}</strong>
                      {item.text}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Reveal>
        </div>
      </section>

      {values.length > 0 && (
        <section className={`${ui.section} ${ui.themed} ${styles.values}`}>
          <ThemeBackdrop layout={1} />
          <div className={`${ui.container} ${ui.stack}`}>
            <Reveal className={`${ui.heading} ${styles.centered}`}>
              <span className={ui.eyebrow}>{c['about.values_eyebrow']}</span>
              <h2 className={ui.title}>
                <Headline text={c['about.values_title']} />
              </h2>
            </Reveal>
            <ol className={styles.valueGrid}>
              {values.map((value, index) => (
                <li key={index}>
                  <Reveal delay={index * 100} className={styles.valueCard}>
                    <span className={styles.valueTop}>
                      <span className={styles.valueIcon}>
                        <TopicIcon label={value.title} size={28} />
                      </span>
                      <span className={styles.valueNumber} aria-hidden="true">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                    </span>
                    <h3 className={ui.cardTitle}>{value.title}</h3>
                    <p className={ui.cardText}>{value.text}</p>
                  </Reveal>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {ranges.length > 0 && (
        <section className={`${ui.section} ${ui.themed} ${styles.range}`}>
          <ThemeBackdrop tone="dark" layout={2} />
          <div className={`${ui.container} ${ui.stack} ${styles.rangeInner}`}>
            <Reveal className={ui.heading}>
              <span className={`${ui.eyebrow} ${styles.rangeEyebrow}`}>{c['about.range_eyebrow']}</span>
              <h2 className={ui.title}>
                <Headline text={c['about.range_title']} />
              </h2>
              {c['about.range_text'] && <span className={styles.rangeNote}>{c['about.range_text']}</span>}
            </Reveal>
            <ul className={styles.rangeGrid}>
              {ranges.map((range, index) => {
                const cover = range.products.find((product) => product.image_url) ?? range.products[0]
                return (
                  <li key={range.name}>
                    <Reveal delay={index * 100} className={styles.rangeItem}>
                      <Link to={`/?range=${encodeURIComponent(range.name)}#shop`} className={styles.rangeCard}>
                        <span className={styles.rangePhoto}>
                          {cover.image_url ? (
                            <img src={cover.image_url} alt="" loading="lazy" />
                          ) : (
                            <ProductArt art={cover.art} tint={cover.tint} />
                          )}
                        </span>
                        <span className={styles.rangeBody}>
                          <span className={styles.rangeName}>{range.name}</span>
                          <span className={styles.rangeCount}>
                            {range.products.length} {plural(range.products.length, 'product')}
                          </span>
                          <span className={styles.rangeList}>
                            {range.products.map((product) => product.name).join(' · ')}
                          </span>
                          <span className={styles.rangeLink}>
                            See the range <ArrowRightIcon size={16} />
                          </span>
                        </span>
                      </Link>
                    </Reveal>
                  </li>
                )
              })}
            </ul>
          </div>
        </section>
      )}

      {people.length > 0 && (
        <section className={`${ui.section} ${ui.themed} ${styles.team}`}>
          <ThemeBackdrop layout={3} />
          <div className={`${ui.container} ${ui.stack}`}>
            <Reveal className={`${ui.heading} ${styles.centered}`}>
              <span className={ui.eyebrow}>{c['about.team_eyebrow']}</span>
              <h2 className={ui.title}>
                <Headline text={c['about.team_title']} />
              </h2>
              {c['about.team_text'] && <span className={styles.sectionNote}>{c['about.team_text']}</span>}
            </Reveal>
            <ul className={styles.teamGrid} data-count={people.length}>
              {people.map((person, index) => (
                <li key={index}>
                  <Reveal delay={index * 140} className={styles.person}>
                    <span className={styles.avatar}>
                      {person.photo ? (
                        <img src={person.photo} alt={person.name} loading="lazy" />
                      ) : (
                        <UserIcon size={58} />
                      )}
                    </span>
                    <h3 className={styles.personName}>{person.name}</h3>
                    {person.role && <span className={styles.personRole}>{person.role}</span>}
                    {person.bio && <p className={styles.personBio}>{person.bio}</p>}
                  </Reveal>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className={`${ui.section} ${ui.themed} ${styles.customers}`}>
        <ThemeBackdrop layout={1} />
        <div className={`${ui.container} ${ui.stack}`}>
          <Reveal className={ui.heading}>
            <span className={ui.eyebrow}>{c['about.customers_eyebrow']}</span>
            <h2 className={ui.title}>
              <Headline text={c['about.customers_title']} />
            </h2>
            {c['about.customers_text'] && <span className={styles.sectionNote}>{c['about.customers_text']}</span>}
          </Reveal>
          {customerTypes.length > 0 && (
            <ul className={styles.segmentGrid}>
              {customerTypes.map((type, index) => (
                <li key={type.title}>
                  <Reveal delay={(index % 4) * 80} className={styles.segment}>
                    <span className={styles.segmentIcon}>
                      <IdealIcon label={type.title} size={28} />
                    </span>
                    <h3 className={styles.segmentTitle}>{type.title}</h3>
                    {type.text && <p className={styles.segmentText}>{type.text}</p>}
                  </Reveal>
                </li>
              ))}
            </ul>
          )}
          {customerNames.length > 0 && (
            <Reveal className={styles.names}>
              <span className={styles.namesTitle}>{c['about.customer_names_title']}</span>
              <ul className={styles.nameList}>
                {customerNames.map((name) => (
                  <li key={name} className={styles.name}>
                    <span className={styles.nameInitial} aria-hidden="true">
                      {name.charAt(0).toUpperCase()}
                    </span>
                    {name}
                  </li>
                ))}
              </ul>
            </Reveal>
          )}
          <Reveal className={styles.partner}>
            <div className={styles.partnerText}>
              <h2 className={`${ui.display} ${styles.partnerTitle}`}>
                <Headline text={c['about.partner_title']} />
              </h2>
              <p>{c['about.partner_text']}</p>
            </div>
            <div className={styles.partnerActions}>
              <Link to="/contact" className={`${ui.button} ${ui.accent} ${ui.large}`}>
                Talk to us
              </Link>
              {waNumber && (
                <a
                  href={whatsappLink(waNumber, 'Hello Klenz! I would like to know about becoming a partner.')}
                  target="_blank"
                  rel="noreferrer"
                  className={`${ui.button} ${ui.large} ${styles.partnerWhatsapp}`}
                >
                  <WhatsAppIcon size={20} />
                  WhatsApp us
                </a>
              )}
            </div>
          </Reveal>
        </div>
      </section>
    </>
  )
}
