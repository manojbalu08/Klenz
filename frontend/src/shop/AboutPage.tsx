import styles from './AboutPage.module.css'
import Headline from './Headline'
import { useSite } from './SiteDataContext'
import ui from './ui.module.css'

export default function AboutPage() {
  const { content: c } = useSite().data
  const photo = c['about.photo_url']

  return (
    <>
      <title>About Klenz</title>

      <section className={`${ui.pageHero} ${styles.hero}`}>
        <div
          className={ui.circle}
          style={{ right: -80, top: -100, width: 380, height: 380, background: 'var(--accent)', opacity: 0.55 }}
        />
        <div className={`${ui.heroInner} ${styles.heroInner}`}>
          <span className={ui.badge}>{c['about.badge']}</span>
          <h1 className={`${ui.display} ${styles.title}`}>
            <Headline text={c['about.headline']} />
          </h1>
          <p className={`${ui.lead} ${styles.lead}`}>{c['about.intro']}</p>
        </div>
      </section>

      <section className={`${ui.section} ${styles.story}`}>
        <div className={`${ui.container} ${styles.storyInner}`}>
          <div className={styles.photo}>
            {photo ? (
              <img src={photo} alt="The Klenz team and factory" loading="lazy" />
            ) : (
              <>
                <div className={ui.circle} style={{ left: -50, bottom: -70, width: 260, height: 260, background: 'var(--soft2)' }} />
                <div className={ui.circle} style={{ right: 40, top: 40, width: 90, height: 90, background: 'var(--accent)' }} />
                <div className={styles.photoLabel}>[ Factory or team photo ]</div>
              </>
            )}
          </div>
          <div className={styles.storyText}>
            <h2 className={`${ui.display} ${styles.storyTitle}`}>{c['about.story_title']}</h2>
            <p>{c['about.story_p1']}</p>
            <p>{c['about.story_p2']}</p>
          </div>
        </div>
      </section>

      <section className={styles.values}>
        <ol className={`${ui.container} ${ui.cards} ${styles.valueList}`}>
          {[1, 2, 3].map((n) => (
            <li key={n} className={ui.card}>
              <span className={styles.valueNumber}>{String(n).padStart(2, '0')}</span>
              <h3 className={ui.cardTitle}>{c[`about.value${n}_title`]}</h3>
              <p className={ui.cardText}>{c[`about.value${n}_text`]}</p>
            </li>
          ))}
        </ol>
      </section>
    </>
  )
}
