import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import agendaFallback from "../data/agenda.json";

export type AgendaEvent = {
	id: string;
	title: string;
	date: string;
	time?: string;
	location?: string;
	description?: string;
	image?: string;
	gallery?: string[];
};

const agendaCandidates = [
	resolve(process.cwd(), "data/agenda.json"),
	resolve(process.cwd(), "src/data/agenda.json"),
	resolve(process.cwd(), "../data/agenda.json"),
	resolve(process.cwd(), "../src/data/agenda.json"),
];

const fallbackEvents = Array.isArray(agendaFallback) ? agendaFallback : [];

const DEFAULT_WRITE_PATH = agendaCandidates[0];

async function readFromCandidate(path: string): Promise<AgendaEvent[] | null> {
	if (!path || !existsSync(path)) {
		return null;
	}

	try {
		const raw = await readFile(path, "utf-8");
		if (!raw.trim()) {
			return [];
		}
		const data = JSON.parse(raw) as AgendaEvent[];
		return Array.isArray(data) ? data : [];
	} catch (error) {
		console.error("Error reading agenda file:", error);
		return null;
	}
}

async function locateExistingPath(): Promise<string | null> {
	for (const candidate of agendaCandidates) {
		if (existsSync(candidate)) {
			return candidate;
		}
	}
	return null;
}

async function resolveWritePath(): Promise<string> {
	const existing = await locateExistingPath();
	return existing ?? DEFAULT_WRITE_PATH;
}

async function loadAgenda(): Promise<AgendaEvent[]> {
	for (const candidate of agendaCandidates) {
		const data = await readFromCandidate(candidate);
		if (Array.isArray(data)) {
			return data;
		}
	}
	return [...fallbackEvents];
}

export async function readEvents(): Promise<AgendaEvent[]> {
	return loadAgenda();
}

export async function writeEvents(events: AgendaEvent[]): Promise<void> {
	const targetPath = await resolveWritePath();
	await mkdir(dirname(targetPath), { recursive: true });
	await writeFile(targetPath, JSON.stringify(events, null, 2), "utf-8");
}

export async function getEventById(id: string): Promise<AgendaEvent | null> {
	if (!id) return null;
	const events = await readEvents();
	return events.find((event) => event.id === id) ?? null;
}
