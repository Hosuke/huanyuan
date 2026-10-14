export interface Lecture {
  episode: number;
  segments: string[];
  paragraphs: string[];
}

const lectureModules = import.meta.glob<{ default: Lecture }>(
  '../../data/tifo/lectures/*.json',
  { eager: true },
);

export const lectures: Lecture[] = Object.values(lectureModules)
  .map((module) => module.default)
  .sort((a, b) => a.episode - b.episode);

export function getLecture(n: number): Lecture | undefined {
  return lectures.find((lecture) => lecture.episode === n);
}

/** 賢首禪苑《修華嚴奧旨妄盡還源觀》講義影音。 */
export const lectureVideoIds: Record<number, string> = {
  1: 'v93jyh3TgIs',
  2: 'kzq0bYGpniU',
  3: 'Y-s4kuFhecQ',
  4: 'f2lQoJfFajs',
  5: 'oh63gsy_M5c',
  6: 'FYpmUG5ZT6A',
  7: 'DcF0-3yD7CA',
  8: 'j2ZfjSQie6I',
  9: 'OPRgyQBCi_Y',
  10: 't9ZseGkFB1w',
  11: 'JRI9bRIkJ9c',
  12: '_JnXeh1kaXo',
  13: 'rLtalyOBGqo',
  14: 'oK4e-B0QH3o',
  15: '9becwwdaJ4Y',
  16: 'RJcLPNJjoGI',
  17: 'AM3wi-LCo7k',
  18: 'l8s9Qvz_MjA',
  19: 'YUIoLX6XGeA',
  20: '9Ng-fskCOHA',
  21: 'Ijqieowiu_c',
  22: 'kwVpWWSvS24',
  23: 'L_QMCk5pPCs',
  24: 'GUYPJbbCLd0',
  25: 'y6qqxDomfHY',
  26: 'H1Ymj-fLGqc',
  27: 'MJrHEgInLw8',
  28: 'XdPaHXEl0Dg',
  29: 'huNQv_F7OM0',
  30: 'SbPl4DvmT7g',
  31: 'wqHftV65inM',
  32: '8ETrX47z2bw',
  33: 'ahVTclPX2G4',
  34: 'K2OrjDHQkeo',
  35: 'pUjslgpvagc',
  36: 'l1lgyTmfrkQ',
};
