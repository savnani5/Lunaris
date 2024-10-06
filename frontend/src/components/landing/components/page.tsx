import ButtonGradient from "@/components/landing/assets/svg/ButtonGradient";
import Benefits from "@/components/landing/components/Benefits";
import Collaboration from "@/components/landing/components/Collaboration";
import Footer from "@/components/landing/components/Footer";
// import Header from "@/components/landing/Header";
import Hero from "@/components/landing/components/Hero";
import Pricing from "@/components/landing/components/Pricing";
import Roadmap from "@/components/landing/components/Roadmap";
import Videowall from "@/components/landing/components/Videowall";
import Services from "@/components/landing/components/Services";

export default function Home() {
  return (
    <>
      <div className="pt-[4.75rem] lg:pt-[5.25rem] overflow-hidden">
        {/* <Header /> */}
        <Hero />
        <Videowall />
        <Benefits />
        <Collaboration />
        {/* <Services />  */}
        <Pricing />
        <Roadmap />
        <Footer /> 
      </div>

      <ButtonGradient />
    </>
  );
}
