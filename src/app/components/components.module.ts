import { NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { ImageComponent } from '../components/image/image.component';

@NgModule({
  declarations: [ ImageComponent ],
  imports: [
    CommonModule,
    IonicModule
  ],
  exports: [
    ImageComponent
  ]
})
export class ComponentsModule { }
