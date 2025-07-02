import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class GameService {
  flashText = signal('');
  artifactsCollected = signal(0);
}
