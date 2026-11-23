import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import type { SimulatorConfig } from "./config.js";

export type ScenarioName =
  | "allowed"
  | "denied"
  | "disabled-person"
  | "timeout"
  | "duplicate"
  | "network-error";

export type SimulatorInput = {
  scenario: ScenarioName;
  uid: string;
  requestId?: string;
};

export async function resolveInput(
  config: SimulatorConfig,
  args = process.argv.slice(2),
): Promise<SimulatorInput> {
  const values = parseArguments(args);
  if (values.interactive || (!values.scenario && !values.uid && stdin.isTTY)) {
    return interactiveInput(config);
  }
  const scenario = parseScenario(values.scenario ?? "allowed");
  return {
    scenario,
    uid: values.uid ?? fixtureFor(config, scenario),
    requestId: values.requestId,
  };
}

function parseArguments(args: string[]) {
  const values: {
    scenario?: string;
    uid?: string;
    requestId?: string;
    interactive?: boolean;
  } = {};
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--") continue;
    if (argument === "--interactive") values.interactive = true;
    else if (argument === "--scenario")
      values.scenario = requireValue(args, ++index, argument);
    else if (argument === "--uid")
      values.uid = requireValue(args, ++index, argument);
    else if (argument === "--request-id")
      values.requestId = requireValue(args, ++index, argument);
    else throw new Error(`Unknown simulator argument: ${argument}`);
  }
  return values;
}

async function interactiveInput(
  config: SimulatorConfig,
): Promise<SimulatorInput> {
  const terminal = createInterface({ input: stdin, output: stdout });
  try {
    const selection = await terminal.question(
      "Chọn RFID fixture: 1=demo, 2=unknown, 3=disabled-person, 4=custom: ",
    );
    if (selection.trim() === "4") {
      return {
        scenario: "allowed",
        uid: (await terminal.question("Nhập RFID UID: ")).trim(),
      };
    }
    const scenario =
      selection.trim() === "2"
        ? "denied"
        : selection.trim() === "3"
          ? "disabled-person"
          : "allowed";
    return { scenario, uid: fixtureFor(config, scenario) };
  } finally {
    terminal.close();
  }
}

function fixtureFor(config: SimulatorConfig, scenario: ScenarioName): string {
  if (scenario === "denied") return config.fixtureUids.denied;
  if (scenario === "disabled-person") return config.fixtureUids.disabledPerson;
  return config.fixtureUids.allowed;
}

function parseScenario(value: string): ScenarioName {
  const scenarios: ScenarioName[] = [
    "allowed",
    "denied",
    "disabled-person",
    "timeout",
    "duplicate",
    "network-error",
  ];
  if (!scenarios.includes(value as ScenarioName)) {
    throw new Error(`Unknown simulator scenario: ${value}`);
  }
  return value as ScenarioName;
}

function requireValue(args: string[], index: number, option: string): string {
  const value = args[index];
  if (!value) throw new Error(`${option} requires a value`);
  return value;
}

export function maskUid(uid: string): string {
  const canonical = uid.replace(/[\s:-]/g, "").toUpperCase();
  return canonical.length <= 4 ? "****" : `…${canonical.slice(-4)}`;
}
