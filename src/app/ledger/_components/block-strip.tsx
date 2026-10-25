import type { NetworkState } from '@/lib/ledger/types';
import { formatBlockNumber } from '../_lib/format';

// Los últimos 16 bloques como celdas fijas; el más reciente queda relleno en tinta.
export function BlockStrip({ state }: { state: NetworkState }) {
  const first = state.blocks.at(0);
  const last = state.blocks.at(-1);
  return (
    <figure className="flex h-full flex-col gap-3">
      <ol aria-label="Últimos bloques" className="flex min-h-28 flex-1 items-stretch gap-1">
        {state.blocks.map((block) => (
          <li
            key={block.number}
            title={`Bloque ${formatBlockNumber(block.number)}`}
            className={`flex-1 border-2 border-ink ${block.number === last?.number ? 'bg-ink' : 'bg-paper'}`}
          >
            <span className="sr-only">
              Bloque {formatBlockNumber(block.number)}, {block.txCount}{' '}
              {block.txCount === 1 ? 'operación' : 'operaciones'}
            </span>
          </li>
        ))}
      </ol>
      {first && last ? (
        <div aria-hidden="true" className="flex justify-between text-small">
          <code>{formatBlockNumber(first.number)}</code>
          <code className="font-bold">{formatBlockNumber(last.number)}</code>
        </div>
      ) : null}
      <figcaption className="text-small text-ink-muted">
        Un bloque nuevo cada {state.blockTimeSec} segundos, aproximadamente. El más reciente va en
        negro.
      </figcaption>
    </figure>
  );
}
