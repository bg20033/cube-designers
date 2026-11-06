import { StoreShell, StoreFooter } from '@/components/store/StoreChrome'

export default function ShopNotFound() {
  return (
    <StoreShell>
      <main className="not-found-main" id="main-content">
        <span>ERROR / 404</span>
        <h1>KJO FAQE <em>NUK U GJET.</em></h1>
        <p>Produkti ose faqja që kërkove nuk ekziston më.</p>
        <a href="/">Kthehu te shopi ←</a>
      </main>
      <StoreFooter />
    </StoreShell>
  )
}
