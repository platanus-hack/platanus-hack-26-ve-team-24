'use client';

import { Field } from '@/components/ui/field';
import {
  EMPLOYMENT_TYPE_LABELS,
  FIELD_LABELS,
  type RecordErrors,
  type RecordFields,
} from '@/lib/employer/record-fields';

type EndDateMode = 'optional' | 'hidden' | 'required';

const EMPLOYMENT_TYPES = Object.entries(EMPLOYMENT_TYPE_LABELS) as [RecordFields['employmentType'], string][];

const END_DATE_LABEL: Record<Exclude<EndDateMode, 'hidden'>, string> = {
  required: FIELD_LABELS.endDate,
  optional: `${FIELD_LABELS.endDate} (vacía si sigue empleado)`,
};

/** Los campos de empleo, compartidos por el directorio y el formulario de emisión. */
export function RecordForm({
  fields,
  errors,
  onChange,
  endDate = 'optional',
  disabled,
}: {
  fields: RecordFields;
  errors: RecordErrors;
  onChange: (next: RecordFields) => void;
  endDate?: EndDateMode;
  disabled?: boolean;
}) {
  const text = (
    name: keyof RecordFields,
    extra?: { label?: string; type?: string; hint?: string; autoComplete?: string },
  ) => (
    <Field label={extra?.label ?? FIELD_LABELS[name]} error={errors[name]} hint={extra?.hint}>
      <input
        name={name}
        type={extra?.type ?? 'text'}
        autoComplete={extra?.autoComplete ?? 'off'}
        disabled={disabled}
        value={fields[name]}
        aria-invalid={errors[name] ? true : undefined}
        onChange={(event) => {
          onChange({ ...fields, [name]: event.target.value });
        }}
      />
    </Field>
  );

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {text('givenName')}
      {text('familyName')}
      {text('nationalId')}
      {text('jobTitle')}
      {text('department')}
      <Field label={FIELD_LABELS.employmentType} error={errors.employmentType}>
        <select
          name="employmentType"
          disabled={disabled}
          value={fields.employmentType}
          onChange={(event) => {
            onChange({ ...fields, employmentType: event.target.value as RecordFields['employmentType'] });
          }}
        >
          {EMPLOYMENT_TYPES.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>
      {text('startDate', { type: 'date' })}
      {endDate !== 'hidden' && text('endDate', { type: 'date', label: END_DATE_LABEL[endDate] })}
      {text('workCountry', { hint: 'Dos letras, por ejemplo VE' })}
      {text('salaryMonthlyUsd', { type: 'number' })}
    </div>
  );
}
