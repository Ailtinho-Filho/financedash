import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido.' });
    }

    try {
        const { description, amount } = req.body;

        if (!description || typeof amount !== 'number') {
            return res.status(400).json({ 
                error: 'Parâmetros inválidos. Forneça "description" (string) e "amount" (number).' 
            });
        }

        const completion = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            messages: [
                {
                    role: "system",
                    content: "Você é um motor de inteligência financeira. Retorne estritamente um JSON válido contendo: category (String), type ('EXPENSE' ou 'INCOME'), is_anomaly (boolean), insight (String curta)."
                },
                {
                    role: "user",
                    content: `Descrição: "${description}", Valor: R$ ${amount}`
                }
            ],
            response_format: { type: "json_object" },
            temperature: 0.2
        });

        const data = JSON.parse(completion.choices[0].message.content);

        return res.status(200).json({ success: true, data });

    } catch (error) {
        console.error('[Groq AI Error]:', error);
        return res.status(500).json({ 
            error: 'Erro ao processar análise.',
            fallback: { category: 'Outros', type: 'EXPENSE', is_anomaly: false, insight: 'Erro temporário.' }
        });
    }
}
