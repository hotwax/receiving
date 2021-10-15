import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { ShopifyInstallPage } from './shopify-install.page';

describe('ShopifyInstallPage', () => {
  let component: ShopifyInstallPage;
  let fixture: ComponentFixture<ShopifyInstallPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ShopifyInstallPage ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(ShopifyInstallPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
