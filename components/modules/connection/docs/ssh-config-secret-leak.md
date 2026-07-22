# Known issue: `buildSSHConfig` leaks the unused SSH credential

**Severity:** High (security surface — not a functional break)
**Status:** Open — to be handled later
**Area:** Connection form → SSH tunnel config
**File:** `components/modules/connection/hooks/useConnectionForm.ts` (`buildSSHConfig`)

---

## Summary

`buildSSHConfig` always sends **both** `password` and `privateKey`, regardless
of the selected auth method (`sshUseKey`). The credential that does not match
the chosen method is unnecessary, yet it is transmitted to the backend, saved
into the connection record, and persisted to the keychain.

The connection still works (the server picks the correct credential — see
[Related](#related)), so this is a **secret-hygiene / data-at-rest** problem,
not a connectivity bug.

---

## Current code

`components/modules/connection/hooks/useConnectionForm.ts`

```ts
const buildSSHConfig = () => {
  if (!formData.sshEnabled || !canUseNetworkOptions.value) {
    return undefined;
  }

  return {
    enabled: true,
    host: formData.sshHost,
    port: formData.sshPort,
    username: formData.sshUsername,
    authMethod: formData.sshUseKey
      ? ESSHAuthMethod.KEY
      : ESSHAuthMethod.PASSWORD,
    password: formData.sshPassword, // ← always sent
    privateKey: formData.sshPrivateKey, // ← always sent
    storeInKeychain: formData.sshStoreInKeychain,
    useSshKey: formData.sshUseKey,
  };
};
```

## Root cause

`password` and `privateKey` are read straight from `formData` with no gating on
`sshUseKey`. `formData` keeps whatever the user typed earlier, so a value from
the _other_ auth method lingers and gets included in the payload.

## Impact

- The unused secret is **transmitted** on every health-check / save request.
- It is **persisted** in the stored connection record (IndexedDB / SQLite) and,
  when `storeInKeychain` is on, in the OS **keychain**.
- It is carried along by **connection export / backup**.
- Net effect: a private key can be stored even when the user only intended to
  use a password (and vice versa) — a larger leak surface than expected.

Not affected: actual authentication. The server only uses the credential that
matches `authMethod`.

## Reproduction

1. Open the connection form → enable SSH tunnel.
2. Type an SSH **password**, then switch to **key** auth and paste a private key.
3. Test / save the connection.
4. Inspect the outgoing request body and the stored connection record: both
   `password` (stale) and `privateKey` are present.

## Proposed fix

Only send the credential for the selected method:

```ts
authMethod: formData.sshUseKey
  ? ESSHAuthMethod.KEY
  : ESSHAuthMethod.PASSWORD,
password: formData.sshUseKey ? '' : formData.sshPassword,
privateKey: formData.sshUseKey ? formData.sshPrivateKey : '',
```

Notes:

- Consider clearing the other field in `formData` when the user toggles
  `sshUseKey`, so the UI state itself never holds a stale secret.
- A future encrypted-key passphrase must be its **own** field, not reuse
  `password`.

## Suggested tests

- Unit (hook): `buildSSHConfig` with `sshUseKey = true` returns empty
  `password`; with `sshUseKey = false` returns empty `privateKey`.
- Regression: switching auth method then submitting does not carry the previous
  method's secret.

## Related

- Server already selects the correct credential per method:
  `server/utils/ssh-tunnel.ts` → `buildAuthConfig` (covered by
  `test/unit/server/utils/ssh-tunnel-auth.spec.ts`). That fix prevents the
  _connection_ from breaking; it does **not** address this client-side leak.
