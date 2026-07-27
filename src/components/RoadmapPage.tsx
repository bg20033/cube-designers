import RoadmapView from "@/components/RoadmapView"
import {
  ContactSection,
  SiteFooter,
  SiteHeader,
  SiteNoise,
} from "@/components/SiteChrome"
import "@/roadmap.css"

export default function RoadmapPage() {
  return (
    <div className="agency-site rm-page">
      <SiteNoise />
      <SiteHeader />

      <main id="top">
        <RoadmapView />
        <ContactSection />
      </main>

      <SiteFooter />
    </div>
  )
}
