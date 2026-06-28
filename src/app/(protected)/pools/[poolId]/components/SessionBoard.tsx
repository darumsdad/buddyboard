import { SessionHeader } from "./SessionHeader";
import { AddPairForm } from "./AddPairForm";
import { PairList } from "./PairList";

type PairMember = {
  camperId: string;
  firstName: string;
  lastName: string;
  bunk: string;
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
};

export function SessionBoard({
  poolName,
  swimmerCount,
  pairCount,
  sessionId,
  poolId,
  pairs,
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
        <AddPairForm sessionId={sessionId} poolId={poolId} />
      </div>
      <PairList pairs={pairs} sessionId={sessionId} poolId={poolId} />
    </div>
  );
}
