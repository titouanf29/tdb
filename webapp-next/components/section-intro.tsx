import { ReactNode } from 'react';

type SectionIntroProps = {
  eyebrow?: string;
  title: string;
  text?: string;
  children?: ReactNode;
};

export function SectionIntro({ eyebrow, title, text, children }: SectionIntroProps) {
  return (
    <div className="section-intro-block">
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h1>{title}</h1>
      {text ? <p className="section-text">{text}</p> : null}
      {children}
    </div>
  );
}