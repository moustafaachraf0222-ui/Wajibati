export function Field({
  label,
  value,
  onChange,
  type = 'text',
  min,
  required = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  min?: string;
  required?: boolean;
}) {
  return (
    <label>
      <span>{label}</span>
      <input value={value} type={type} min={min} required={required} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
