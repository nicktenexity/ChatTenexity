import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Database, FileSearch, MessageSquareText, ShieldCheck } from 'lucide-react';

type Readiness = {
  chatGPT?: {
    configured?: boolean;
    models?: string;
    defaultMode?: string;
  };
  access?: {
    registrationClosed?: boolean;
    emailConfigured?: boolean;
    passwordResetReady?: boolean;
  };
  teams?: {
    codeReady?: boolean;
    configured?: boolean;
  };
  sources?: {
    configuredCount?: number;
    catalog?: Array<{ id: string; status: string }>;
  };
};

const fallbackReadiness: Readiness = {
  chatGPT: {
    configured: true,
    models: 'gpt-5.4-mini',
    defaultMode: 'ChatGPT',
  },
  access: {
    registrationClosed: false,
    emailConfigured: false,
    passwordResetReady: false,
  },
  teams: {
    codeReady: true,
    configured: false,
  },
  sources: {
    configuredCount: 0,
    catalog: [],
  },
};

function statusLabel(ready: boolean | undefined, readyLabel: string, pendingLabel: string) {
  return ready ? readyLabel : pendingLabel;
}

export default function TenexityReadinessPanel() {
  const [readiness, setReadiness] = useState<Readiness>(fallbackReadiness);

  useEffect(() => {
    let mounted = true;

    fetch('/api/tenexity/readiness')
      .then((response) => (response.ok ? response.json() : fallbackReadiness))
      .then((data) => {
        if (mounted) {
          setReadiness(data);
        }
      })
      .catch(() => {
        if (mounted) {
          setReadiness(fallbackReadiness);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const tiles = useMemo(
    () => [
      {
        icon: CheckCircle2,
        title: 'ChatGPT',
        status: statusLabel(readiness.chatGPT?.configured, 'Live', 'Needs key'),
        detail: readiness.chatGPT?.models || 'gpt-5.4-mini',
      },
      {
        icon: FileSearch,
        title: 'Files',
        status: 'Ready',
        detail: 'Upload, summarize, and cite',
      },
      {
        icon: MessageSquareText,
        title: 'Teams',
        status: statusLabel(readiness.teams?.configured, 'Connected', 'Setup next'),
        detail: readiness.teams?.codeReady ? 'Bot endpoint built' : 'Bot endpoint pending',
      },
      {
        icon: Database,
        title: 'Sources',
        status:
          (readiness.sources?.configuredCount ?? 0) > 0
            ? `${readiness.sources?.configuredCount} connected`
            : 'Catalog ready',
        detail: 'Drive, SharePoint, Salesforce, SQL',
      },
      {
        icon: ShieldCheck,
        title: 'Access',
        status: statusLabel(
          readiness.access?.registrationClosed,
          'Invite-only',
          'Registration open',
        ),
        detail: readiness.access?.passwordResetReady ? 'Password reset ready' : 'Email setup next',
      },
    ],
    [readiness],
  );

  return (
    <div className="mt-8 grid w-full max-w-5xl grid-cols-1 gap-3 px-4 sm:grid-cols-2 lg:grid-cols-5">
      {tiles.map(({ icon: Icon, title, status, detail }) => (
        <div
          key={title}
          className="rounded-lg border border-border-light bg-surface-primary px-4 py-3 text-left shadow-sm dark:border-border-medium"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
            <Icon className="h-4 w-4 text-green-600 dark:text-green-400" aria-hidden="true" />
            <span>{title}</span>
          </div>
          <div className="mt-2 text-sm font-medium text-text-primary">{status}</div>
          <div className="mt-1 line-clamp-2 text-xs text-text-secondary">{detail}</div>
        </div>
      ))}
    </div>
  );
}
