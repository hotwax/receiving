import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { AddProductModalPage } from './add-product-modal.page';

describe('AddProductModalPage', () => {
  let component: AddProductModalPage;
  let fixture: ComponentFixture<AddProductModalPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AddProductModalPage ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(AddProductModalPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
