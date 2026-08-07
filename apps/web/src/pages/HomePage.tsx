import { Navbar } from '../components/homepage/Navbar';
import { ScrollProgress } from '../components/homepage/ScrollProgress';
import { Hero } from '../components/homepage/Hero';
import { FeatureGrid } from '../components/homepage/FeatureGrid';
import { HowItsBuilt } from '../components/homepage/HowItsBuilt';
import { TechStack } from '../components/homepage/TechStack';
import { FinalCta } from '../components/homepage/FinalCta';
import { Footer } from '../components/homepage/Footer';

export function HomePage() {
  return (
    <div>
      <ScrollProgress />
      <Navbar />
      <main>
        <Hero />
        <FeatureGrid />
        <HowItsBuilt />
        <TechStack />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
