// v0.0.1-dev.0: no desktop window, no agent hooks, no assets or credentials.
// Purpose: verify that a tiny Cordis backend bundle can be activated by
// Desktop 0.2.1-rc.3 without importing legacy Web frontend services.
export const name = 'dsh-kurowhale-pet';

export function apply() {
  console.info('[dsh-kurowhale-pet] backend-only development smoke plugin started');
}
