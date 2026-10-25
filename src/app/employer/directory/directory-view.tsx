'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Panel } from '@/components/ui/panel';
import {
  employeeRefSchema,
  listDirectory,
  loadDemoDirectory,
  removeEntry,
  saveEntry,
  type DirectoryEntry,
} from '@/lib/employer/directory';
import {
  emptyFields,
  recordFromFields,
  type RecordErrors,
  type RecordFields,
} from '@/lib/employer/record-fields';
import { RecordForm } from '../_components/record-form';

function AddEmployee({ onSaved }: { onSaved: () => void }) {
  const [employeeRef, setEmployeeRef] = useState('');
  const [refError, setRefError] = useState<string | undefined>();
  const [fields, setFields] = useState<RecordFields>(emptyFields);
  const [errors, setErrors] = useState<RecordErrors>({});

  async function save() {
    const ref = employeeRefSchema.safeParse(employeeRef);
    const record = recordFromFields(fields);
    setRefError(ref.success ? undefined : 'Usa entre 1 y 40 caracteres');
    setErrors(record.ok ? {} : record.errors);
    if (!ref.success || !record.ok) return;
    await saveEntry({ employeeRef: ref.data, record: record.record });
    setEmployeeRef('');
    setFields(emptyFields());
    onSaved();
  }

  return (
    <Panel title="Agregar un empleado">
      <form
        className="flex flex-col gap-6"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <div className="max-w-sm">
          <Field
            label="Número de empleado"
            hint="El número que el empleado escribe al pedir su constancia"
            error={refError}
          >
            <input
              name="employeeRef"
              autoComplete="off"
              value={employeeRef}
              onChange={(event) => {
                setEmployeeRef(event.target.value);
              }}
            />
          </Field>
        </div>
        <RecordForm fields={fields} errors={errors} onChange={setFields} />
        <div>
          <Button type="submit">Agregar al directorio</Button>
        </div>
      </form>
    </Panel>
  );
}

export function DirectoryView() {
  const [entries, setEntries] = useState<DirectoryEntry[] | null>(null);

  async function refresh() {
    setEntries(await listDirectory().catch(() => []));
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <div className="flex flex-col gap-10">
      {entries === null ? (
        <p role="status">Abriendo el directorio…</p>
      ) : entries.length === 0 ? (
        <Panel title="Aún no hay empleados">
          <p className="mb-6 max-w-[65ch] text-body">
            Carga cuatro empleados ficticios para probar el flujo, o agrega los tuyos abajo.
          </p>
          <Button
            onClick={() => {
              void loadDemoDirectory().then(refresh);
            }}
          >
            Cargar el directorio de prueba
          </Button>
        </Panel>
      ) : (
        <ul className="border-b-2 border-ink">
          {entries.map(({ employeeRef, record }) => (
            <li
              key={employeeRef}
              className="flex flex-wrap items-center justify-between gap-4 border-t-2 border-ink py-4"
            >
              <div>
                <p className="text-title font-bold">
                  {record.givenName} {record.familyName}
                </p>
                <p className="text-body text-ink-muted">
                  <code>{employeeRef}</code> · {record.jobTitle} ·{' '}
                  {record.endDate ? `hasta ${record.endDate}` : 'empleo actual'}
                </p>
              </div>
              <Button
                variant="quiet"
                aria-label={`Quitar a ${record.givenName} ${record.familyName} del directorio`}
                onClick={() => {
                  void removeEntry(employeeRef).then(refresh);
                }}
              >
                Quitar
              </Button>
            </li>
          ))}
        </ul>
      )}
      <AddEmployee onSaved={() => void refresh()} />
    </div>
  );
}
