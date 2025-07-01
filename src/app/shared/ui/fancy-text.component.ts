import { ChangeDetectionStrategy, Component, effect, ElementRef, input, untracked, viewChild } from '@angular/core';

@Component({
  selector: 'app-fancy-text',
  template: `
    <h1 class="fancy-text" #fancyText [attr.data-text]="text()">
      {{ text() }}
    </h1>
  `,
  styles: `
    :host {
      position: fixed;
      top: 40%;
      left: 50%;
      transform: translate(-50%, -50%);
      pointer-events: none;
    }

    .fancy-text {
      text-align: center;
      font-size: 4rem;
      font-weight: bold;
      position: relative;
      animation: melt 6.5s ease-out forwards;
      background: white;
      background-clip: text;
      z-index: 10000;
      color: transparent;
    }

    .fancy-text::before,
    .fancy-text::after {
      content: attr(data-text);
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: white;
      background-clip: text;
      color: transparent;
      transform: scaleY(1);
      animation: drip 3.5s ease-out forwards;
    }

    .fancy-text::after {
      filter: blur(10px);
      opacity: 0.3;
    }

    @keyframes melt {
      0% {
        transform: translateY(0);
        opacity: 1;
        filter: brightness(1);
      }
      90% {
        transform: translateY(20px);
        filter: brightness(3);
      }
      100% {
        opacity: 0;
        filter: brightness(1);
      }
    }

    @keyframes drip {
      0% {
        transform: scaleY(1);
        opacity: 0.3;
      }
      100% {
        transform: scaleY(1.3);
        opacity: 0.5;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FancyTextComponent {
  text = input.required<string>();
  fancyText = viewChild<ElementRef>('fancyText');

  constructor() {
    effect(() => {
      this.text();

      untracked(() => {
        const fancyText = this.fancyText();
        // trigger reflow to restart animation
        if (fancyText) {
          fancyText.nativeElement.style.animation = 'none';
          fancyText.nativeElement.offsetHeight;
          fancyText.nativeElement.style.animation = '';
        }
      });
    });
  }
}
