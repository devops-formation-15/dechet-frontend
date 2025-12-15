import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-notification-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-card.component.html',
  styleUrls: ['./notification-card.component.css']
})
export class NotificationCardComponent {
  @Input() notification: any;
  @Output() onView = new EventEmitter<any>();
  @Output() onDelete = new EventEmitter<any>();

  view() {
    this.onView.emit(this.notification);
  }

  delete() {
    this.onDelete.emit(this.notification);
  }
}
