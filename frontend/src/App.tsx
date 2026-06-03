import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FiInstagram,
  FiLinkedin,
  FiMinus,
  FiPlus,
  FiSearch,
  FiShoppingBag,
  FiUser,
  FiX,
  FiZap,
} from "react-icons/fi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChatAssistant } from "@/components/ChatAssistant";
import { AdminDashboard } from "@/components/AdminDashboard";
import { UserNav } from "@/components/UserNav";
import { getStorefront, type Product } from "@/lib/storefront-data";

type CartItem = {
  product: Product;
  option: string;
  price: number;
  quantity: number;
};

const formulaTabs = [
  {
    id: "burn",
    label: "Burn Calories",
    copy: "Green tea caffeine and a light calorie profile support an active routine without loading the drink with sugar.",
  },
  {
    id: "metabolism",
    label: "Boost Metabolism",
    copy: "Caffeine, taurine, vitamin C, and B vitamins are positioned as a functional blend for steady daily energy.",
  },
  {
    id: "focus",
    label: "Enhance Focus",
    copy: "The formula leans into alertness with 75mg caffeine and B-vitamin support for work, training, or late sessions.",
  },
];

const useCases = [
  "Studying for the big score",
  "Going for a PR",
  "Building v1 tonight",
  "Training for a 10K",
  "Finishing that deck",
  "Chasing the first sale",
  "Locking in for placements",
  "Pulling a late shift",
  "Getting ready for trials",
];

function formatPrice(price: number) {
  return `Rs. ${price.toLocaleString("en-IN")}`;
}

/* Scroll-triggered reveal hook */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    );
    const children = el.querySelectorAll("[data-reveal]");
    children.forEach((child) => observer.observe(child));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

/* 3D tilt on hover â€” Red Bull style card perspective */
function useTilt() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handleMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      el.style.transform = `perspective(800px) rotateY(${x * 12}deg) rotateX(${-y * 12}deg) scale3d(1.02, 1.02, 1.02)`;
    };
    const handleLeave = () => {
      el.style.transform = "perspective(800px) rotateY(0deg) rotateX(0deg) scale3d(1, 1, 1)";
    };
    el.addEventListener("mousemove", handleMove);
    el.addEventListener("mouseleave", handleLeave);
    return () => {
      el.removeEventListener("mousemove", handleMove);
      el.removeEventListener("mouseleave", handleLeave);
    };
  }, []);
  return ref;
}


/* Global 3D mouse glow â€” spotlight that follows cursor */
function useMouseGlow() {
  useEffect(() => {
    const glow = document.createElement("div");
    glow.className = "mouse-glow";
    document.body.appendChild(glow);
    const handleMove = (e: MouseEvent) => {
      glow.style.left = e.clientX + "px";
      glow.style.top = e.clientY + "px";
    };
    window.addEventListener("mousemove", handleMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handleMove);
      glow.remove();
    };
  }, []);
}

