import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../../../services/notification.service';
import { ToastService } from '../../../services/toast.service';
import { Notification } from '../../../models/Notification';
import { NotificationType } from '../../../models/enums/NotificationType';

interface ContactFormData {
  email: string;
  subject: string;
  message: string;
}

@Component({
  selector: 'app-footer',
  imports: [CommonModule, FormsModule],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css']
})
export class FooterComponent {
  contactForm: ContactFormData = {
    email: '',
    subject: '',
    message: ''
  };

  /**
   * Submit contact form
   * In a real application, this would send data to a backend service
   */
  constructor(private notificationService: NotificationService, private toastService: ToastService) { }

  submitContactForm(): void {
    if (!this.isFormValid()) {
      this.toastService.showError('Please fill in all form fields correctly');
      return;
    }

    const adminEmail = 'azizmabrouk184@gmail.com';
    const payload: Notification = {
      subject: this.contactForm.subject,
      recipient: adminEmail,
      body: `From: ${this.contactForm.email}\n\n${this.contactForm.message}`,
      notificationType: NotificationType.contact_notification
    } as Notification;

    this.notificationService.create(payload).subscribe({
      next: (res) => {
        console.debug('Contact form response:', res);
        try {
          this.toastService.showSuccess('Message sent to admin successfully');
          // verify toast container exists
          const toastContainer = document.getElementById('toast-container');
          if (!toastContainer) {
            console.warn('Toast container not found; toasts may not be visible.');
          }
        } catch (e) {
          console.warn('Toast showSuccess failed', e);
        }
        this.resetForm();
      },
      error: (err) => {
        console.error('Failed to send contact message', err);
        this.toastService.showError('Failed to send message. Please try again later.');
      }
    });
  }

  /**
   * Validate form fields
   */
  private isFormValid(): boolean {
    return (
      this.contactForm.email.trim() !== '' &&
      this.contactForm.subject.trim() !== '' &&
      this.contactForm.message.trim() !== '' &&
      this.isValidEmail(this.contactForm.email)
    );
  }

  /**
   * Simple email validation
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Reset form fields
   */
  private resetForm(): void {
    this.contactForm = {
      email: '',
      subject: '',
      message: ''
    };
  }
}