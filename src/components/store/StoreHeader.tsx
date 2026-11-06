import { Menu } from 'lucide-react'
import { HeaderCart } from '@/components/HeaderCart'
import { ShopNavigation } from '@/components/ShopNavigation'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { shopHref } from '@/lib/site-links'

export function StoreHeader({ count, onCart }: { count?: number; onCart?: () => void }) {
  return (
    <header className="agency-header">
      <a className="brand brand-light" href={shopHref()} aria-label="CUBE Shop">CUBE SHOP<span>®</span></a>
      <nav className="agency-nav" aria-label="Navigimi i shopit">
        <ShopNavigation active />
        <a href={shopHref('/shop/muri')}>Konfiguro murin</a>
        <a href={shopHref('/shop/foto')}>Printo foton</a>
      </nav>
      <div className="header-actions">
        <HeaderCart count={count} onCart={onCart} />
        <Sheet>
          <SheetTrigger render={<Button className="agency-menu" variant="outline" size="icon-lg" aria-label="Hap menynë" />}><Menu /></SheetTrigger>
          <SheetContent className="agency-sheet">
            <SheetHeader>
              <SheetTitle className="sheet-logo">CUBE SHOP</SheetTitle>
              <SheetDescription>Postera, print dhe produkte të personalizuara.</SheetDescription>
            </SheetHeader>
            <nav className="sheet-links"><ShopNavigation mobile /></nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
