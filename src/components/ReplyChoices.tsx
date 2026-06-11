export interface Choice {
  label: string
  onSelect: () => void
}

/** A column of canned replies the user can click. */
export function ReplyChoices({ choices }: { choices: Choice[] }) {
  return (
    <div className="choices">
      {choices.map((c, i) => (
        <button key={i} className="choice" onClick={c.onSelect}>
          {c.label}
        </button>
      ))}
    </div>
  )
}
