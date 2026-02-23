import * as THREE from 'three';
import { GROUND_RADIUS, BOUNDARY_RADIUS } from '../utils/constants.js';

export class Stadium {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this._buildGround();
    this._buildBoundaryRope();
    this._buildStands();
    this._buildSky();
    this._buildLighting();
    scene.add(this.group);
  }

  _buildGround() {
    const groundGeo = new THREE.CircleGeometry(GROUND_RADIUS, 64);
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x2d7a3a });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.group.add(ground);

    // Outfield rings for visual depth
    const ring1Geo = new THREE.RingGeometry(BOUNDARY_RADIUS - 8, BOUNDARY_RADIUS - 6, 64);
    const ring1Mat = new THREE.MeshLambertMaterial({ color: 0x34883f, side: THREE.DoubleSide });
    const ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
    ring1.rotation.x = -Math.PI / 2;
    ring1.position.y = 0.01;
    this.group.add(ring1);

    const ring2Geo = new THREE.RingGeometry(30, 32, 64);
    const ring2Mat = new THREE.MeshLambertMaterial({ color: 0x34883f, side: THREE.DoubleSide });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.rotation.x = -Math.PI / 2;
    ring2.position.y = 0.01;
    this.group.add(ring2);
  }

  _buildBoundaryRope() {
    const curve = new THREE.EllipseCurve(0, 0, BOUNDARY_RADIUS, BOUNDARY_RADIUS, 0, Math.PI * 2, false, 0);
    const points = curve.getPoints(128);
    const ropeGeo = new THREE.BufferGeometry().setFromPoints(
      points.map(p => new THREE.Vector3(p.x, 0.05, p.y))
    );
    const ropeMat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
    const rope = new THREE.Line(ropeGeo, ropeMat);
    this.group.add(rope);
  }

  _buildStands() {
    const standCount = 12;
    for (let i = 0; i < standCount; i++) {
      const angle = (i / standCount) * Math.PI * 2;
      const r = GROUND_RADIUS + 3;
      const width = 18;
      const height = 6 + Math.random() * 4;
      const depth = 8;

      const standGeo = new THREE.BoxGeometry(width, height, depth);
      const shade = 0.3 + Math.random() * 0.15;
      const standMat = new THREE.MeshLambertMaterial({
        color: new THREE.Color(shade, shade, shade + 0.1),
      });
      const stand = new THREE.Mesh(standGeo, standMat);
      stand.position.set(Math.cos(angle) * r, height / 2, Math.sin(angle) * r);
      stand.lookAt(0, height / 2, 0);
      stand.castShadow = true;
      stand.receiveShadow = true;
      this.group.add(stand);
    }
  }

  _buildSky() {
    const skyGeo = new THREE.SphereGeometry(200, 32, 32);
    const skyMat = new THREE.MeshBasicMaterial({
      color: 0x87ceeb,
      side: THREE.BackSide,
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);

    // Gradient effect using vertex colors
    const colors = [];
    const pos = skyGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const t = (y + 200) / 400;
      const r = 0.4 + t * 0.13;
      const g = 0.65 + t * 0.16;
      const b = 0.85 + t * 0.07;
      colors.push(r, g, b);
    }
    skyGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    skyMat.vertexColors = true;
    skyMat.color.set(0xffffff);

    this.group.add(sky);
  }

  _buildLighting() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xfff5e6, 1.2);
    sun.position.set(30, 50, -20);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 150;
    sun.shadow.camera.left = -50;
    sun.shadow.camera.right = 50;
    sun.shadow.camera.top = 50;
    sun.shadow.camera.bottom = -50;
    this.scene.add(sun);

    const fill = new THREE.DirectionalLight(0xadd8e6, 0.3);
    fill.position.set(-20, 30, 20);
    this.scene.add(fill);
  }
}
