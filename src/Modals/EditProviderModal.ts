import { App, Modal, Setting } from "obsidian";
import AugmentedCanvasPlugin from "../AugmentedCanvasPlugin";
import { LLMProvider } from "../settings/AugmentedCanvasSettings";

export class EditProviderModal extends Modal {
    plugin: AugmentedCanvasPlugin;
    provider: LLMProvider | null;
    onSubmit: (provider: LLMProvider) => void;
    nameInput: string = "";
    baseUrlInput: string = "";
    apiKeyInput: string = "";
    contentEl: HTMLElement;

    constructor(
        app: App, 
        plugin: AugmentedCanvasPlugin, 
        provider: LLMProvider | null,
        onSubmit: (provider: LLMProvider) => void
    ) {
        super(app);
        this.plugin = plugin;
        this.provider = provider;
        this.onSubmit = onSubmit;

        // Initialize inputs with provider values if editing
        if (provider) {
            this.nameInput = provider.name;
            this.baseUrlInput = provider.baseUrl;
            this.apiKeyInput = provider.apiKey;
        }
    }

    onOpen() {
        this.contentEl.empty();
        this.contentEl.addClass("augmented-canvas-modal-container");

        // Title
        this.contentEl.createEl("h3", { 
            text: this.provider ? "Edit Provider" : "Add New Provider" 
        });

        // Provider Name
        new Setting(this.contentEl)
            .setName("Provider Name")
            .setDesc("A unique name for this provider")
            .addText((text) => {
                text.setValue(this.nameInput)
                    .setPlaceholder("e.g., Anthropic, Ollama, Local, etc.")
                    .onChange((value) => {
                        this.nameInput = value;
                    });
            });

        // Base URL
        new Setting(this.contentEl)
            .setName("Base URL")
            .setDesc("OpenAI compatible API endpoint")
            .addText((text) => {
                text.setValue(this.baseUrlInput)
                    .setPlaceholder("https://api.example.com/v1")
                    .onChange((value) => {
                        this.baseUrlInput = value;
                    });
            });

        // API Key
        new Setting(this.contentEl)
            .setName("API Key")
            .setDesc("API key for this provider")
            .addText((text) => {
                text.setPlaceholder("API Key")
                    .setValue(this.apiKeyInput)
                    .onChange((value) => {
                        this.apiKeyInput = value;
                    });
                text.inputEl.type = "password";
            });

        // Submit button
        const footerEl = this.contentEl.createDiv("modal-button-container");
        
        const cancelBtn = footerEl.createEl("button", { text: "Cancel" });
        cancelBtn.onClickEvent(() => {
            this.close();
        });

        const submitBtn = footerEl.createEl("button", { 
            text: this.provider ? "Save" : "Add",
            cls: "mod-cta"
        });
        
        submitBtn.onClickEvent(() => {
            if (!this.nameInput.trim()) {
                // Show error if name is empty
                return;
            }
            
            if (!this.baseUrlInput.trim()) {
                // Show error if base URL is empty
                return;
            }
            
            const updatedProvider: LLMProvider = {
                name: this.nameInput,
                baseUrl: this.baseUrlInput,
                apiKey: this.apiKeyInput,
                isActive: this.provider?.isActive || false
            };
            
            this.onSubmit(updatedProvider);
            this.close();
        });
    }

    onClose() {
        this.contentEl.empty();
    }
} 