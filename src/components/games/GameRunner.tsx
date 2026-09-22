import { useState } from "react";
import type { GameDef } from "@/lib/games.catalog";
import { GameMcq } from "@/components/games/GameMcq";
import { MemoryMatchGame } from "@/components/games/MemoryMatchGame";
import { WordBuilderGame } from "@/components/games/WordBuilderGame";
import { GameSetup } from "@/components/games/GameSetup";
import { GamePanelHeader, type GameScope } from "@/components/games/GameShared";

/** Setup → play, all inside the Games page. No navigation happens here. */
export function GameRunner({ def, difficulty, onBack }: { def: GameDef; difficulty: GameScope["difficulty"]; onBack: () => void }) {
  const [scope, setScope] = useState<GameScope | null>(null);
  const [round, setRound] = useState(0);

  if (!scope)
    return (
      <div className="space-y-3">
        <GamePanelHeader def={def} onBack={onBack} />
        <GameSetup def={def} difficulty={difficulty} onStart={setScope} />
      </div>
    );

  const key = `${def.key}-${round}`;
  const props = { def, scope, onBack, onRestart: () => setRound((r) => r + 1) };
  if (def.kind === "pairs") return <MemoryMatchGame key={key} {...props} />;
  if (def.kind === "words") return <WordBuilderGame key={key} {...props} />;
  return <GameMcq key={key} {...props} />;
}
