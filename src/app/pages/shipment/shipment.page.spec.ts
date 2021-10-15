import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { ShipmentPage } from './shipment.page';

describe('ShipmentPage', () => {
  let component: ShipmentPage;
  let fixture: ComponentFixture<ShipmentPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ShipmentPage ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(ShipmentPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
