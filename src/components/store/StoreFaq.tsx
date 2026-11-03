import { Plus } from "lucide-react"
import { storeFaqs } from "@/data/store-faqs"

export function StoreFaq() {
  return (
    <section className="cube-faq" aria-labelledby="cube-faq-heading">
      <div>
        <span className="cube-eyebrow">PARA SE TË ZGJEDHËSH</span>
        <h2 id="cube-faq-heading">
          Pyetje të vogla.
          <br />
          Përgjigje të qarta.
        </h2>
        <p>Diçka tjetër në mendje?</p>
        <a className="cube-text-link" href="mailto:info@cube-designers.com">
          Na shkruaj →
        </a>
      </div>
      <div>
        {storeFaqs.map((faq) => (
          <details key={faq.question}>
            <summary>
              {faq.question}
              <Plus size={16} />
            </summary>
            <p>{faq.answer}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
