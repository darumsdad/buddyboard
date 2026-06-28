import { PairRow } from "./PairRow";

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
};

export function PairList({ pairs, sessionId, poolId }: PairListProps) {
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
        <PairRow key={p.id} pair={p} sessionId={sessionId} poolId={poolId} />
      ))}
    </div>
  );
}
