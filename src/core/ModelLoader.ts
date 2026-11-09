import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class ModelLoader {
  private static instance: ModelLoader;
  private loader = new GLTFLoader();
  private cache: Map<string, THREE.Group> = new Map();

  private constructor() {}

  public static getInstance(): ModelLoader {
    if (!ModelLoader.instance) {
      ModelLoader.instance = new ModelLoader();
    }
    return ModelLoader.instance;
  }

  public async loadGLTF(url: string): Promise<THREE.Group> {
    if (this.cache.has(url)) {
      return this.cache.get(url)!.clone();
    }

    return new Promise((resolve, reject) => {
      this.loader.load(
        url,
        (gltf) => {
          const model = gltf.scene;
          model.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          this.cache.set(url, model);
          resolve(model.clone());
        },
        undefined,
        (err) => {
          console.warn(`Failed loading model from ${url}`, err);
          reject(err);
        }
      );
    });
  }
}
