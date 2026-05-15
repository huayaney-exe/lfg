// Registry of supported AI coding agents.
// `cmd` is what we spawn in each pane. `detect` tells the wizard if it's installed.

import { hasCommand } from './platform.mjs';

export const RUNTIMES = [
  {
    id: 'claude',
    label: 'Claude Code',
    cmd: 'claude',
    install: 'npm i -g @anthropic-ai/claude-code',
    docs: 'https://docs.anthropic.com/en/docs/claude-code',
    description: 'Anthropic\'s official CLI agent',
  },
  {
    id: 'codex',
    label: 'Codex CLI',
    cmd: 'codex',
    install: 'npm i -g @openai/codex',
    docs: 'https://github.com/openai/codex',
    description: 'OpenAI\'s coding agent CLI',
  },
  {
    id: 'cursor-agent',
    label: 'Cursor Agent',
    cmd: 'cursor-agent',
    install: 'curl https://cursor.com/install -fsSL | bash',
    docs: 'https://docs.cursor.com/en/cli/overview',
    description: 'Cursor\'s headless agent CLI',
  },
  {
    id: 'aider',
    label: 'Aider',
    cmd: 'aider',
    install: 'pip install aider-install && aider-install',
    docs: 'https://aider.chat',
    description: 'AI pair programmer (model-agnostic)',
  },
  {
    id: 'gemini',
    label: 'Gemini CLI',
    cmd: 'gemini',
    install: 'npm i -g @google/gemini-cli',
    docs: 'https://github.com/google-gemini/gemini-cli',
    description: 'Google\'s Gemini CLI',
  },
  {
    id: 'copilot',
    label: 'GitHub Copilot CLI',
    cmd: 'gh copilot',
    install: 'gh extension install github/gh-copilot',
    docs: 'https://docs.github.com/en/copilot/github-copilot-in-the-cli',
    description: 'Copilot in the terminal (via gh CLI)',
  },
  {
    id: 'opencode',
    label: 'OpenCode',
    cmd: 'opencode',
    install: 'npm i -g opencode-ai',
    docs: 'https://github.com/sst/opencode',
    description: 'Open-source agent CLI',
  },
  {
    id: 'shell',
    label: 'Plain shell',
    cmd: process.env.SHELL || (process.platform === 'win32' ? 'pwsh' : 'zsh'),
    install: null,
    docs: null,
    description: 'No agent — just a shell in each pane',
  },
];

export function findRuntime(idOrCmd) {
  return RUNTIMES.find(r => r.id === idOrCmd || r.cmd === idOrCmd);
}

export function detectInstalledRuntimes() {
  return RUNTIMES.map(r => ({
    ...r,
    installed: r.id === 'shell' ? true : hasCommand(r.cmd.split(' ')[0]),
  }));
}
