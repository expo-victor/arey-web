import type { APIRoute } from "astro";
import { computeToken, getOperator } from "../../server/auth";

export const prerender = false;

type LoginRequest = {
	username?: string;
	password?: string;
};

export const POST: APIRoute = async ({ request }) => {
	const operator = await getOperator();
	if (!operator) {
		return new Response(JSON.stringify({ error: "Operator file not found" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}

	let body: LoginRequest;
	try {
		body = await request.json();
	} catch {
		return new Response(JSON.stringify({ error: "Invalid JSON payload" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	if (body.username !== operator.username || body.password !== operator.password) {
		return new Response(JSON.stringify({ error: "Invalid credentials" }), {
			status: 401,
			headers: { "Content-Type": "application/json" },
		});
	}

	const token = computeToken(operator);

	return new Response(JSON.stringify({ token, username: operator.username }), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
};

export const OPTIONS: APIRoute = async () =>
	new Response(null, {
		status: 204,
		headers: {
			Allow: "POST,OPTIONS",
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "POST,OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type",
		},
	});
