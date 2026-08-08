import { AddressData } from "@/types/memo";

interface Props {
  value: AddressData;
  onChange: (next: AddressData) => void;
  disabled?: boolean;
}

export const AddressBlock = ({ value, onChange, disabled = false }: Props) => {
  const set = (k: keyof AddressData, v: string) => onChange({ ...value, [k]: v });
  return (
    <div className="address-block">
      <input
        type="text"
        placeholder="Street Address"
        value={value.street1}
        disabled={disabled}
        onChange={(e) => set("street1", e.target.value)}
      />
      <input
        type="text"
        placeholder="Address Line 2 (Suite, Unit, etc.)"
        value={value.street2}
        disabled={disabled}
        onChange={(e) => set("street2", e.target.value)}
      />
      <div className="address-row">
        <input
          type="text"
          placeholder="City"
          value={value.city}
          disabled={disabled}
          onChange={(e) => set("city", e.target.value)}
        />
        <input
          type="text"
          placeholder="State"
          value={value.state}
          disabled={disabled}
          onChange={(e) => set("state", e.target.value)}
        />
        <input
          type="text"
          placeholder="ZIP"
          value={value.zip}
          disabled={disabled}
          onChange={(e) => set("zip", e.target.value)}
        />
      </div>
    </div>
  );
};
