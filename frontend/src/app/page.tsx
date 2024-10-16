import ButtonGradient from "@/components/landing/assets/svg/ButtonGradient";
import Benefits from "@/components/landing/components/Benefits";
import Collaboration from "@/components/landing/components/Collaboration";
import Footer from "@/components/landing/components/Footer";
import Header from "@/components/landing/components/Header";
import Hero from "@/components/landing/components/Hero";
import Pricing from "@/components/landing/components/Pricing";
import Videowall from "@/components/landing/components/Videowall";

export default function Home() {
  return (
    <>
      <div className="pt-[4.75rem] lg:pt-[5.25rem] overflow-hidden">
        <Header />
        <Hero />
        <Videowall />
        <Benefits />
        <Collaboration />
        <Pricing />
        <Footer /> 
      </div>

      <ButtonGradient />
    </>
  );
}
