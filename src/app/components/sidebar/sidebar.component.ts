import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
})
export class SidebarComponent {
  toggleDrawer() {
    const checkbox = document.getElementById('sidebar-drawer') as HTMLInputElement;
    if (checkbox) {
      checkbox.checked = !checkbox.checked;
    }
  }

  closeDrawer() {
    const checkbox = document.getElementById('sidebar-drawer') as HTMLInputElement;
    if (checkbox) {
      checkbox.checked = false;
    }
  }
}
