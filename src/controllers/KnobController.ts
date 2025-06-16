/**
 * Manages the TV knob interaction and angle calculations
 */
import { KnobState } from '../types/tv';

export class KnobController {
  private knobElement: HTMLElement;
  private state: KnobState;
  private onAngleChange: (angle: number) => void;

  constructor(knobElement: HTMLElement, onAngleChange: (angle: number) => void) {
    this.knobElement = knobElement;
    this.onAngleChange = onAngleChange;
    
    this.state = {
      currentAngle: 0, // Will be set to midpoint in initialize()
      isDragging: false,
      previousDragAngle: 0,
      minAngle: -90,
      maxAngle: 90,
    };

    this.initialize();
  }

  private initialize(): void {
    // Set initial rotation to the middle of the range (0 degrees)
    this.state.currentAngle = (this.state.minAngle + this.state.maxAngle) / 2;
    this.updateKnobRotation();

    this.setupEventListeners();
    // Don't call onAngleChange during initialization to avoid circular dependency issues
    // The parent can call getNormalizedIntensity() after construction if needed
  }

  private setupEventListeners(): void {
    // Mouse events
    this.knobElement.addEventListener('mousedown', this.handleMouseDown.bind(this));
    document.addEventListener('mousemove', this.handleMouseMove.bind(this));
    document.addEventListener('mouseup', this.handleMouseUp.bind(this));

    // Touch events for mobile compatibility
    this.knobElement.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    document.addEventListener('touchend', this.handleMouseUp.bind(this));
  }

  private handleMouseDown(event: MouseEvent): void {
    event.preventDefault();
    this.startDrag(event);
  }

  private handleTouchStart(event: TouchEvent): void {
    event.preventDefault();
    this.startDrag(event);
  }

  private handleMouseMove(event: MouseEvent): void {
    if (this.state.isDragging) {
      this.updateDrag(event);
    }
  }

  private handleTouchMove(event: TouchEvent): void {
    if (this.state.isDragging) {
      event.preventDefault();
      this.updateDrag(event);
    }
  }

  private handleMouseUp(): void {
    if (this.state.isDragging) {
      this.state.isDragging = false;
    }
  }

  private startDrag(event: MouseEvent | TouchEvent): void {
    this.state.isDragging = true;
    this.state.previousDragAngle = this.getAngle(event);
  }

  private updateDrag(event: MouseEvent | TouchEvent): void {
    const currentDragAngle = this.getAngle(event);
    let deltaAngle = currentDragAngle - this.state.previousDragAngle;

    // Handle angle wrap-around (-180 to 180 degrees)
    if (deltaAngle > 180) {
      deltaAngle -= 360;
    } else if (deltaAngle < -180) {
      deltaAngle += 360;
    }

    // Update the knob's current angle by the change
    let newAngle = this.state.currentAngle + deltaAngle;

    // Clamp the angle to the defined range
    newAngle = Math.max(this.state.minAngle, Math.min(this.state.maxAngle, newAngle));

    // Update the current angle and the previous angle for the next move
    this.state.currentAngle = newAngle;
    this.state.previousDragAngle = currentDragAngle;

    this.updateKnobRotation();
    this.onAngleChange(this.state.currentAngle);
  }

  private updateKnobRotation(): void {
    this.knobElement.style.transform = `rotate(${this.state.currentAngle}deg)`;
  }

  private getAngle(event: MouseEvent | TouchEvent): number {
    const knobRect = this.knobElement.getBoundingClientRect();
    const centerX = knobRect.left + knobRect.width / 2;
    const centerY = knobRect.top + knobRect.height / 2;

    let clientX: number, clientY: number;
    if (event instanceof MouseEvent) {
      clientX = event.clientX;
      clientY = event.clientY;
    } else {
      // TouchEvent - use the first touch point
      if (event.touches.length === 0) return this.state.currentAngle;
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    }

    const deltaX = clientX - centerX;
    const deltaY = clientY - centerY;
    // Calculate angle in degrees (atan2 returns radians)
    return Math.atan2(deltaY, deltaX) * (180 / Math.PI);
  }

  /**
   * Gets the current normalized intensity (0-1) based on knob position
   */
  getNormalizedIntensity(): number {
    const totalRange = this.state.maxAngle - this.state.minAngle;
    return (this.state.currentAngle - this.state.minAngle) / totalRange;
  }

  /**
   * Gets the current knob angle
   */
  getCurrentAngle(): number {
    return this.state.currentAngle;
  }

  /**
   * Cleanup event listeners
   */
  dispose(): void {
    document.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    document.removeEventListener('mouseup', this.handleMouseUp.bind(this));
    document.removeEventListener('touchmove', this.handleTouchMove.bind(this));
    document.removeEventListener('touchend', this.handleMouseUp.bind(this));
  }
}
