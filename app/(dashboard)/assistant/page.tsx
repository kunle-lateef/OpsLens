import { AssistantChat } from '@/components/assistant/AssistantChat';

// ?seed=<question> lets another page open the Assistant with a contextual
// question pre-filled (see the "Ask AI about this" links on Overview and
// Issue Detail) — see AssistantChat's own doc comment for why this only
// pre-fills rather than auto-sending.
export default async function AssistantPage({
  searchParams,
}: {
  searchParams: Promise<{ seed?: string }>;
}) {
  const { seed } = await searchParams;

  return (
    <div className="flex h-[calc(100vh-8rem)] max-w-2xl flex-col gap-(--space-4)">
      <h1 className="[font:var(--font-h1)]">AI Assistant</h1>
      <AssistantChat initialQuestion={seed} />
    </div>
  );
}
