// Browser only. The employee directory lives in this browser's IndexedDB and is never sent anywhere.
// shortcut: one directory per device; real deployments integrate the HR system.
import { z } from 'zod';
import { employmentRecordSchema } from '../credential/types';
import type { EmploymentRecord } from '../credential/types';

export interface DirectoryEntry {
  employeeRef: string;
  record: EmploymentRecord;
}

export const employeeRefSchema = z.string().trim().min(1).max(40);

export function parseEntry(entry: DirectoryEntry): DirectoryEntry {
  return {
    employeeRef: employeeRefSchema.parse(entry.employeeRef),
    record: employmentRecordSchema.parse(entry.record),
  };
}

// Personas ficticias de un empleador ficticio.
export const DEMO_DIRECTORY: DirectoryEntry[] = [
  {
    employeeRef: 'E-1042',
    record: {
      givenName: 'María Fernanda',
      familyName: 'Rojas',
      nationalId: 'V-24.567.890',
      jobTitle: 'Analista de Logística',
      department: 'Logística',
      employmentType: 'FULL_TIME',
      startDate: '2021-03-01',
      workCountry: 'VE',
      salaryMonthlyUsd: 450,
    },
  },
  {
    employeeRef: 'E-1107',
    record: {
      givenName: 'Andrés',
      familyName: 'Pérez Linares',
      nationalId: 'V-19.340.221',
      jobTitle: 'Supervisor de Almacén',
      department: 'Operaciones',
      employmentType: 'FULL_TIME',
      startDate: '2018-07-16',
      endDate: '2023-05-31',
      workCountry: 'VE',
      salaryMonthlyUsd: 380,
    },
  },
  {
    employeeRef: 'E-1215',
    record: {
      givenName: 'Valentina',
      familyName: 'Camacho',
      nationalId: 'V-27.118.904',
      jobTitle: 'Asistente Contable',
      department: 'Finanzas',
      employmentType: 'PART_TIME',
      startDate: '2023-09-04',
      workCountry: 'VE',
      salaryMonthlyUsd: 220,
    },
  },
  {
    employeeRef: 'E-0988',
    record: {
      givenName: 'Luis Eduardo',
      familyName: 'Marcano',
      nationalId: 'V-16.802.553',
      jobTitle: 'Chofer de Reparto',
      employmentType: 'CONTRACT',
      startDate: '2019-02-11',
      endDate: '2022-12-15',
      workCountry: 'VE',
    },
  },
];

const DB_NAME = 'constancia-directory';
const STORE = 'employees';

const requestResult = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const open = indexedDB.open(DB_NAME, 1);
  open.onupgradeneeded = () => open.result.createObjectStore(STORE, { keyPath: 'employeeRef' });
  const db = await requestResult(open);
  try {
    return await requestResult(run(db.transaction(STORE, mode).objectStore(STORE)));
  } finally {
    db.close();
  }
}

export async function saveEntry(entry: DirectoryEntry): Promise<void> {
  await withStore('readwrite', (store) => store.put(parseEntry(entry)));
}

export async function listDirectory(): Promise<DirectoryEntry[]> {
  const all = await withStore<DirectoryEntry[]>('readonly', (store) => store.getAll());
  return all.sort((a, b) => a.employeeRef.localeCompare(b.employeeRef));
}

export async function findEntry(employeeRef: string): Promise<DirectoryEntry | null> {
  return (await withStore<DirectoryEntry | undefined>('readonly', (store) => store.get(employeeRef))) ?? null;
}

export async function removeEntry(employeeRef: string): Promise<void> {
  await withStore('readwrite', (store) => store.delete(employeeRef));
}

export async function loadDemoDirectory(): Promise<void> {
  for (const entry of DEMO_DIRECTORY) await saveEntry(entry);
}
