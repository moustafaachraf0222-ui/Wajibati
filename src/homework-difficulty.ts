import type { HomeworkDifficulty } from './types';

export const homeworkDifficulties: HomeworkDifficulty[] = ['easy', 'medium', 'hard'];

export function homeworkDifficultyLabelKey(difficulty: HomeworkDifficulty) {
  if (difficulty === 'easy') {
    return 'easyHomework';
  }

  if (difficulty === 'medium') {
    return 'mediumHomework';
  }

  return 'hardHomework';
}
