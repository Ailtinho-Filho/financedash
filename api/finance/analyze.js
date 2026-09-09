import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey });

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido.' });
    }

    try {
        if (!apiKey) {
            return res.status(500).json({ error: 'Chave GEMINI_API_KEY não configurada.' });
        }

        const { description, amount } = req.body;

        if (!description || typeof amount !== 'number') {
            return res.status(400).json({ 
                error: 'Parâmetros inválidos. Forneça "description" (string) e "amount" (number).' 
            });
        }

        const prompt = `Analise a transação financeira informada e retorne estritamente um objeto JSON com as chaves:
        - "category": String (ex: Alimentação, Transporte, Moradia, Lazer, Investimentos, Saúde, Outros)
        - "type": "EXPENSE" ou "INCOME"
        - "is_anomaly": boolean (true se o valor for desproporcional ou suspeito)
        - "insight": String curta com uma dica prática sobre esse gasto.

        Transação: Descrição: "${description}", Valor: R$ ${amount}`;

        const response = await ai.models.generateContent({
            model: 'gemini-3.6-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                systemInstruction: "Você é um motor de inteligência financeira estrito que retorna apenas dados em JSON válido."
            }
        });

        const rawText = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        const data = JSON.parse(rawText.replace(/```json|```/g, '').trim());

        return res.status(200).json({
            success: true,
            data
        });

    } catch (error) {
        console.error('[Finance AI Error]:', error);
        
        // Fallback robusto se a cota estourar (Erro 429) ou o serviço falhar
        const isQuotaExceeded = error.status === 429 || String(error).includes('429');
        
        return res.status(isQuotaExceeded ? 429 : 500).json({ 
            error: isQuotaExceeded ? 'Limite diário da API atingido.' : 'Erro interno ao processar análise.',
            fallback: { category: 'Outros', type: 'EXPENSE', is_anomaly: false, insight: 'Serviço temporariamente indisponível. Classificado como Outros.' }
        });
    }
}
