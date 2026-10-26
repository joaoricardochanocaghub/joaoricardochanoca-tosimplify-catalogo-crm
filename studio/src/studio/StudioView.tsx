import { useStore } from "../store/StoreProvider";
import { Editor } from "./Editor";
import { DocZoom, ProposalDoc } from "./ProposalDoc";

interface StudioViewProps {
  onPickClient: () => void;
  onPickCatalog: () => void;
}

/** Editor à esquerda, A4 à direita. */
export function StudioView({ onPickClient, onPickCatalog }: StudioViewProps) {
  const { active, data } = useStore();
  return (
    <section className="studio">
      <Editor onPickClient={onPickClient} onPickCatalog={onPickCatalog} />
      <DocZoom>
        <ProposalDoc proposal={active} issuer={data.issuer} />
      </DocZoom>
    </section>
  );
}
