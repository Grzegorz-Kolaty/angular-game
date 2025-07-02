import { computed, Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class GameService {
  flashText = signal('');
  collectedArtifacts = signal<number[][]>([]);
  artifactsCollected = computed(() => this.collectedArtifacts().length);
}
