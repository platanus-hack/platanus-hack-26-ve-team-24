import { CheckList, CheckRow } from '@/components/ui/check-list';
import { Disclosure } from '@/components/ui/disclosure';
import type { TxResult } from '@/lib/ledger/account-client';
import { formatBlock } from '@/lib/ledger/format';

/** Qué hizo una escritura en el registro; la parte técnica queda dentro de "Detalles técnicos". */
export function LedgerWriteReceipt({ result }: { result: TxResult }) {
  return (
    <div className="flex flex-col gap-4">
      <CheckList>
        <CheckRow index={1} label="Firmado" status="DONE" measured="ES256 · este dispositivo" />
        <CheckRow
          index={2}
          label="Escrito en el registro"
          status="DONE"
          measured={`${formatBlock(result.blockNumber)} · ${result.elapsedMs} ms`}
        />
      </CheckList>
      <Disclosure summary="Detalles técnicos">
        <dl className="flex flex-col gap-3 text-small">
          <div>
            <dt className="font-bold">Transacción</dt>
            <dd className="break-all font-mono">{result.txHash}</dd>
          </div>
          <div>
            <dt className="font-bold">Costo para ti</dt>
            <dd className="font-mono">{result.feeWei} wei · lo paga el consorcio</dd>
          </div>
        </dl>
      </Disclosure>
    </div>
  );
}
