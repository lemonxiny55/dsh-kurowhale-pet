import { appendFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

// Host-only probe: does not read credentials, model settings or character art.
export const name = 'dsh-kurowhale-pet';
export const inject = [];

export function apply(ctx) {
  const directory = join(process.env.DSH_HOME || join(homedir(), '.dsh'), 'kurowhale-pet');
  const record = (event) => {
    mkdirSync(directory, { recursive: true });
    appendFileSync(join(directory, 'lifecycle.jsonl'), JSON.stringify({
      time: new Date().toISOString(), event, version: '0.0.1-dev.0', pid: process.pid,
    }) + '\n');
  };
  // Cordis owns cleanup, including disable/uninstall and application shutdown.
  ctx.effect(() => {
    record('started');
    console.info('[dsh-kurowhale-pet] backend-only development smoke plugin started');
    return () => {
      record('stopped');
      console.info('[dsh-kurowhale-pet] backend-only development smoke plugin stopped');
    };
  });
}
