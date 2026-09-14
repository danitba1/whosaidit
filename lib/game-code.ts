import { customAlphabet } from "nanoid";
import { GAME_CODE_LENGTH } from "@/lib/constants";

const alphabet = "0123456789";
const generate = customAlphabet(alphabet, GAME_CODE_LENGTH);

export function createGameCode() {
  return generate();
}
