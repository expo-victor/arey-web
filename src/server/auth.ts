import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import operatorFallback from "../data/operator.json";

type Operator = {
	username: string;
	password: string;
};

const operatorCandidates = [
	// project root when running via `astro dev`
	resolve(process.cwd(), "src/data/operator.json"),
	// project root when running the built server (`dist/server/entry.mjs`)
	resolve(process.cwd(), "data/operator.json"),
	// running from dist directory
	resolve(process.cwd(), "../src/data/operator.json"),
	resolve(process.cwd(), "../data/operator.json"),
];

async function readOperatorFromCandidate(): Promise<Operator | null> {
	for (const path of operatorCandidates) {
		if (existsSync(path)) {
			const buffer = await readFile(path, "utf-8");
			if (!buffer.trim()) {
				return null;
			}

			try {
				const data = JSON.parse(buffer) as Operator;
				if (data?.username && data?.password) {
					return data;
				}
			} catch {
				// If parsing fails, continue to the next candidate.
			}
		}
	}
	return null;
}

export async function getOperator(): Promise<Operator | null> {
	try {
		const operator = await readOperatorFromCandidate();
		if (operator) {
			return operator;
		}

		if (operatorFallback?.username && operatorFallback?.password) {
			return { ...operatorFallback };
		}

		return null;
	} catch (error) {
		console.error("Unable to read operator file:", error);
		return null;
	}
}

export function computeToken(operator: Operator): string {
	return Buffer.from(`${operator.username}:${operator.password}`).toString("base64");
}

export async function authorize(request: Request): Promise<boolean> {
	const operator = await getOperator();
	if (!operator) {
		return false;
	}

	const header = request.headers.get("authorization");
	if (!header) {
		return false;
	}

	const [, rawToken = ""] = header.match(/^Bearer\s+(.*)$/i) ?? [];
	if (!rawToken) {
		return false;
	}

	return rawToken === computeToken(operator);
}
