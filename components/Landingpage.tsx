"use client";
import React, { useEffect, useRef } from "react";
import Link from "next/link";

export default function CursorLandingPage() {
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: "0px 0px -50px 0px",
    };

    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          (entry.target as HTMLElement).style.opacity = "1";
          (entry.target as HTMLElement).style.transform = "translateY(0)";
        }
      });
    }, observerOptions);

    const elements = document.querySelectorAll(".animate-on-scroll");
    elements.forEach((el) => {
      if (observerRef.current) {
        observerRef.current.observe(el);
      }
    });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return (
    <div className="bg-black text-white min-h-screen">
      {/* Navigation
      <nav className="fixed top-0 w-full z-50 bg-black bg-opacity-80 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-6 py-2 flex justify-between items-center">
          <div className="text-2xl font-bold">Stellar</div>

          <div className="hidden md:flex gap-8 items-center">
            <a
              href="#features"
              className="text-white text-opacity-80 hover:text-opacity-100 transition-colors text-sm"
            >
              Features
            </a>
            <a
              href="#enterprise"
              className="text-white text-opacity-80 hover:text-opacity-100 transition-colors text-sm"
            >
              Enterprise
            </a>
            <a
              href="#pricing"
              className="text-white text-opacity-80 hover:text-opacity-100 transition-colors text-sm"
            >
              Pricing
            </a>
            <a
              href="#resources"
              className="text-white text-opacity-80 hover:text-opacity-100 transition-colors text-sm"
            >
              Resources
            </a>
          </div>
        </div>
      </nav>
     */}
      {/* Hero Section */}
      <section className="min-h-screen flex flex-col justify-center items-center text-center px-6 pb-16 pt-20">
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight max-w-6xl mb-8">
          <span className="bg-gradient-to-br from-white to-gray-400 bg-clip-text text-transparent">
            Built to make you extraordinarily productive, Stellar-IDE is the
            best way to code.
          </span>
        </h1>
        <div className="mt-16 flex justify-center">
          <Link href="/home">
            <button className="px-8 py-4 bg-white text-black rounded-full font-bold text-lg hover:shadow-2xl hover:shadow-white/50 transition-all duration-300 hover:scale-105">
              Get Started
            </button>
          </Link>
        </div>
      </section>

      {/* Trusted By Section */}
      {/*   <section className="pt-10 pb-20 px-6 text-center">
        <div className="flex justify-center items-center gap-12 flex-wrap max-w-6xl mx-auto">
          {[
            "Stripe",
            "OpenAI",
            "Linear",
            "Datadog",
            "NVIDIA",
            "Figma",
            "Ramp",
            "Adobe",
          ].map((company) => (
            <div
              key={company}
              className="text-gray-400 text-xl font-semibold hover:text-gray-300 transition-colors cursor-pointer"
            >
              {company}
            </div>
          ))}
        </div>

      </section>
*/}
      {/* Footer */}
      <footer className="py-16 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-12 mb-12">
          {[
            {
              title: "Product",
              links: ["Features", "Enterprise", "Pricing", "Changelog"],
            },
            {
              title: "Resources",
              links: ["Download", "Documentation", "Blog", "Community"],
            },
            {
              title: "Company",
              links: ["About", "Careers", "Contact"],
            },
            {
              title: "Legal",
              links: ["Terms of Service", "Privacy Policy", "Security"],
            },
          ].map((section, idx) => (
            <div key={idx}>
              <h4 className="text-xs uppercase tracking-wider text-white text-opacity-50 mb-4">
                {section.title}
              </h4>
              <ul className="space-y-2">
                {section.links.map((link, linkIdx) => (
                  <li key={linkIdx}>
                    <a
                      href="#"
                      className="text-white text-opacity-70 hover:text-opacity-100 transition-colors text-sm"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="max-w-7xl mx-auto pt-8 text-center text-white text-opacity-50 text-sm">
          © 2025 Cursor
        </div>
      </footer>
    </div>
  );
}
