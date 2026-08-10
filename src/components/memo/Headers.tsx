import { OccuMedLogo } from "@/components/branding/OccuMedLogo";

interface Props {
  title: string;
}

const HeaderTitle = ({ title }: Props) => {
  const isContactInformation = title.includes("Contact Information");

  return (
    <div
      className="header-title"
      style={isContactInformation ? { fontSize: "34px" } : undefined}
    >
      {title.split("\n").map((line, index) => (
        <span key={`${line}-${index}`} className="block">
          {line}
        </span>
      ))}
    </div>
  );
};

export const AuroraHeader = ({ title }: Props) => (
  <div className="aurora-header">
    <OccuMedLogo monochrome className="header-logo" />
    <HeaderTitle title={title} />
  </div>
);

export const NavyHeader = ({ title }: Props) => (
  <div className="navy-header">
    <div className="navy-orb navy-orb-1" />
    <div className="navy-orb navy-orb-2" />
    <div className="navy-orb navy-orb-3" />
    <div className="navy-orb navy-orb-4" />
    <OccuMedLogo monochrome className="header-logo" />
    <HeaderTitle title={title} />
  </div>
);
