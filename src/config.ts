import "@std/dotenv/load";
import { parseArgs } from "@std/cli/parse-args";

const args = parseArgs(Deno.args);

/**
 * A type representing a validator function for a configuration value.
 * @template T The type of the value to validate.
 */
type ConfigValidator<T> = (value: T) => void;

/**
 * A type representing a parser function for a configuration value.
 * @template T The intended type of the parsed value.
 */
type ConfigParser<T> = (value: string) => T;

/**
 * Cretes a validator function to check if a number is within a specific range.
 * @param {number} min - The minimum allowable value (inclusive).
 * @param {number} max - The maximum allowable value (inclusive).
 * @returns {ConfigValidator<number>} A function that validates if a number is
 * within a range.
 * @throws {RangeError} If the value is outside the specified range.
 */
const inRange = (min: number, max: number): ConfigValidator<number> => {
  return (value: number): void => {
    if (value < min || value > max) {
      throw new RangeError(`Value ${value} is not in range [${min}, ${max}]`);
    }
  };
};

/**
 * Converts the name of an option to uppercase for lookup within the environment
 * variables.
 * @param {string} name - The name of the option.
 * @return {string} The name converted to uppercase.
 */
const getEnvCase = (name: string) => name.toUpperCase();

/**
 * Retrieves and parses a configuration option value. This will check both
 * the command line arguments and the environment variables. Command line
 * arguments are take precedent over environment variables.
 * @template T The type of the parsed value.
 * @param {string} name The name of the configuration option. This will be
 * converted to uppercase when checking for the environment variable.
 * @param {ConfigParser<T>} parser A function to parse the raw string into a
 * value of the given template.
 * @param {ConfigValidator<T>[]} validators An array of validator functions to
 * test against the parsed value.
 * @param {boolean} [required=true] Whether or not the option is required.
 * @returns {T | undefined} The parsed and validated value of the configuration
 * option.
 * @throws {ReferenceError} If the option is required but not provided.
 * @throws {Error} If validation fails when testing the parsed value.
 */
function getOption<T>(
  name: string,
  parser: (value: string) => T,
  validators?: ConfigValidator<T>[],
  required = true,
): T | undefined {
  const rawValue = args[name] ?? Deno.env.get(getEnvCase(name));

  if (rawValue === undefined) {
    if (required) {
      throw new ReferenceError(`Required option ${name} is unset`);
    } else {
      return undefined;
    }
  }

  const parsedValue = parser(rawValue);

  if (validators !== undefined) {
    for (const validator of validators) {
      try {
        validator(parsedValue);
      } catch (err) {
        if (err instanceof Error) {
          err.message = `Option ${name} is invalid: ${err.message}`;
        }
        throw err;
      }
    }
  }

  return parsedValue;
}

/**
 * Reads and decodes a UTF-8 encoded file.
 * @param {string} filepath - The path to the file to read.
 * @returns {Promise<string>} The file's contents as a string.
 * @throws {Deno.errors.NotFound} If the file does not exist.
 * @throws {Deno.errors.PermissionDenied} If the program lacks permissions to
 * read the file.
 */
async function readUtf8File(filepath: string) {
  return new TextDecoder("UTF-8").decode(await Deno.readFile(filepath));
}

/**
 * Configuration for the server parsed from command line arguments and
 * environment variables.
 */
interface Config {
  /**
   * The Knockout API key.
   */
  apiKey: string;

  /**
   * HTTPS certificate and key.
   */
  https: {
    /**
     * The HTTPS key file contents.
     */
    key: string;

    /**
     * The HTTPS certificate file contents.
     */
    cert: string;
  };

  /**
   * The main port to use for the HTTPS server.
   */
  port: number;
}

const config: Config = {
  apiKey: getOption("knockout_api_key", (value) => value),
  https: {
    key: await getOption("https_key_filepath", readUtf8File),
    cert: await getOption("https_cert_filepath", readUtf8File),
  },
  port: getOption("port", parseInt, [inRange(1, 65535)]),
};

export { config };
