"use client";

type ExampleChipsProps = {
  examples: string[];
  onSelect: (value: string) => void;
};

export function ExampleChips({ examples, onSelect }: ExampleChipsProps) {
  return (
    <div className="example-chips">
      {examples.map((example) => (
        <button
          key={example}
          className="example-chip"
          type="button"
          onClick={() => onSelect(example)}
        >
          {example}
        </button>
      ))}
    </div>
  );
}
