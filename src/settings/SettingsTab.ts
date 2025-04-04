import {
	App,
	ButtonComponent,
	Notice,
	PluginSettingTab,
	Setting,
	TextAreaComponent,
	TextComponent,
} from "obsidian";
import ChatStreamPlugin from "./../AugmentedCanvasPlugin";
import {
	LLMProvider,
	SystemPrompt,
	getModels,
} from "./AugmentedCanvasSettings";
import { initLogDebug } from "src/logDebug";
import { EditProviderModal } from "src/Modals/EditProviderModal";

export class SettingsTab extends PluginSettingTab {
	plugin: ChatStreamPlugin;

	constructor(app: App, plugin: ChatStreamPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		// Model input - direct text input instead of dropdown
		new Setting(containerEl)
			.setName("Model")
			.setDesc("Enter the model ID (e.g., openai/gpt-4o, anthropic/claude-3-opus)")
			.addText((text) => {
				text.setPlaceholder("openai/gpt-4o")
					.setValue(this.plugin.settings.apiModel)
					.onChange(async (value) => {
						this.plugin.settings.apiModel = value;
						await this.plugin.saveSettings();
					});
			});

		// API Key input
		new Setting(containerEl)
			.setName("API key")
			.setDesc("Your API key for the selected provider")
			.addText((text) => {
				text.inputEl.type = "password";
				text.setPlaceholder("API Key")
					.setValue(this.plugin.settings.apiKey)
					.onChange(async (value) => {
						this.plugin.settings.apiKey = value;
						await this.plugin.saveSettings();
					});
			});

		// Provider URL input
		new Setting(containerEl)
			.setName("Provider URL")
			.setDesc("Base URL for the API provider (e.g., https://openrouter.ai/api/v1)")
			.addText((text) => {
				// Get the current active provider's URL if available
				const activeProvider = this.plugin.settings.llmProviders.find(
					p => p.name === this.plugin.settings.activeProvider
				);
				
				text.setPlaceholder("https://api.openai.com/v1")
					.setValue(activeProvider?.baseUrl || "")
					.onChange(async (value) => {
						// Update or create a default provider
						const defaultProvider = {
							name: "default",
							baseUrl: value,
							apiKey: this.plugin.settings.apiKey,
							isActive: true
						};
						
						// Update the provider list
						const existingIndex = this.plugin.settings.llmProviders.findIndex(
							p => p.name === "default"
						);
						
						if (existingIndex >= 0) {
							this.plugin.settings.llmProviders[existingIndex] = defaultProvider;
						} else {
							this.plugin.settings.llmProviders = [defaultProvider];
						}
						
						// Set as active provider
						this.plugin.settings.activeProvider = "default";
						
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName("Youtube API key")
			.setDesc("The Youtube API key used to fetch captions")
			.addText((text) => {
				text.inputEl.type = "password";
				text.setPlaceholder("API Key")
					.setValue(this.plugin.settings.youtubeApiKey)
					.onChange(async (value) => {
						this.plugin.settings.youtubeApiKey = value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName("Default system prompt")
			.setDesc(
				`The system prompt sent with each request to the API. \n(Note: you can override this by beginning a note stream with a note starting 'SYSTEM PROMPT'. The remaining content of that note will be used as system prompt.)`
			)
			.addTextArea((component) => {
				component.inputEl.rows = 6;
				component.inputEl.addClass("augmented-canvas-settings-prompt");
				component.setValue(this.plugin.settings.systemPrompt);
				component.onChange(async (value) => {
					this.plugin.settings.systemPrompt = value;
					await this.plugin.saveSettings();
				});
			});

		this.displaySystemPromptsSettings(containerEl);

		new Setting(containerEl)
			.setName("Flashcards system prompt")
			.setDesc(`The system prompt used to generate the flashcards file.`)
			.addTextArea((component) => {
				component.inputEl.rows = 6;
				component.inputEl.addClass("augmented-canvas-settings-prompt");
				component.setValue(this.plugin.settings.flashcardsSystemPrompt);
				component.onChange(async (value) => {
					this.plugin.settings.flashcardsSystemPrompt = value;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName("Relevant questions system prompt")
			.setDesc(
				`The system prompt used to generate relevant questions for the command "Insert relevant questions".`
			)
			.addTextArea((component) => {
				component.inputEl.rows = 6;
				component.inputEl.addClass("augmented-canvas-settings-prompt");
				component.setValue(
					this.plugin.settings.relevantQuestionsSystemPrompt
				);
				component.onChange(async (value) => {
					this.plugin.settings.relevantQuestionsSystemPrompt = value;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName("Insert relevant questions files count")
			.setDesc(
				'The number of files that are taken into account by the "Insert relevant questions" command.'
			)
			.addText((text) =>
				text
					.setValue(
						this.plugin.settings.insertRelevantQuestionsFilesCount.toString()
					)
					.onChange(async (value) => {
						const parsed = parseInt(value);
						if (!isNaN(parsed)) {
							this.plugin.settings.insertRelevantQuestionsFilesCount =
								parsed;
							await this.plugin.saveSettings();
						}
					})
			);

		new Setting(containerEl)
			.setName("Max input tokens")
			.setDesc(
				"The maximum number of tokens to send (within model limit). 0 means as many as possible"
			)
			.addText((text) =>
				text
					.setValue(this.plugin.settings.maxInputTokens.toString())
					.onChange(async (value) => {
						const parsed = parseInt(value);
						if (!isNaN(parsed)) {
							this.plugin.settings.maxInputTokens = parsed;
							await this.plugin.saveSettings();
						}
					})
			);

		new Setting(containerEl)
			.setName("Max response tokens")
			.setDesc(
				"The maximum number of tokens to return from the API. 0 means no limit. (A token is about 4 characters)."
			)
			.addText((text) =>
				text
					.setValue(this.plugin.settings.maxResponseTokens.toString())
					.onChange(async (value) => {
						const parsed = parseInt(value);
						if (!isNaN(parsed)) {
							this.plugin.settings.maxResponseTokens = parsed;
							await this.plugin.saveSettings();
						}
					})
			);

		new Setting(containerEl)
			.setName("Max depth")
			.setDesc(
				"The maximum depth of ancestor notes to include. 0 means no limit."
			)
			.addText((text) =>
				text
					.setValue(this.plugin.settings.maxDepth.toString())
					.onChange(async (value) => {
						const parsed = parseInt(value);
						if (!isNaN(parsed)) {
							this.plugin.settings.maxDepth = parsed;
							await this.plugin.saveSettings();
						}
					})
			);

		new Setting(containerEl)
			.setName("Temperature")
			.setDesc("Sampling temperature (0-2). 0 means no randomness.")
			.addText((text) =>
				text
					.setValue(this.plugin.settings.temperature.toString())
					.onChange(async (value) => {
						const parsed = parseFloat(value);
						if (!isNaN(parsed) && parsed >= 0 && parsed <= 2) {
							this.plugin.settings.temperature = parsed;
							await this.plugin.saveSettings();
						}
					})
			);

		new Setting(containerEl)
			.setName("Debug output")
			.setDesc("Enable debug output in the console")
			.addToggle((component) => {
				component
					.setValue(this.plugin.settings.debug)
					.onChange(async (value) => {
						this.plugin.settings.debug = value;
						await this.plugin.saveSettings();
						initLogDebug(this.plugin.settings);
					});
			});
	}

	displaySystemPromptsSettings(containerEl: HTMLElement): void {
		const setting = new Setting(containerEl);

		setting
			.setName("Add system prompts")
			.setClass("augmented-canvas-setting-item")
			.setDesc(
				`Create new highlight colors by providing a color name and using the color picker to set the hex code value. Don't forget to save the color before exiting the color picker. Drag and drop the highlight color to change the order for your highlighter component.`
			);

		const nameInput = new TextComponent(setting.controlEl);
		nameInput.setPlaceholder("Name");
		// colorInput.inputEl.addClass("highlighter-settings-color");

		let promptInput: TextAreaComponent;
		setting.addTextArea((component) => {
			component.inputEl.rows = 6;
			// component.inputEl.style.width = "300px";
			// component.inputEl.style.fontSize = "10px";
			component.setPlaceholder("Prompt");
			component.inputEl.addClass("augmented-canvas-settings-prompt");
			promptInput = component;
		});

		setting.addButton((button) => {
			button
				.setIcon("lucide-plus")
				.setTooltip("Add")
				.onClick(async (buttonEl: any) => {
					let name = nameInput.inputEl.value;
					const prompt = promptInput.inputEl.value;

					// console.log({ name, prompt });

					if (!name || !prompt) {
						name && !prompt
							? new Notice("Prompt missing")
							: !name && prompt
							? new Notice("Name missing")
							: new Notice("Values missing"); // else
						return;
					}

					// * Handles multiple with the same name
					// if (
					// 	this.plugin.settings.systemPrompts.filter(
					// 		(systemPrompt: SystemPrompt) =>
					// 			systemPrompt.act === name
					// 	).length
					// ) {
					// 	name += " 2";
					// }
					// let count = 3;
					// while (
					// 	this.plugin.settings.systemPrompts.filter(
					// 		(systemPrompt: SystemPrompt) =>
					// 			systemPrompt.act === name
					// 	).length
					// ) {
					// 	name = name.slice(0, -2) + " " + count;
					// 	count++;
					// }

					if (
						!this.plugin.settings.systemPrompts.filter(
							(systemPrompt: SystemPrompt) =>
								systemPrompt.act === name
						).length &&
						!this.plugin.settings.userSystemPrompts.filter(
							(systemPrompt: SystemPrompt) =>
								systemPrompt.act === name
						).length
					) {
						this.plugin.settings.userSystemPrompts.push({
							id:
								this.plugin.settings.systemPrompts.length +
								this.plugin.settings.userSystemPrompts.length,
							act: name,
							prompt,
						});
						await this.plugin.saveSettings();
						this.display();
					} else {
						buttonEl.stopImmediatePropagation();
						new Notice("This system prompt name already exists");
					}
				});
		});

		const listContainer = containerEl.createEl("div", {
			cls: "augmented-canvas-list-container",
		});

		this.plugin.settings.userSystemPrompts.forEach(
			(systemPrompt: SystemPrompt) => {
				const listElement = listContainer.createEl("div", {
					cls: "augmented-canvas-list-element",
				});

				const nameInput = new TextComponent(listElement);
				nameInput.setValue(systemPrompt.act);

				const promptInput = new TextAreaComponent(listElement);
				promptInput.inputEl.addClass(
					"augmented-canvas-settings-prompt"
				);
				promptInput.setValue(systemPrompt.prompt);

				const buttonSave = new ButtonComponent(listElement);
				buttonSave
					.setIcon("lucide-save")
					.setTooltip("Save")
					.onClick(async (buttonEl: any) => {
						let name = nameInput.inputEl.value;
						const prompt = promptInput.inputEl.value;

						// console.log({ name, prompt });
						this.plugin.settings.userSystemPrompts =
							this.plugin.settings.userSystemPrompts.map(
								(systemPrompt2: SystemPrompt) =>
									systemPrompt2.id === systemPrompt.id
										? {
												...systemPrompt2,
												act: name,
												prompt,
										  }
										: systemPrompt2
							);
						await this.plugin.saveSettings();
						this.display();
						new Notice("System prompt updated");
					});

				const buttonDelete = new ButtonComponent(listElement);
				buttonDelete
					.setIcon("lucide-trash")
					.setTooltip("Delete")
					.onClick(async (buttonEl: any) => {
						let name = nameInput.inputEl.value;
						const prompt = promptInput.inputEl.value;

						// console.log({ name, prompt });
						this.plugin.settings.userSystemPrompts =
							this.plugin.settings.userSystemPrompts.filter(
								(systemPrompt2: SystemPrompt) =>
									systemPrompt2.id !== systemPrompt.id
							);
						await this.plugin.saveSettings();
						this.display();
						new Notice("System prompt deleted");
					});
			}
		);
	}
}

export default SettingsTab;