function App() {
  const { data, isLoading } = useQuery({
    queryKey: ["gigi-storefront"],
    queryFn: getStorefront,
  });
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);

  const itemCount = cart.reduce((count, item) => count + item.quantity, 0);
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const addToCart = (product: Product, option: string, price: number) => {
    setCart((current) => {
      const existing = current.find(
        (item) => item.product.id === product.id && item.option === option,
      );
      if (existing) {
        return current.map((item) =>
          item === existing ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }
      return [...current, { product, option, price, quantity: 1 }];
    });
    setCartOpen(true);
  };

  const updateQuantity = (index: number, direction: 1 | -1) => {
    setCart((current) =>
      current
        .map((item, itemIndex) =>
          itemIndex === index
            ? { ...item, quantity: Math.max(0, item.quantity + direction) } : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  useMouseGlow();

  if (isLoading || !data) {
    return (
      <main className="loading-screen">
        <div className="loading-screen__inner">
          <div className="brand-mark">GiGi</div>
          <div className="loading-bar"><div className="loading-bar__fill" /></div>
          <p>Loading storefront...</p>
        </div>
      </main>
    );
  }

  return (
    <>
      <div className="grain" aria-hidden="true" />
      <div className="ambient-glow" aria-hidden="true" />
      <AnnouncementBar />
      <Header
        nav={data.nav}
        itemCount={itemCount}
        menuOpen={menuOpen}
        onMenuClose={() => setMenuOpen(false)}
        onCartOpen={() => setCartOpen(true)}
      />
      <main>
        <HeroCarousel slides={data.heroSlides} />
        <LogoMarquee logos={data.logos} />
        <ProductSection products={data.products} onAdd={addToCart} />
        <NutritionSection nutrition={data.nutrition} products={data.products} />
        <FormulaSection image={data.formulaImage} />
        <UseCaseMarquee />
        <TastingEvents events={data.events} />
        <SocialStrip />
      </main>
      <Footer nav={data.nav} />
      <CartDrawer
        open={cartOpen}
        cart={cart}
        total={total}
        onClose={() => setCartOpen(false)}
        onQuantity={updateQuantity}
      />
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
      <UserNav onAdminToggle={setShowAdmin} />
      {showAdmin && (
        <div className="admin-overlay">
          <div className="admin-overlay__backdrop" onClick={() => setShowAdmin(false)} />
          <div className="admin-overlay__panel">
            <button className="admin-close" onClick={() => setShowAdmin(false)}>&times;</button>
            <AdminDashboard />
          </div>
        </div>
      )}
      <ChatAssistant />
      <a className="whatsapp-float" href="https://www.whatsapp.com" aria-label="Shop on WhatsApp">
        <FiZap />
        Shop now
      </a>
    </>
  );
}

function AnnouncementBar() {
  return (
    <div className="announcement">
      <div className="announcement__track">
        {Array.from({ length: 6 }).map((_, index) => (
          <span key={index}>Use GIGI10 for 10% off - free Bengaluru shipping above Rs. 500</span>
        ))}
      </div>
    </div>
  );
}

function Header({
  nav,
  itemCount,
  menuOpen,
  onMenuClose,
  onCartOpen,
}: {
  nav: string[];
  itemCount: number;
  menuOpen: boolean;
  onMenuClose: () => void;
  onCartOpen: () => void;
}) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`site-header ${scrolled ? "site-header--scrolled" : ""}`}>
      <div className="site-header__inner">

        <nav className="site-nav" aria-label="Main navigation">
          {nav.map((item) => (
            <a href={`#${item.toLowerCase().replaceAll(" ", "-")}`} key={item}>
              {item}
            </a>
          ))}
        </nav>
        <a className="site-logo" href="#home" aria-label="Gigi home">
          GiGi
        </a>
        <div className="site-actions">
          <Button variant="ghost" className="profile-button" aria-label="Log in">
            <FiUser />
            <span>Account</span>
          </Button>
          <Button variant="ghost" className="cart-button" onClick={onCartOpen}>
            <FiShoppingBag />
            <span>Cart</span>
            {itemCount > 0 && <em key={itemCount}>{itemCount}</em>}
          </Button>
        </div>
      </div>
      <div className={`mobile-menu ${menuOpen ? "is-open" : ""}`}>
        <div className="mobile-menu__panel">
          <div className="mobile-menu__top">
            <span className="site-logo">GiGi</span>
            <Button variant="icon" size="icon" aria-label="Close menu" onClick={onMenuClose}>
              <FiX />
            </Button>
          </div>
          {nav.map((item) => (
            <a href={`#${item.toLowerCase().replaceAll(" ", "-")}`} key={item} onClick={onMenuClose}>
              {item}
            </a>
          ))}
          <div className="mobile-menu__social">
            <FiInstagram />
            <FiLinkedin />
            <FiZap />
          </div>
        </div>
      </div>
    </header>
  );
}

