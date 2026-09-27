"use client";

import { Bandeau } from "@/components/landing/Bandeau";
import { DemoSection } from "@/components/landing/DemoSection";
import { Final } from "@/components/landing/Final";
import { Fonctions } from "@/components/landing/Fonctions";
import { HeroNuit } from "@/components/landing/HeroNuit";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingNav } from "@/components/landing/LandingNav";
import { Preuves } from "@/components/landing/Preuves";
import { Verite } from "@/components/landing/Verite";

/**
 * La page de présentation.
 *
 * Elle a quelques secondes pour convaincre quelqu'un qui ne connaît pas le
 * site. L'ordre suit ce qu'il se demande :
 *
 *   qu'est-ce que c'est ?          le haut de page, avec le vrai cours ;
 *   ça tourne vraiment ?           les cours qui défilent, les chiffres ;
 *   pourquoi celui-là ?            les figures de TikTok, mesurées ;
 *   qu'est-ce que j'y fais ?       les six fonctionnalités ;
 *   à quoi ça ressemble ?          la démo interactive ;
 *   je commence ?                  l'appel final.
 *
 * Tout ce qui est chiffré est lu sur le serveur ou vérifiable sur le site :
 * aucun faux témoignage, aucun faux compteur d'utilisateurs.
 */
export default function LandingPage() {
  return (
    <div className="cap min-h-screen" style={{ backgroundColor: "#07111D" }}>
      <LandingNav />
      <main>
        <HeroNuit />
        <Bandeau />
        <div className="pb-24 pt-16 sm:pb-28" style={{ backgroundColor: "#07111D" }}>
          <Preuves />
        </div>
        <Verite />
        <Fonctions />
        <DemoSection />
        <Final />
      </main>
      <LandingFooter />
    </div>
  );
}
