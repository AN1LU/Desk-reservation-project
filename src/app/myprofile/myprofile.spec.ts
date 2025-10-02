import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Myprofile } from './myprofile';

describe('Myprofile', () => {
  let component: Myprofile;
  let fixture: ComponentFixture<Myprofile>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Myprofile]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Myprofile);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
