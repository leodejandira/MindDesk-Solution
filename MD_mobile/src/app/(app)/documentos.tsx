import { useState } from "react";
import { CursosAdmin, DocsAdmin, useFlash } from "@/components/cursos";
import { Screen, Segmented, T } from "@/components/ui";

export default function Documentos() {
  const [tab, setTab] = useState<"docs" | "cursos">("docs");
  const { flash, notice } = useFlash();
  return (
    <Screen title="Documentos & Cursos">
      <T muted>Gerencie arquivos, materiais internos e conteúdos de treinamento da equipe.</T>
      <Segmented options={[{ key: "docs", label: "Documentos" }, { key: "cursos", label: "Cursos" }]} value={tab} onChange={setTab} />
      {notice}
      {tab === "docs" ? <DocsAdmin flash={flash} /> : <CursosAdmin flash={flash} />}
    </Screen>
  );
}