function HeroCarousel({ slides }: { slides: Awaited<ReturnType<typeof getStorefront>>["heroSlides"] }) {
  const [index, setIndex] = useState(0);
  const slide = slides[index];
  const revealRef = useReveal();

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, 5200);
    return () => window.clearInterval(timer);
  }, [slides.length]);


  return (
    <section className={`hero hero--${slide.accent}`} id="home" ref={revealRef}>
      <div className="hero__image-wrap">
        {slides.map((heroSlide, heroIndex) => (
          <img
            key={heroSlide.image}
            src={heroSlide.image}
            alt={heroSlide.title}
            className={heroIndex === index ? "is-active" : ""}
          />
        ))}
        <button
          type="button"
          className="hero__arrow hero__arrow--prev"
          onClick={() => setIndex((current) => (current - 1 + slides.length) % slides.length)}
          aria-label="Previous slide"
        >
          â€¹
        </button>
        <button
          type="button"
          className="hero__arrow hero__arrow--next"
          onClick={() => setIndex((current) => (current + 1) % slides.length)}
          aria-label="Next slide"
        >
          â€º
        </button>
      </div>
      <div className="hero__copy">
        <Badge tone={slide.accent === "yellow" ? "yellow" : "lime"}>{slide.eyebrow}</Badge>
        <h1>{slide.title}</h1>
        <p>{slide.copy}</p>
        <div className="hero__bullets">
          {slide.bullets.map((bullet) => (
            <span key={bullet}>
              <FiZap />
              {bullet}
            </span>
          ))}
        </div>

      </div>
    </section>
  );
}

function LogoMarquee({ logos }: { logos: string[] }) {
  const ref = useReveal();
  return (
    <section className="logo-band" aria-label="Partner logos" ref={ref} data-reveal>
      <h2>Fueling dreamers at</h2>
      <div className="logo-grid">
        {logos.map((logo) => (
          <span key={logo}>{logo}</span>
        ))}
      </div>
    </section>
  );
}

function ProductSection({
  products,
  onAdd,
}: {
  products: Product[];
  onAdd: (product: Product, option: string, price: number) => void;
}) {
  const ref = useReveal();
  return (
    <section className="section products" id="shop-all" ref={ref}>
      <div className="section__heading" data-reveal>
        <Badge tone="light">Shop all</Badge>
        <h2>Choose your flavour</h2>
        <p>Two core flavours and a trial pack, styled with the bright product-first rhythm of the original storefront.</p>
      </div>
      <div className="product-grid">
        {products.map((product, i) => (
          <div key={product.id} data-reveal style={{ transitionDelay: `${i * 0.12}s` }}>
            <ProductCard product={product} onAdd={onAdd} />
          </div>
        ))}
      </div>
    </section>
  );
}

