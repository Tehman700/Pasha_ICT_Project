import { LandingHeader } from "@/components/landing/LandingHeader";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Stats } from "@/components/landing/Stats";
import { DemoAccess } from "@/components/landing/DemoAccess";
import { Founders } from "@/components/landing/Founders";
import { Footer } from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <LandingHeader />
      <main className="flex-1">
        <Hero />
        <HowItWorks />
        <Stats />
        <DemoAccess />
        <Founders />
      </main>
      <Footer />
    </div>
  );
}
