import { Metadata } from 'next';
import { SectionIntro } from '@/components/section-intro';
import { EducationClient } from './EducationClient';

export const metadata: Metadata = {
  title: 'Education trading',
  description: 'Leçons interactives, graphiques et quiz pour maîtriser les bases du trading : bougies, indicateurs, gestion du risque et psychologie.',
};

export default function EducationPage() {
  return (
    <main className="container page-stack">
      <SectionIntro
        eyebrow="Education"
        title="Apprendre avant d'exécuter"
        text="6 leçons interactives avec graphiques, exercices et quiz. Prenez le temps de comprendre — les marchés seront toujours là."
      />
      <EducationClient />
    </main>
  );
}
