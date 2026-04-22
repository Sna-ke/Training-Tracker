// Toast is now handled by PrimeNG's p-toast in each page component.
// This stub component is kept so existing imports don't break.
import { Component, Input } from '@angular/core';
@Component({ standalone: true, selector: 'app-toast', template: '' })
export class ToastComponent { @Input() message: string | null = null; }
