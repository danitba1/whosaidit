export class VoteValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VoteValidationError";
  }
}

export type VoteAttempt = {
  votingOpen: boolean;
  revealed: boolean;
  voterId: string;
  selectedId: string;
  authorId: string;
  allowSelfVote: boolean;
  existingVoteId?: string | null;
};

export function validateVote(attempt: VoteAttempt) {
  if (attempt.revealed) {
    throw new VoteValidationError("Voting is closed because the answer was revealed");
  }
  if (!attempt.votingOpen) {
    throw new VoteValidationError("Voting is not open");
  }
  if (!attempt.allowSelfVote && attempt.voterId === attempt.selectedId) {
    throw new VoteValidationError("You cannot vote for yourself");
  }
  return { isUpdate: Boolean(attempt.existingVoteId) };
}

export function isDuplicateVote(
  previous: { selectedId: string } | null,
  selectedId: string,
) {
  return previous?.selectedId === selectedId;
}
