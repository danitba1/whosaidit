import { customAlphabet } from "nanoid";
import { GAME_CODE_LENGTH } from "@/lib/constants";

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const generate = customAlphabet(alphabet, GAME_CODE_LENGTH);

export function createGameCode() {
  return generate();
}
