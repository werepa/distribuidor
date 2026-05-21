/**
 * Mata processos de desenvolvimento antes de subir o servidor de produção.
 * Cross-platform: Windows (wmic) e Unix (pkill).
 */
import { execSync } from 'node:child_process';

const isWin = process.platform === 'win32';
const kill = cmd => { try { execSync(cmd, { stdio: 'ignore' }); } catch {} };

if (isWin) {
  kill('wmic process where "commandline like \'%tsx%watch%src/server%\'" delete');
  kill('wmic process where "commandline like \'%concurrently%npm:dev%\'" delete');
  kill('wmic process where "commandline like \'%vite%\'" delete');
} else {
  kill("pkill -f 'tsx watch src/server'");
  kill("pkill -f 'concurrently.*npm:dev'");
  kill("pkill -f vite");
}
