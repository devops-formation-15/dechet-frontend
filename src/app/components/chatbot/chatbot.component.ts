import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatbotService, ChatMessage } from '../../services/chatbot.service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-chatbot',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './chatbot.component.html',
    styleUrls: ['./chatbot.component.css']
})
export class ChatbotComponent implements OnInit, OnDestroy {
    @ViewChild('chatMessages') chatMessagesRef!: ElementRef;

    isOpen = false;
    isMinimized = false;
    messages: ChatMessage[] = [];
    userInput = '';
    isLoading = false;
    private subscription?: Subscription;

    // Quick action suggestions tailored for waste management
    quickActions = [
        '♻️ How to recycle plastic?',
        '📅 Next trash pickup?',
        '⚠️ Report a full bin',
        '🧤 Safety protocols'
    ];

    constructor(private chatbotService: ChatbotService) { }

    ngOnInit(): void {
        // Welcome message
        this.messages.push({
            role: 'assistant',
            content: 'Hello! 👋 I\'m Déchet Assistant, your intelligent waste management guide. How can I help you today?',
            timestamp: new Date()
        });
    }

    ngOnDestroy(): void {
        this.subscription?.unsubscribe();
    }

    toggleChat(): void {
        this.isOpen = !this.isOpen;
        if (this.isOpen) {
            this.isMinimized = false;
            setTimeout(() => this.scrollToBottom(), 100);
        }
    }

    toggleMinimize(): void {
        this.isMinimized = !this.isMinimized;
    }

    closeChat(): void {
        this.isOpen = false;
    }

    async sendMessage(): Promise<void> {
        if (!this.userInput.trim() || this.isLoading) return;

        const userMessage = this.userInput.trim();
        this.userInput = '';

        // Add user message
        this.messages.push({
            role: 'user',
            content: userMessage,
            timestamp: new Date()
        });

        this.scrollToBottom();
        this.isLoading = true;

        // Create a placeholder for the assistant response
        const assistantMessage: ChatMessage = {
            role: 'assistant',
            content: '',
            timestamp: new Date()
        };
        this.messages.push(assistantMessage);

        try {
            // Send to chatbot API and consume stream
            for await (const chunk of this.chatbotService.sendStreamingMessage(userMessage)) {
                if (chunk.type === 'metadata') {
                    assistantMessage.user_type = chunk.user_type;
                } else if (chunk.type === 'token') {
                    assistantMessage.content += chunk.token;
                    this.scrollToBottom();
                } else if (chunk.type === 'error') {
                    assistantMessage.content = `Error: ${chunk.details}`;
                }
            }
        } catch (error) {
            console.error('Chat error:', error);
            assistantMessage.content = 'Sorry, I encountered an error. Is the chatbot service running?';
        } finally {
            this.isLoading = false;
            this.scrollToBottom();
        }
    }

    useQuickAction(action: string): void {
        this.userInput = action.replace(/[♻️📅⚠️🧤]/g, '').trim();
        this.sendMessage();
    }

    private scrollToBottom(): void {
        setTimeout(() => {
            if (this.chatMessagesRef) {
                const element = this.chatMessagesRef.nativeElement;
                element.scrollTop = element.scrollHeight;
            }
        }, 100);
    }
}
