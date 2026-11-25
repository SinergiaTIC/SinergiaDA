import type { IMCPAIProvider } from './mcp-ai-provider.interface';

export class MCPAIProviderFactory {

    static create(config: Record<string, any>): IMCPAIProvider {
        const { PROVIDER } = config;

        if (PROVIDER === 'openai') return new (require('./openai.mcp-provider').OpenAIMCPProvider)(config);
        if (PROVIDER === 'anthropic') return new (require('./anthropic.mcp-provider').AnthropicMCPProvider)(config);
        if (PROVIDER === 'bedrock') return new (require('./bedrock.mcp-provider').BedrockMCPProvider)(config);
        if (PROVIDER === 'qwen') return new (require('./qwen.mcp-provider').QwenMCPProvider)(config);

        throw new Error(`Proveedor IA "${PROVIDER}" no soportado para MCP. Opciones válidas: openai, anthropic, bedrock, qwen`);
    }

}
