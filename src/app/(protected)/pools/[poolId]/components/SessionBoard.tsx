import { SessionHeader } from "./SessionHeader";
import { AddPairForm } from "./AddPairForm";
import { PairList } from "./PairList";

type PairMember = {
  camperId: string;
  firstName: string;
  lastName: string;
  bunk: string;
  code: string;
};

type Pair = {
  id: string;
  members: PairMember[];
};

type SessionBoardProps = {
  poolName: string;
  swimmerCount: number;
  pairCount: number;
  sessionId: string;
  poolId: string;
  pairs: Pair[];
  /** Callback fired by AddPairForm (onSuccess) and PairList (onPairRemoved). Wired by LiveBoard in Plan 05-05. */
  onPairMutated?: () => void;
  /** When true, PairList renders PairSkeleton instead of pair rows. Wired by LiveBoard in Plan 05-05. */
  isRefreshing?: boolean;
};

export function SessionBoard({
  poolName,
  swimmerCount,
  pairCount,
  sessionId,
  poolId,
  pairs,
  onPairMutated = () => {},
  isRefreshing = false,
}: SessionBoardProps) {
  return (
    <div className="min-h-screen bg-white">
      <SessionHeader
        poolName={poolName}
        swimmerCount={swimmerCount}
        pairCount={pairCount}
        sessionId={sessionId}
        poolId={poolId}
      />
      <div className="p-4">
        <AddPairForm sessionId={sessionId} poolId={poolId} onSuccess={onPairMutated} />
      </div>
      <PairList
        pairs={pairs}
        sessionId={sessionId}
        poolId={poolId}
        onPairRemoved={onPairMutated}
        isRefreshing={isRefreshing}
      />
    </div>
  );
}
