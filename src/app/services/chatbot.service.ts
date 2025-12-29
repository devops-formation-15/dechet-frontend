import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment-dev';

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    user_type?: 'citizen' | 'employee';
}

export interface ChatResponse {
    response: string;
    user_type: 'citizen' | 'employee';
    timestamp: string;
}

@Injectable({
    providedIn: 'root'
})
export class ChatbotService {
    private apiUrl = environment.CHATBOT_URL;

    constructor(private http: HttpClient) { }

    /**
     * Send a message to the chatbot (Standard JSON)
     */
    sendMessage(message: string): Observable<ChatResponse> {
        return this.http.post<ChatResponse>(`${this.apiUrl}/chat`, { message });
    }

    /**
     * Send a message to the chatbot and return a stream (SSE)
     */
    async *sendStreamingMessage(message: string): AsyncIterable<any> {
        const response = await fetch(`${this.apiUrl}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, stream: true })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error('Response body is empty or not readable');
        }

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // SSE format: "data: <json>\n\n"
            const lines = buffer.split('\n\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') {
                        return;
                    }
                    try {
                        yield JSON.parse(data);
                    } catch (e) {
                        console.error('Error parsing SSE data:', e, 'Line:', line);
                    }
                }
            }
        }
    }

    /**
     * Check health of the chatbot service
     */
    checkHealth(): Observable<any> {
        return this.http.get(`${this.apiUrl}/health`);
    }
}
