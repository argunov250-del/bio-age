// Clinical BioAge по записи анализов: результат PhenoAge вместе со всем, что нужно
// сохранить (версия алгоритма, дата расчёта, входные значения, единицы, источник).
import { LABS, PHENO_REQUIRED } from './labs';
import { phenoAge, PHENOAGE_VERSION } from './phenoage';
import { ageAt } from './metrics';

export function calcEntry(entry, profile) {
  const age = ageAt(profile.birth, new Date(entry.date + 'T12:00:00'));
  const r = phenoAge(entry.values, age);
  return {
    algorithm: PHENOAGE_VERSION,
    calculatedAt: new Date().toISOString(),
    ageAtTest: age,
    inputs: Object.fromEntries(PHENO_REQUIRED.filter((k) => entry.values[k]).map((k) => [k, { value: entry.values[k].base, unit: LABS[k].base, source: 'lab_test' }])),
    ...r,
  };
}

