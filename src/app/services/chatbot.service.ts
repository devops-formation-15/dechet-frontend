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
     * Send a message to the chatbot
     */
    sendMessage(message: string): Observable<ChatResponse> {
        return this.http.post<ChatResponse>(`${this.apiUrl}/chat`, { message });
    }

    /**
     * Check health of the chatbot service
     */
    checkHealth(): Observable<any> {
        return this.http.get(`${this.apiUrl}/health`);
    }
}
