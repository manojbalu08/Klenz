import { headlineParts } from '../lib/format'
import ui from './ui.module.css'

/** Renders headline text, colouring words the admin wrapped in *stars*. */
export default function Headline({ text }: { text: string }) {
  return headlineParts(text).map((part, index) =>
    part.highlight ? (
      <span key={index} className={ui.highlight}>
        {part.text}
      </span>
    ) : (
      part.text
    ),
  )
}
