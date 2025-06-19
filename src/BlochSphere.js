import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

function makeTextSprite(message, color = "#fff") {
  const canvas = document.createElement('canvas');
  const size = 128;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.font = 'bold 48px Arial';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(message, size / 2, size / 2);
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(0.4, 0.4, 0.4);
  return sprite;
}

export default function BlochSphere({ basisVectors = [] }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      60,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, -3, 0);
    camera.up.set(0, 0, 1);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x222222, 1);
    renderer.setSize(
      containerRef.current.clientWidth,
      containerRef.current.clientHeight
    );
    if (containerRef.current.firstChild) {
      containerRef.current.removeChild(containerRef.current.firstChild);
    }
    containerRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Q-sphere: sphere and latitude/longitude lines
    const sphereGeom = new THREE.SphereGeometry(1, 64, 64);
    const sphereMat = new THREE.MeshPhongMaterial({
      color: 0x156289,
      emissive: 0x072534,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.25,
    });
    const sphere = new THREE.Mesh(sphereGeom, sphereMat);
    scene.add(sphere);

    function createCircle(axis) {
      const curve = new THREE.EllipseCurve(0, 0, 1, 1, 0, 2 * Math.PI, false, 0);
      const points = curve.getPoints(128);
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: 0xffffff,
        opacity: 0.15,
        transparent: true,
      });
      const circle = new THREE.LineLoop(geometry, material);
      if (axis === 'x') circle.rotation.y = Math.PI / 2;
      if (axis === 'y') circle.rotation.x = Math.PI / 2;
      return circle;
    }
    scene.add(createCircle('x'), createCircle('y'), createCircle('z'));

    // Axis labels
    const xLabel = makeTextSprite('X', '#ff5555');
    xLabel.position.set(1.3, 0, 0);
    scene.add(xLabel);

    const yLabel = makeTextSprite('Y', '#55ff55');
    yLabel.position.set(0, 1.3, 0);
    scene.add(yLabel);

    const zLabel = makeTextSprite('Z', '#5599ff');
    zLabel.position.set(0, 0, 1.3);
    scene.add(zLabel);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xffffff, 1);
    camera.add(pointLight);
    scene.add(camera);

    // Q-sphere vectors
    const colors = [0xffff00, 0xff00ff, 0x00ffff, 0xff8800, 0x00ff88, 0x8888ff, 0xffffff];
    if (basisVectors && basisVectors.length > 0) {
      basisVectors.forEach((vec, idx) => {
        let { x, y, z, prob, state } = vec;
        const color = colors[idx % colors.length];

        // --- QSPHERE Z-FIGHTING FIX ---
        // Apply a tiny unique angular offset to phi for each vector
        const epsilon = 0.03 * idx; // 0, 0.03, 0.06, ...
        const r = Math.sqrt(x * x + y * y);
        let theta = Math.acos(z);
        let phi = Math.atan2(y, x) + epsilon;

        // Recompute direction with offset
        x = Math.sin(theta) * Math.cos(phi);
        y = Math.sin(theta) * Math.sin(phi);
        z = Math.cos(theta);

        const dir = new THREE.Vector3(x, y, z).normalize();
        const length = 0.9;
        const shaftRadius = 0.06 * prob + 0.02;
        const shaftLength = length - 0.18;
        const shaftGeom = new THREE.CylinderGeometry(shaftRadius, shaftRadius, shaftLength, 16);
        const shaftMat = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.8,
          depthWrite: false,
          depthTest: false
        });
        shaftMat.polygonOffset = true;
        shaftMat.polygonOffsetFactor = 1;
        shaftMat.polygonOffsetUnits = idx;
        const shaft = new THREE.Mesh(shaftGeom, shaftMat);
        shaft.position.copy(dir.clone().multiplyScalar(shaftLength / 2));
        shaft.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          dir
        );
        scene.add(shaft);

        const headLength = 0.18;
        const headGeom = new THREE.ConeGeometry(shaftRadius * 2, headLength, 16);
        const headMat = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.8,
          depthWrite: false,
          depthTest: false
        });
        headMat.polygonOffset = true;
        headMat.polygonOffsetFactor = 1;
        headMat.polygonOffsetUnits = idx;
        const head = new THREE.Mesh(headGeom, headMat);
        head.position.copy(dir.clone().multiplyScalar(shaftLength + headLength / 2));
        head.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          dir
        );
        scene.add(head);

        // Optional: label the state at the tip
        const stateLabel = makeTextSprite(state, color);
        stateLabel.position.copy(dir.clone().multiplyScalar(1.08));
        scene.add(stateLabel);
      });
    }

    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, [basisVectors]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '400px',
        background: '#222',
        position: 'relative',
      }}
    />
  );
}
