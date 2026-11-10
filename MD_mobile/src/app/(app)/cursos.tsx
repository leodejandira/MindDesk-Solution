import { MeusCursos, useFlash } from "@/components/cursos";
import { Screen, T } from "@/components/ui";

export default function Cursos() {
  const { flash, notice } = useFlash();
  return (
    <Screen title="Meus Cursos">
      <T muted>Acesse os treinamentos disponíveis para você.</T>
      {notice}
      <MeusCursos flash={flash} />
    </Screen>
  );
}
