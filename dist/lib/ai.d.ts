export type Tone = 'professional' | 'friendly' | 'empathetic';
export declare function generateEmbedding(text: string): Promise<number[]>;
export declare function findSimilarQuestions(question: string, limit?: number): Promise<unknown>;
export declare function generateAnswer(question: string, context: string, tone?: Tone): Promise<string>;
export declare function processSubmittedQuestion(questionId: string): Promise<string>;
//# sourceMappingURL=ai.d.ts.map