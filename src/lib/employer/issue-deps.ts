// Browser wiring for the issuing orchestration: the real signer, ledger client and PDF builder.
import { generateHolderKey, type Es256Signer } from '../credential/keys';
import { issueCredential } from '../credential/sdjwt';
import type { Address } from '../credential/types';
import { credentialPdf } from '../document/documents';
import { clientEnv } from '../env';
import { createAccountClient } from '../ledger/account-client';
import { appendIssued } from './issued-log';
import type { IssueDeps } from './issue';

export function browserIssueDeps(args: {
  account: Address;
  signer: Es256Signer;
  issuerName: string;
}): IssueDeps {
  const { account, signer, issuerName } = args;
  const { NEXT_PUBLIC_APP_URL: appUrl, NEXT_PUBLIC_LEDGER_CHAIN_ID: chainId } = clientEnv();
  return {
    newHolderKey: generateHolderKey,
    sign: (record, holderJwk) =>
      issueCredential({
        record,
        issuer: { did: `did:constancia:${chainId}:${account}`, keyId: signer.keyId },
        signer,
        holderJwk: { kty: 'EC', crv: 'P-256', x: holderJwk.x, y: holderJwk.y },
        appUrl,
      }),
    anchor: async (hash) => (await createAccountClient({ signer, account })).anchor(hash),
    packageCredential: (credential, holderKey) =>
      credentialPdf({ credential, holderKey, issuerName, verifyUrl: `${appUrl.replace(/\/$/, '')}/verify` }),
    record: appendIssued,
  };
}
