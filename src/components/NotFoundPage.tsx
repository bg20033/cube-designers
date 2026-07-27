import { ArrowLeft, ArrowUpRight } from "lucide-react"

import {
  SiteFooter,
  SiteHeader,
  SiteNoise,
} from "@/components/SiteChrome"

export default function NotFoundPage() {
  return (
    <div className="agency-site not-found-page">
      <SiteNoise />
      <SiteHeader />
      <main className="not-found-main">
        <span>ERROR / 404</span>
        <h1>
          KJO FAQE
          <em>NUK U GJET.</em>
        </h1>
        <p>
          Linku mund të jetë ndryshuar ose faqja nuk ekziston më. Kthehu te
          studioja dhe vazhdo prej aty.
        </p>
        <div>
          <a href="/">
            <ArrowLeft aria-hidden="true" />
            Kthehu në ballinë
          </a>
          <a href="/start-project">
            Nis një projekt
            <ArrowUpRight aria-hidden="true" />
          </a>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
