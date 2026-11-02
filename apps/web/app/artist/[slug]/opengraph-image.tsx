import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getArtistBySlug } from "@/lib/queries/artists";
import { fixHebrewForSatori } from "@/app/lib/satori-rtl";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const artist = await getArtistBySlug(slug);

  const [regular, bold] = await Promise.all([
    readFile(join(process.cwd(), "assets/fonts/Heebo-Regular.ttf")),
    readFile(join(process.cwd(), "assets/fonts/Heebo-Black.ttf")),
  ]);

  const title = fixHebrewForSatori(artist?.nameHe ?? "טיקטים");
  const subtitle = fixHebrewForSatori(artist?.genres.map((g) => g.nameHe).join(" · ") || "כל ההופעות בישראל, במקום אחד");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-end",
          backgroundColor: "#0b0b10",
          backgroundImage: "linear-gradient(135deg, #15151d 0%, #0b0b10 60%)",
          padding: "80px",
        }}
      >
        <div style={{ display: "flex", color: "#ff3d7f", fontSize: 32, fontFamily: "Heebo", marginBottom: 24 }}>{fixHebrewForSatori("טיקטים")}</div>
        <div
          style={{
            display: "flex",
            color: "#f5f5f7",
            fontSize: 72,
            fontWeight: 900,
            fontFamily: "Heebo",
            lineHeight: 1.2,
            textAlign: "right",
            maxWidth: 1000,
          }}
        >
          {title}
        </div>
        <div style={{ display: "flex", color: "#a1a1b0", fontSize: 32, fontFamily: "Heebo", marginTop: 20 }}>{subtitle}</div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Heebo", data: regular, weight: 400, style: "normal" },
        { name: "Heebo", data: bold, weight: 900, style: "normal" },
      ],
    },
  );
}
