import { PairRow } from "./PairRow";
import { PairSkeleton } from "./PairSkeleton";

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

type PairListProps = {
  pairs: Pair[];
  sessionId: string;
  poolId: string;
  onPairRemoved: () => void;
  isRefreshing: boolean;
};

export function PairList({ pairs, sessionId, poolId, onPairRemoved, isRefreshing }: PairListProps) {
  if (isRefreshing) {
    return <PairSkeleton />;
  }

  if (pairs.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-base font-semibold text-slate-900">No pairs checked in yet</p>
        <p className="text-base text-slate-500 mt-2">
          Use the form above to add the first buddy pair.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-200">
      {pairs.map((p) => (
        <PairRow key={p.id} pair={p} sessionId={sessionId} poolId={poolId} onRemoved={onPairRemoved} />
      ))}
    </div>
  );
}
