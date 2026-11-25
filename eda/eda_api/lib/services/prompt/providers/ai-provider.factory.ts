import type { IAIProvider } from './ai-provider.interface';

export class AIProviderFactory {

    static create(config: Record<string, any>): IAIProvider {
        const { PROVIDER } = config;

        if (PROVIDER === 'openai') return new (require('./openai.provider').OpenAIProvider)(config);
        if (PROVIDER === 'anthropic') return new (require('./anthropic.provider').AnthropicProvider)(config);
        if (PROVIDER === 'bedrock') return new (require('./bedrock.provider').BedrockProvider)(config);
        if (PROVIDER === 'qwen') return new (require('./qwen.provider').QwenProvider)(config);

        throw new Error(`Proveedor IA "${PROVIDER}" no esta soportado. Opciones validas: openai, anthropic, bedrock, qwen`);
    }

}
