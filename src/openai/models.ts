export const CHAT_MODELS = {
	GPT_4O: {
		name: "openai/gpt-4o",
		tokenLimit: 128000,
	},
	GPT_4O_MINI: {
		name: "openai/gpt-4o-mini",
		tokenLimit: 128000,
	},
	GPT_4_TURBO: {
		name: "openai/gpt-4-turbo",
		tokenLimit: 128000,
	},
	CLAUDE_3_OPUS: {
		name: "anthropic/claude-3-opus",
		tokenLimit: 200000,
	},
	CLAUDE_3_SONNET: {
		name: "anthropic/claude-3-sonnet",
		tokenLimit: 180000,
	},
	CLAUDE_3_HAIKU: {
		name: "anthropic/claude-3-haiku",
		tokenLimit: 150000,
	},
	MISTRAL_LARGE: {
		name: "mistral/mistral-large-latest",
		tokenLimit: 128000,
	},
	GEMINI_PRO: {
		name: "google/gemini-pro",
		tokenLimit: 128000,
	}
};

export function chatModelByName(name: string) {
	return Object.values(CHAT_MODELS).find((model) => model.name === name);
}
