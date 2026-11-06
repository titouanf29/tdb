import { ImageResponse } from "next/og";
import { analyseActif } from "@/lib/actifs-serveur";

/*
 * L'aperçu d'un lien vers une page d'actif : le nom de l'actif et l'annonce
 * de l'analyse du jour. Pas de cours ni de verdict dans l'image : un aperçu
 * reste en cache chez les réseaux bien après que le marché a bougé.
 */

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "L'analyse du jour sur CaptenTDB";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = await analyseActif(slug);
  const nom = a && a !== "indisponible" ? a.name : "Les marchés";
  const categorie = a && a !== "indisponible" ? a.categorie : "Analyses du jour";

  return new ImageResponse(
    (
      <div style={{
        width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between",
        padding: "72px 80px", backgroundColor: "#0B1726", color: "#E8EDF1",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 22, height: 22, borderRadius: 999, backgroundColor: "#E5A83A" }} />
          <div style={{ display: "flex", fontSize: 34 }}>CaptenTDB</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 30, color: "rgba(232,237,241,0.75)" }}>
            <div style={{ width: 44, height: 3, backgroundColor: "#E5A83A" }} />
            <div style={{ display: "flex" }}>{categorie}</div>
          </div>
          <div style={{ display: "flex", fontSize: nom.length > 18 ? 72 : 88, lineHeight: 1.05, fontWeight: 700 }}>{nom}</div>
          <div style={{ display: "flex", fontSize: 40, color: "rgba(232,237,241,0.85)" }}>L&apos;analyse du jour, expliquée simplement</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 28, color: "rgba(232,237,241,0.75)" }}>
          <div style={{ display: "flex" }}>Gratuit, sans compte, mise à jour toutes les 10 minutes</div>
          <div style={{ display: "flex" }}>captentdb.fr</div>
        </div>
      </div>
    ),
    size,
  );
}
