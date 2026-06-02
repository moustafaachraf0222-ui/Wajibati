import type { SecondaryStream, Stage, Subject } from './types';

export const primarySubjects: Subject[] = [
  'arabic',
  'tamazight',
  'french',
  'english',
  'islamic_education',
  'civic_education',
  'math',
  'scientific_technology',
  'history',
  'art_education',
  'music_education',
  'physical_education'
];

export const primaryLowerYearExcludedSubjects: Subject[] = ['french', 'english'];

export const middleSubjects: Subject[] = [
  'arabic',
  'tamazight',
  'french',
  'english',
  'islamic_education',
  'civic_education',
  'history',
  'math',
  'life_science',
  'physical_science_technology',
  'computer_science',
  'art_education',
  'music_education',
  'physical_education'
];

export const secondarySubjects: Subject[] = [
  'arabic_literature',
  'english',
  'french',
  'math',
  'history',
  'islamic_science',
  'philosophy',
  'computer_science',
  'physical_education',
  'tamazight',
  'life_science',
  'physical_science_technology',
  'physical_sciences',
  'technology',
  'civil_engineering_subject',
  'electrical_engineering_subject',
  'mechanical_engineering_subject',
  'process_engineering_subject',
  'spanish',
  'german',
  'italian'
];

export const stages: Stage[] = ['primary', 'middle', 'secondary'];
export const defaultClassGroups = ['1', '2', '3', '4'];

export const secondaryStreams: SecondaryStream[] = [
  'experimental_science',
  'mathematics',
  'civil_engineering',
  'electrical_engineering',
  'mechanical_engineering',
  'process_engineering',
  'management_economics',
  'literature_philosophy',
  'foreign_languages'
];

export const firstYearSecondaryStreams: SecondaryStream[] = ['experimental_science', 'literature_philosophy'];
export const scientificSecondaryStreams: SecondaryStream[] = ['experimental_science', 'mathematics'];
export const technicalMathStreams: SecondaryStream[] = [
  'civil_engineering',
  'electrical_engineering',
  'mechanical_engineering',
  'process_engineering'
];

export const secondarySubjectStreams: Partial<Record<Subject, SecondaryStream[]>> = {
  life_science: scientificSecondaryStreams,
  physical_science_technology: [...scientificSecondaryStreams, ...technicalMathStreams],
  physical_sciences: [...scientificSecondaryStreams, ...technicalMathStreams],
  technology: [...scientificSecondaryStreams, ...technicalMathStreams],
  civil_engineering_subject: ['civil_engineering'],
  electrical_engineering_subject: ['electrical_engineering'],
  mechanical_engineering_subject: ['mechanical_engineering'],
  process_engineering_subject: ['process_engineering'],
  spanish: ['foreign_languages'],
  german: ['foreign_languages'],
  italian: ['foreign_languages']
};

export const subjectOrder: Subject[] = [
  ...primarySubjects,
  ...middleSubjects.filter((subject) => !primarySubjects.includes(subject)),
  ...secondarySubjects.filter((subject) => !primarySubjects.includes(subject) && !middleSubjects.includes(subject))
];
