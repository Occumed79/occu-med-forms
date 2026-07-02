import logo from "@/assets/occu-med-logo.png";

interface Props {
  title: string;
}

const HeaderTitle = ({ title }: Props) => {
  const isContactInformation = title.includes("Contact Information");

  return (
    <div className={`header-title ${isContactInformation ? "contact-sheet-header-title" : ""}`}>
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
    <img src={logo} alt="Occu-Med" className="header-logo" />
    <HeaderTitle title={title} />
  </div>
);

export const NavyHeader = ({ title }: Props) => (
  <div className="navy-header">
    <div className="navy-orb navy-orb-1" />
    <div className="navy-orb navy-orb-2" />
    <div className="navy-orb navy-orb-3" />
    <div className="navy-orb navy-orb-4" />
    <img src={logo} alt="Occu-Med" className="header-logo" />
    <HeaderTitle title={title} />
  </div>
);
