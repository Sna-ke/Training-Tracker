import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TrackerComponent }   from './tracker/tracker.component';
import { BuilderComponent }   from './builder/builder.component';
import { JourneysComponent }  from './journeys/journeys.component';
import { ExercisesComponent } from './exercises/exercises.component';
import { AdminComponent }     from './admin/admin.component';

declare const window: Window & typeof globalThis & { APP_PAGE: string };

@Component({
  standalone: true,
  selector: 'app-root',
  imports: [
    CommonModule,
    TrackerComponent,
    BuilderComponent,
    JourneysComponent,
    ExercisesComponent,
    AdminComponent,
  ],
  template: `
    @switch (page) {
      @case ('tracker')   { <app-tracker />   }
      @case ('builder')   { <app-builder />   }
      @case ('journeys')  { <app-journeys />  }
      @case ('exercises') { <app-exercises /> }
      @case ('admin')     { <app-admin />     }
    }
  `,
})
export class AppComponent implements OnInit {
  page = '';
  ngOnInit(): void { this.page = window.APP_PAGE ?? ''; }
}
