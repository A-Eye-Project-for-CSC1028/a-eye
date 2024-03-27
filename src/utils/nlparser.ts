import { NLPosition } from "../models/types";
import { Constants } from "./constants";

/**
 * 🚧 Attempting to add natural language syntax to allow the user to place supplementary objects elsewhere in a scene.
 */
export class NLParser {
  /**
   * Extracts object names & positional keywords from a natural language prompt.
   * @param command The natural language prompt/command to be parsed.
   * @returns `NLPosition`
   */
  public static parse = (command: string): NLPosition => {
    let objectName: string | undefined;
    let objectPath: string | undefined;
    const positionalKeywords: string[] = [];

    const parts: string[] = command.toLowerCase().split(" ");

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];

      // Find .obj in registry...
      const matchedKey: string | undefined = Object.keys(
        Constants.objectRegistry
      ).find((obj) => obj.startsWith(part));

      // ...and then return its name and path.
      if (matchedKey) {
        objectName = Constants.objectRegistry[matchedKey].name;
        objectPath = Constants.objectRegistry[matchedKey].path;
        continue; // Finished parsing part - continue to next one.
      }

      // Add position to list if valid.
      Constants.positionRegistry.includes(part)
        ? positionalKeywords.push(part)
        : null;
    }

    return {
      objectName,
      objectPath,
      positionalKeywords,
    };
  };
}
