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

type AgendaLoadResult = {
	events: AgendaEvent[];
	sourcePath: string | null;
};

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

function resolveEventTimestamp(event: AgendaEvent): number | null {
	const rawDate = event.date?.trim();
	if (!rawDate) {
		return null;
	}

	const rawTime = event.time?.trim();
	const candidates: string[] = [];

	if (rawTime) {
		const normalizedTime = /^\d{2}:\d{2}$/.test(rawTime) ? `${rawTime}:00` : rawTime;
		candidates.push(`${rawDate}T${normalizedTime}`);
	}

	candidates.push(`${rawDate}T23:59:59`);
	candidates.push(rawDate);

	for (const candidate of candidates) {
		const timestamp = Date.parse(candidate);
		if (!Number.isNaN(timestamp)) {
			return timestamp;
		}
	}

	return null;
}

function purgePastEvents(events: AgendaEvent[], referenceDate = new Date()) {
	const threshold = referenceDate.getTime();
	const upcoming: AgendaEvent[] = [];
	const removed: AgendaEvent[] = [];

	for (const event of events) {
		const timestamp = resolveEventTimestamp(event);
		if (timestamp !== null && timestamp < threshold) {
			removed.push(event);
		} else {
			upcoming.push(event);
		}
	}

	return { upcoming, removed };
}

async function loadAgenda(): Promise<AgendaLoadResult> {
	for (const candidate of agendaCandidates) {
		const data = await readFromCandidate(candidate);
		if (Array.isArray(data)) {
			return { events: data, sourcePath: candidate };
		}
	}
	return { events: [...fallbackEvents], sourcePath: null };
}

export async function readEvents(): Promise<AgendaEvent[]> {
	const { events, sourcePath } = await loadAgenda();
	const { upcoming, removed } = purgePastEvents(events);

	if (removed.length && sourcePath) {
		try {
			await writeEvents(upcoming);
		} catch (error) {
			console.error("Error removing past agenda events:", error);
		}
	}

	return upcoming;
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
