import {
  clampConfidence,
  getConfidenceLabel,
  getConfidenceTone,
  type PlantIdentificationOption,
} from "@/lib/plants/identity";

type IdentificationOptionsProps = {
  title?: string;
  summary?: string;
  options: PlantIdentificationOption[];
  selectedOption: PlantIdentificationOption | null;
  onSelect?: (option: PlantIdentificationOption) => void;
};

export default function IdentificationOptions({
  title = "Propositions",
  summary,
  options,
  selectedOption,
  onSelect,
}: IdentificationOptionsProps) {
  if (options.length === 0) {
    return null;
  }

  return (
    <div className="identification-panel">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="field-label mb-2">{title}</p>
          {summary ? (
            <p className="subtle-text max-w-2xl text-sm">{summary}</p>
          ) : (
            <p className="subtle-text max-w-2xl text-sm">
              Choisis la proposition la plus proche visuellement. Tu pourras encore la modifier
              ensuite.
            </p>
          )}
        </div>

        {selectedOption && (
          <div className="selected-callout">
            <span className="selected-callout-label">Choix actif</span>
            <strong>{selectedOption.common_name}</strong>
          </div>
        )}
      </div>

      <div className="grid gap-3">
        {options.map((option) => {
          const selected =
            selectedOption?.common_name === option.common_name &&
            selectedOption?.scientific_name === option.scientific_name;
          const safeConfidence = clampConfidence(option.confidence);
          const confidenceTone = getConfidenceTone(option.confidence);
          const scientificName = option.scientific_name || "Nom scientifique non renseigne";

          return (
            <button
              key={`${option.common_name}-${option.scientific_name}`}
              type="button"
              onClick={() => onSelect?.(option)}
              className={`identification-option ${selected ? "is-selected" : ""}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <p className="text-lg font-black text-[#183624]">{option.common_name}</p>
                    {selected && <span className="selection-chip">Selectionnee</span>}
                  </div>
                  <p className="subtle-text text-sm italic">{scientificName}</p>
                </div>

                <div className="flex flex-col items-start gap-2 sm:items-end">
                  <span className={`confidence-chip ${confidenceTone}`}>
                    {safeConfidence}% {getConfidenceLabel(option.confidence).toLowerCase()}
                  </span>
                  <div className="confidence-bar" aria-hidden="true">
                    <span style={{ width: `${safeConfidence}%` }} />
                  </div>
                </div>
              </div>

              <p className="mt-3 text-sm font-semibold text-[#425345]">{option.reason}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
