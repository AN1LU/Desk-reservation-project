import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Reservations } from './reservations';

describe('Reservations', () => {
  let component: Reservations;
  let fixture: ComponentFixture<Reservations>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Reservations]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Reservations);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
