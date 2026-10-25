import { employmentRecordSchema } from '../credential/types';
import type { EmploymentRecord } from '../credential/types';

/** The employment form as plain strings, the way inputs hold them. */
export interface RecordFields {
  givenName: string;
  familyName: string;
  nationalId: string;
  jobTitle: string;
  department: string;
  employmentType: EmploymentRecord['employmentType'];
  startDate: string;
  endDate: string;
  workCountry: string;
  salaryMonthlyUsd: string;
}

export type RecordErrors = Partial<Record<keyof RecordFields, string>>;

export const FIELD_LABELS: Record<keyof RecordFields, string> = {
  givenName: 'Nombres',
  familyName: 'Apellidos',
  nationalId: 'Cédula de identidad',
  jobTitle: 'Cargo',
  department: 'Departamento (opcional)',
  employmentType: 'Tipo de empleo',
  startDate: 'Fecha de ingreso',
  endDate: 'Fecha de egreso',
  workCountry: 'País de trabajo',
  salaryMonthlyUsd: 'Salario mensual en USD (opcional)',
};

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentRecord['employmentType'], string> = {
  FULL_TIME: 'Tiempo completo',
  PART_TIME: 'Medio tiempo',
  CONTRACT: 'Por contrato',
};

const FIELD_ERRORS: Record<keyof RecordFields, string> = {
  givenName: 'Escribe los nombres',
  familyName: 'Escribe los apellidos',
  nationalId: 'Usa entre 3 y 32 caracteres',
  jobTitle: 'Escribe el cargo, con 2 caracteres o más',
  department: 'Usa 80 caracteres o menos',
  employmentType: 'Elige un tipo de empleo',
  startDate: 'Usa una fecha válida',
  endDate: 'Usa una fecha válida',
  workCountry: 'Usa dos letras, por ejemplo VE',
  salaryMonthlyUsd: 'Usa un número entero entre 0 y 1.000.000',
};

export const emptyFields = (): RecordFields => ({
  givenName: '',
  familyName: '',
  nationalId: '',
  jobTitle: '',
  department: '',
  employmentType: 'FULL_TIME',
  startDate: '',
  endDate: '',
  workCountry: 'VE',
  salaryMonthlyUsd: '',
});

export const fieldsFromRecord = (record: EmploymentRecord): RecordFields => ({
  ...record,
  department: record.department ?? '',
  endDate: record.endDate ?? '',
  salaryMonthlyUsd: record.salaryMonthlyUsd?.toString() ?? '',
});

const blankToUndefined = (value: string) => (value.trim() === '' ? undefined : value.trim());

export type ParsedRecord =
  | { ok: true; record: EmploymentRecord }
  | { ok: false; errors: RecordErrors };

export function recordFromFields(fields: RecordFields): ParsedRecord {
  const salary = blankToUndefined(fields.salaryMonthlyUsd);
  const parsed = employmentRecordSchema.safeParse({
    ...fields,
    givenName: fields.givenName.trim(),
    familyName: fields.familyName.trim(),
    nationalId: fields.nationalId.trim(),
    jobTitle: fields.jobTitle.trim(),
    department: blankToUndefined(fields.department),
    endDate: blankToUndefined(fields.endDate),
    workCountry: fields.workCountry.trim().toUpperCase(),
    salaryMonthlyUsd: salary === undefined ? undefined : Number(salary),
  });
  if (parsed.success) return { ok: true, record: parsed.data };
  const errors: RecordErrors = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path[0] as keyof RecordFields;
    // las reglas cruzadas de fechas llegan como 'custom': el mensaje sale de los valores, no del texto del esquema
    errors[key] ??= issue.code === 'custom' ? dateRuleError(key, fields) : FIELD_ERRORS[key];
  }
  return { ok: false, errors };
}

function dateRuleError(key: keyof RecordFields, fields: RecordFields): string {
  if (key === 'startDate') return 'La fecha de ingreso no puede estar en el futuro';
  return fields.endDate < fields.startDate
    ? 'La fecha de egreso no puede ser anterior a la de ingreso'
    : 'La fecha de egreso no puede estar en el futuro';
}