function ProductCard({
  product,
  onAdd,
}: {
  product: Product;
  onAdd: (product: Product, option: string, price: number) => void;
}) {
  const tiltRef = useTilt();
  const [selectedOption, setSelectedOption] = useState(product.options[0]);
  const background = useMemo(
    () => ({
      "--product-accent": product.accent,
      "--product-accent-glow": product.accent + "26",
    }),
    [product.accent],
  );

  return (
    <Card className="product-card" ref={tiltRef} style={{ ...(background as React.CSSProperties), transformStyle: "preserve-3d", transition: "transform 0.15s ease-out" }}>
      <CardHeader>
        <div className="product-card__media">
          <img src={product.image} alt={product.name} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="product-card__title">
          <h3>{product.name}</h3>
          <strong key={selectedOption.price}>{formatPrice(selectedOption.price)}</strong>
        </div>
        <div className="pack-switch" role="tablist" aria-label={`${product.name} pack options`}>
          {product.options.map((option) => (
            <button
              type="button"
              key={option.label}
              className={option.label === selectedOption.label ? "is-active" : ""}
              onClick={() => setSelectedOption(option)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p>{product.description}</p>
        <ul className="benefit-list">
          {product.benefits.map((benefit) => (
            <li key={benefit}>
              <FiZap />
              {benefit}
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <Button variant="dark" onClick={() => onAdd(product, selectedOption.label, selectedOption.price)}>
          <FiShoppingBag />
          Add to Cart
        </Button>
      </CardFooter>
    </Card>
  );
}

function NutritionSection({ nutrition, products }: { nutrition: string[][]; products: Product[] }) {
  const ref = useReveal();
  return (
    <section className="section nutrition" ref={ref}>
      <div className="nutrition__image-stack" aria-hidden="true" data-reveal>
        {products.slice(0, 2).map((product, index) => (
          <img
            key={product.id}
            src={product.image}
            alt=""
            className={index === 0 ? "nutrition__can nutrition__can--front" : "nutrition__can nutrition__can--back"}
          />
        ))}
      </div>
      <div className="nutrition__copy" data-reveal>
        <Badge tone="dark">Ingredients</Badge>
        <h2>Low sugar, low calorie, vitamin-forward.</h2>
        <p>
          The product section mirrors the storefront detail flow: flavour overview, pack selector, benefits,
          then a nutrition panel for quick comparison.
        </p>
        <div className="nutrition-table">
          {nutrition.map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FormulaSection({ image }: { image: string }) {
  const ref = useReveal();
  return (
    <section className="section formula" ref={ref}>
      <div className="section__heading" data-reveal>
        <Badge tone="lime">Advanced formula</Badge>
        <h2>Better ingredients. Better energy.</h2>
      </div>
      <div className="formula__grid">
        <div className="formula__image" data-reveal>
          <img src={image} alt="Gigi Lemon Lime with ingredients" />
        </div>
        <Tabs defaultValue="burn" className="formula__tabs">
          <TabsList>
            {formulaTabs.map((tab) => (
              <TabsTrigger value={tab.id} key={tab.id}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {formulaTabs.map((tab) => (
            <TabsContent value={tab.id} key={tab.id}>
              <p>{tab.copy}</p>
              <div className="formula__metrics">
                <span>
                  <strong>75mg</strong>
                  Caffeine
                </span>
                <span>
                  <strong>1000mg</strong>
                  Taurine
                </span>
                <span>
                  <strong>0g</strong>
                  Sugar
                </span>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
}

function UseCaseMarquee() {
  const row = [...useCases, ...useCases, ...useCases];
  return (
    <section className="usecase" aria-label="Use cases">
      <div className="usecase__row">
        {row.map((item, index) => (
          <span key={`${item}-${index}`}>{item}</span>
        ))}
      </div>
      <div className="usecase__row usecase__row--reverse">
        {row.map((item, index) => (
          <span key={`${item}-reverse-${index}`}>{item}</span>
        ))}
      </div>
    </section>
  );
}

function TastingEvents({ events }: { events: Awaited<ReturnType<typeof getStorefront>>["events"] }) {
  const ref = useReveal();
  return (
    <section className="section events" id="tasting-events" ref={ref}>
      <div className="events__intro" data-reveal>
        <Badge tone="yellow">Free tasting events</Badge>
        <h2>Host a tasting event</h2>
        <p>Bring a bright sampling setup to gyms, offices, or community events with a compact event request flow.</p>
        <Button variant="primary" size="lg" asChild>
          <a href="#contact">Request a tasting event</a>
        </Button>
      </div>
      <div className="event-grid">
        {events.map((event, i) => (
          <EventCard3D key={event.title} event={event} delay={i} />
        ))}
      </div>
    </section>
  );
}

function SocialStrip() {
  const ref = useReveal();
  return (
    <section className="social-strip" ref={ref} data-reveal>
      <h2>Dream big, drink Gigi</h2>
      <a href="https://www.instagram.com/gigienergy.in">
        <FiInstagram />
        @gigienergy.in
      </a>
      <div className="tag-marquee">
        <div>
          {Array.from({ length: 4 }).map((_, index) => (
            <span key={index}>
              no sugar | boost metabolism | natural flavours | enhance focus | no artificial colours |
              better-for-you energy |
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function EventCard3D({ event, delay }: { event: Awaited<ReturnType<typeof getStorefront>>["events"][0]; delay: number }) {
  const tiltRef = useTilt();
  return (
    <Card className="event-card" ref={tiltRef} data-reveal style={{ transitionDelay: `${delay * 0.1}s`, transformStyle: "preserve-3d", transition: "transform 0.15s ease-out" }}>
      <img src={event.image} alt={event.title} />
      <CardContent>
        <h3>{event.title}</h3>
        <p>{event.copy}</p>
      </CardContent>
    </Card>
  );
}

function Footer({ nav }: { nav: string[] }) {
  return (
    <footer className="footer" id="contact">
      <div className="footer__brand">
        <span className="site-logo">GiGi</span>
        <p>India-inspired better-for-you energy drink with sugar-free flavours, vitamins, and clean energy.</p>
      </div>
      <div>
        <h3>Learn</h3>
        {nav.slice(1).map((item) => (
          <a href={`#${item.toLowerCase().replaceAll(" ", "-")}`} key={item}>
            {item}
          </a>
        ))}
      </div>
      <div>
        <h3>Connect</h3>
        <a href="#distributors">Become a distributor</a>
        <a href="#tasting-events">Tasting events</a>
        <a href="#contact">Contact</a>
        <div className="footer__icons">
          <FiInstagram />
          <FiLinkedin />
          <FiZap />
        </div>
      </div>
      <div className="footer__bottom">
        <span>&copy; 2026 Gigi Energy</span>
        <span>UPI</span>
        <span>VISA</span>
        <span>RuPay</span>
        <span>NetBanking</span>
      </div>
    </footer>
  );
}

function CartDrawer({
  open,
  cart,
  total,
  onClose,
  onQuantity,
}: {
  open: boolean;
  cart: CartItem[];
  total: number;
  onClose: () => void;
  onQuantity: (index: number, direction: 1 | -1) => void;
}) {
  return (
    <aside className={`cart-drawer ${open ? "is-open" : ""}`} aria-hidden={!open}>
      <div className="cart-drawer__backdrop" onClick={onClose} />
      <div className="cart-drawer__panel">
        <div className="cart-drawer__top">
          <h2>Your cart</h2>
          <Button variant="icon" size="icon" aria-label="Close cart" onClick={onClose}>
            <FiX />
          </Button>
        </div>
        {cart.length === 0 ? (
          <div className="cart-empty">
            <FiShoppingBag />
            <h3>Your cart is empty</h3>
            <Button variant="primary" onClick={onClose}>
              Continue shopping
            </Button>
          </div>
        ) : (
          <>
            <div className="cart-items">
              {cart.map((item, index) => (
                <div className="cart-item" key={`${item.product.id}-${item.option}`}>
                  <img src={item.product.image} alt={item.product.name} />
                  <div>
                    <h3>{item.product.name}</h3>
                    <p>{item.option}</p>
                    <strong>{formatPrice(item.price)}</strong>
                  </div>
                  <div className="quantity">
                    <button type="button" aria-label="Decrease quantity" onClick={() => onQuantity(index, -1)}>
                      <FiMinus />
                    </button>
                    <span>{item.quantity}</span>
                    <button type="button" aria-label="Increase quantity" onClick={() => onQuantity(index, 1)}>
                      <FiPlus />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="cart-total">
              <span>Estimated total</span>
              <strong>{formatPrice(total)}</strong>
            </div>
            <Button variant="dark" size="lg">Check out</Button>
          </>
        )}
      </div>
    </aside>
  );
}

function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <div className={`search-overlay ${open ? "is-open" : ""}`} aria-hidden={!open}>
      <div className="search-overlay__panel">
        <Button variant="icon" size="icon" aria-label="Close search" onClick={onClose}>
          <FiX />
        </Button>
        <label htmlFor="site-search">Search</label>
        <div className="search-box">
          <FiSearch />
          <input id="site-search" placeholder="Search flavours, events, distributors..." autoComplete="off" />
        </div>
        <div className="search-suggestions">
          <span>Lemon Lime</span>
          <span>Pineapple Coconut</span>
          <span>Trial Pack</span>
          <span>Tasting events</span>
        </div>
      </div>
    </div>
  );
}

export default App;
