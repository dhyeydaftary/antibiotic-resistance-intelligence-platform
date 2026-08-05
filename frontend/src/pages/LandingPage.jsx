import { useEffect, useRef } from 'react';
import Lenis from 'lenis';

import '../styles/landing-tokens.css';
import '../styles/landing.css';

import usePageTitle from '../hooks/usePageTitle';
import Cursor from '../components/landing/Cursor';
import Header from '../components/landing/Header';
import Hero from '../components/landing/Hero';
import ClinicalWorkflowSection from '../components/landing/ClinicalWorkflowSection';
import CapabilitiesSection from '../components/landing/CapabilitiesSection';
import Manifesto from '../components/landing/Manifesto';
import Marquee from '../components/landing/Marquee';
import Transparency from '../components/landing/Transparency';
import AboutPreviewSection from '../components/landing/AboutPreviewSection';
import CTA from '../components/landing/CTA';
import Footer from '../components/landing/Footer';
import BackToTop from '../components/landing/BackToTop';

function LandingPage() {
  usePageTitle();
  
  const lenisRef = useRef(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    lenisRef.current = lenis;

    let rafId;
    function raf(time) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  return (
    <div id="top" className="landing-page noise bg-paper font-sans">
      <Cursor />
      <Header lenisRef={lenisRef} />
      <Hero />
      <ClinicalWorkflowSection />
      <CapabilitiesSection />
      <Manifesto />
      <Marquee />
      <Transparency />
      <AboutPreviewSection />
      <CTA />
      <Footer lenisRef={lenisRef} />
      <BackToTop lenisRef={lenisRef} />
    </div>
  );
}

export default LandingPage;