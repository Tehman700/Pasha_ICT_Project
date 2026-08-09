import { LandingHeader } from "@/components/landing/LandingHeader";
import { Hero } from "@/components/landing/Hero";
import { Problem } from "@/components/landing/Problem";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Stack } from "@/components/landing/Stack";
import { Origin } from "@/components/landing/Origin";
import { DemoAccess } from "@/components/landing/DemoAccess";
import { Founders } from "@/components/landing/Founders";
import { Faq } from "@/components/landing/Faq";
import { Footer } from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <LandingHeader />
      <main className="flex-1">
        <Hero />
        <Problem />
        <HowItWorks />
        <Stack />
        <Origin />
        <DemoAccess />
        <Founders />
        <Faq />
      </main>
      <Footer />
    </div>
  );
}
