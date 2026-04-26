import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TrackerComponent }      from './tracker/tracker.component';
import { BuilderComponent }      from './builder/builder.component';
import { JourneysComponent }     from './journeys/journeys.component';
import { ExercisesComponent }    from './exercises/exercises.component';
import { AdminComponent }        from './admin/admin.component';
import { EditProfileComponent }  from './profile/edit-profile.component';
import { ViewProfileComponent }  from './profile/view-profile.component';

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
    EditProfileComponent,
    ViewProfileComponent,
  ],
  template: `
    @switch (page) {
      @case ('tracker')      { <app-tracker />      }
      @case ('builder')      { <app-builder />      }
      @case ('journeys')     { <app-journeys />     }
      @case ('exercises')    { <app-exercises />    }
      @case ('admin')        { <app-admin />        }
      @case ('edit_profile') { <app-edit-profile /> }
      @case ('view_profile') { <app-view-profile /> }
    }
  `,
})
export class AppComponent implements OnInit {
  page = '';
  ngOnInit(): void { this.page = window.APP_PAGE ?? ''; }
}
