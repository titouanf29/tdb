"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/design-system";
import { NUIT } from "./nuit";

/** La dernière chose lue : une phrase, un bouton, et ce que ça ne coûte pas. */
export function Final() {
  return (
    <section id="arrivee" className="relative overflow-hidden py-24 sm:py-32"
      style={{ background: `radial-gradient(900px 420px at 50% 100%, #12304D 0%, ${NUIT.fond} 70%)`, color: NUIT.texte }}>
      <Container width="wide" className="relative text-center">
        <h2 className="mx-auto max-w-[44rem] text-[clamp(2.1rem,5.2vw,3.8rem)] font-semibold leading-[1.04] tracking-[-0.035em]"
          style={{ fontFamily: "var(--cap-font-display)" }}>
          Votre premier trade,<br /><span style={{ color: NUIT.or }}>sans risquer un euro.</span>
        </h2>
        <p className="mx-auto mt-6 max-w-[34rem] text-[1.05rem] leading-[1.7]" style={{ color: NUIT.texte2 }}>
          Créez votre compte en une minute, répondez à cinq questions, et le site s&apos;adapte à ce que vous
          voulez apprendre.
        </p>
        <Link href="/register"
          className="group mt-10 inline-flex min-h-[56px] items-center justify-center gap-2 rounded-[14px] px-9 text-[1.05rem] font-semibold transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ backgroundColor: NUIT.or, color: "#1A1204", outlineColor: NUIT.or, boxShadow: "0 14px 40px -12px rgba(232,168,32,0.6)" }}>
          Créer mon compte gratuit
          <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
        </Link>
        <p className="mt-5 text-[0.88rem]" style={{ color: NUIT.texte3 }}>
          Gratuit · Aucune carte bancaire · Argent virtuel uniquement · Déjà inscrit ?{" "}
          <Link href="/login" className="inline-flex min-h-[32px] items-center underline underline-offset-2" style={{ color: NUIT.texte2 }}>Se connecter</Link>
        </p>
      </Container>
    </section>
  );
}
