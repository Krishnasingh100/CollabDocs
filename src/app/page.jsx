import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { Users } from "@/components/landing/users";
import { About } from "@/components/landing/about";
import { Footer } from "@/components/landing/footer";
export default function Home() {
  return (
    <div className="flex min-h-full flex-col">
      <Navbar />
      <main className="flex flex-1 flex-col">
        <Hero />
        <Features />
        <Users />
        <About />
      </main>
      <Footer />
    </div>
  );
}
