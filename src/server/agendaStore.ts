import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

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

const agendaUrl = new URL("../data/agenda.json", import.meta.url);

export async function readEvents(): Promise<AgendaEvent[]> {
	if (!existsSync(agendaUrl)) {
		return [];
	}

	const raw = await readFile(agendaUrl, "utf-8");
	if (!raw.trim()) {
		return [];
	}

	try {
		const data = JSON.parse(raw) as AgendaEvent[];
		return Array.isArray(data) ? data : [];
	} catch (error) {
		console.error("Error parsing agenda file:", error);
		return [];
	}
}

export async function writeEvents(events: AgendaEvent[]): Promise<void> {
	await writeFile(agendaUrl, JSON.stringify(events, null, 2), "utf-8");
}

export async function getEventById(id: string): Promise<AgendaEvent | null> {
	if (!id) return null;
	const events = await readEvents();
	return events.find((event) => event.id === id) ?? null;
}
