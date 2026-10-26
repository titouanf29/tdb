import { ImageResponse } from "next/og";
import { fiche } from "@/lib/cours/catalogue";
import { place } from "@/lib/cours/liens";

/*
 * L'aperçu d'un lien vers une leçon (TikTok, WhatsApp, réseaux) : le titre de
 * LA leçon, son chapitre et sa durée, au lieu de la même image générique
 * pour les 37. Les couleurs sont celles du site : l'encre, le ciel, l'ambre
 * pour marquer.
 */

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Une leçon de bourse gratuite sur CaptenTDB";

export default async function Image({ params }: { params: Promise<{ numero: string }> }) {
  const { numero } = await params;
  const f = fiche(Number(numero));
  const p = f ? place(f.numero) : null;
  const titre = f?.titre ?? "Apprendre la bourse, sans risquer un euro";

  return new ImageResponse(
    (
      <div style={{
        width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between",
        padding: "72px 80px", backgroundColor: "#0B1726", color: "#E8EDF1",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 22, height: 22, borderRadius: 999, backgroundColor: "#E5A83A" }} />
          <div style={{ fontSize: 34, letterSpacing: -0.5 }}>CaptenTDB</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {p && (
            <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 30, color: "rgba(232,237,241,0.7)" }}>
              <div style={{ width: 44, height: 3, backgroundColor: "#E5A83A" }} />
              <div style={{ display: "flex" }}>{`${p.titreChapitre}, leçon ${p.rang} sur ${p.total}`}</div>
            </div>
          )}
          <div style={{ display: "flex", fontSize: titre.length > 48 ? 62 : 76, lineHeight: 1.08, fontWeight: 700, letterSpacing: -1 }}>{titre}</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 28, color: "rgba(232,237,241,0.75)" }}>
          <div style={{ display: "flex" }}>{`Leçon gratuite, sans compte${f?.duree ? `, ${f.duree}` : ""}`}</div>
          <div>captentdb.fr</div>
        </div>
      </div>
    ),
    size,
  );
}
