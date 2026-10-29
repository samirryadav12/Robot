"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { RoboLogo } from "./RoboLogo";
import { 
  Bot, 
  Layers, 
  ShoppingCart, 
  Wrench, 
  Menu, 
  X, 
  ArrowRight,
  Sparkles
} from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: "/projects", label: "Robot Projects", icon: Bot },
    { href: "/components-catalog", label: "Parts Library", icon: Layers },
    { href: "/availability", label: "Where to Buy", icon: ShoppingCart },
    { href: "/assistant", label: "Build Assistant", icon: Wrench, badge: "AI Helper" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#05060a]/75 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand (left out on the 3D journey pages; the empty span keeps the links and buttons where they are) */}
        {pathname?.endsWith("/journey") ? <span aria-hidden /> : <RoboLogo />}

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2">
          {navLinks.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
                  isActive
                    ? "bg-brand-500 text-white shadow-sm"
                    : "text-slate-700 hover:text-brand-600 hover:bg-brand-50"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-brand-500"}`} />
                <span>{item.label}</span>
                {item.badge && !isActive && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 animate-pulse">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/assistant"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-brand-700 bg-brand-100 rounded-full hover:bg-brand-200 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-brand-500" />
            <span>Build Helper</span>
          </Link>

          <Link
            href="/projects/line-follower/journey"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold shadow-md hover:shadow-lg transition-all duration-200 group"
          >
            <span>Start Building</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-xl text-slate-700 hover:bg-brand-50"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[#E8E2D9] bg-[#FAF7F2] px-4 pt-2 pb-6 space-y-2">
          {navLinks.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-semibold ${
                  isActive
                    ? "bg-brand-500 text-white"
                    : "text-slate-700 hover:bg-brand-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${isActive ? "text-white" : "text-brand-500"}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isActive ? "bg-white text-brand-700" : "bg-brand-100 text-brand-700"}`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
          <div className="pt-3">
            <Link
              href="/projects/line-follower/journey"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-brand-500 hover:bg-brand-600 text-white font-bold shadow-md"
            >
              <span>Start Building Line Follower</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
