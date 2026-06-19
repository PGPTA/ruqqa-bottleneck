import * as THREE from 'three';
import { EQUIPMENT_TYPES, typeColorHex } from './equipment.js';
import { gym } from './config.js';

// Drag-and-drop layout editor. Lets the user resize the gym, drop new kit on
// the floor, drag it around, rotate it, change capacity and delete it.

export class Editor {
  constructor({ scene, camera, renderer, controls, world, sim, ui }) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.controls = controls;
    this.world = world;
    this.sim = sim;
    this.ui = ui;

    this.editMode = false;
    this.selected = null;
    this.dragging = false;
    this.draggingMarker = null;
    this.dragOffset = new THREE.Vector2();
    this.selBox = null;

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this._hit = new THREE.Vector3();

    this._buildPanel();
    this._bindPointer();
  }

  // ---- DOM panel ----------------------------------------------------------
  _buildPanel() {
    const $ = (id) => document.getElementById(id);
    this.el = {
      panel: $('editorPanel'),
      left: $('leftpanel'),
      right: $('rightpanel'),
      palette: $('palette'),
      gymW: $('gymW'), gymWVal: $('gymWVal'),
      gymD: $('gymD'), gymDVal: $('gymDVal'),
      selPanel: $('selPanel'),
      selName: $('selName'),
      selCap: $('selCap'),
      selTrackRow: $('selTrackRow'),
      selTrackLen: $('selTrackLen'),
    };

    // palette buttons
    this.el.palette.innerHTML = '';
    Object.entries(EQUIPMENT_TYPES).forEach(([key, v]) => {
      const b = document.createElement('button');
      b.className = 'palette-btn';
      b.innerHTML = `<span class="swatch" style="background:${typeColorHex(key)}"></span>${v.label}`;
      b.onclick = () => {
        const s = this.world.addStation(key, 0, gym.depth / 2 - 8);
        this._select(s);
      };
      this.el.palette.appendChild(b);
    });

    // size sliders
    const syncSize = () => {
      this.el.gymWVal.textContent = this.el.gymW.value + 'm';
      this.el.gymDVal.textContent = this.el.gymD.value + 'm';
    };
    this.el.gymW.value = gym.width;
    this.el.gymD.value = gym.depth;
    syncSize();
    const onSize = () => {
      syncSize();
      this.world.setSize(Number(this.el.gymW.value), Number(this.el.gymD.value));
      if (this.selBox) this.selBox.update();
    };
    this.el.gymW.oninput = onSize;
    this.el.gymD.oninput = onSize;

    // selected-station controls
    $('btnRotate').onclick = () => {
      if (this.selected) {
        this.world.rotateStation(this.selected);
        if (this.selBox) this.selBox.update();
      }
    };
    this.el.selCap.onchange = () => {
      if (this.selected) this.world.setCapacity(this.selected, Number(this.el.selCap.value));
    };
    this.el.selTrackLen.onchange = () => {
      if (this.selected && this.selected.isTrack) {
        this.world.setTrackLength(this.selected, Number(this.el.selTrackLen.value));
        if (this.selBox) this.selBox.update();
      }
    };
    $('btnDup').onclick = () => {
      if (this.selected) this._select(this.world.duplicateStation(this.selected));
    };
    $('btnDel').onclick = () => {
      if (this.selected) {
        this.world.removeStation(this.selected);
        this._deselect();
      }
    };

    // footer
    $('btnClearAll').onclick = () => {
      this.world.clearAll();
      this._deselect();
    };
    $('btnResetLayout').onclick = () => {
      this.world.resetToDefault();
      this._deselect();
      this.el.gymW.value = gym.width;
      this.el.gymD.value = gym.depth;
      syncSize();
    };
    $('btnDoneEdit').onclick = () => this.exit();
    $('btnEdit').onclick = () => (this.editMode ? this.exit() : this.enter());

    window.addEventListener('keydown', (e) => {
      if (!this.editMode || !this.selected) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        this.world.removeStation(this.selected);
        this._deselect();
      } else if (e.key === 'r' || e.key === 'R') {
        this.world.rotateStation(this.selected);
        if (this.selBox) this.selBox.update();
      }
    });
  }

  // ---- mode -------------------------------------------------------------
  enter() {
    this.editMode = true;
    this.ui.pause();
    this.sim.reset();
    document.body.classList.add('editing');
    this.el.panel.classList.remove('hidden');
    this.el.left.classList.add('hidden');
    this.el.right.classList.add('hidden');
    document.getElementById('btnEdit').textContent = '✓ Done';
    document.getElementById('btnEdit').classList.add('primary');
    this.el.gymW.value = gym.width;
    this.el.gymD.value = gym.depth;
    this.el.gymWVal.textContent = gym.width + 'm';
    this.el.gymDVal.textContent = gym.depth + 'm';
  }

  exit() {
    this.editMode = false;
    this._deselect();
    document.body.classList.remove('editing');
    this.el.panel.classList.add('hidden');
    this.el.left.classList.remove('hidden');
    this.el.right.classList.remove('hidden');
    document.getElementById('btnEdit').textContent = '✎ Edit layout';
    document.getElementById('btnEdit').classList.remove('primary');
    this.world.save();
    this.ui.applyWaves();
    this.sim.reset();
  }

  // ---- selection --------------------------------------------------------
  _select(station) {
    this._deselect();
    this.selected = station;
    this.selBox = new THREE.BoxHelper(station.mesh, 0xf0a23c);
    this.scene.add(this.selBox);
    this.el.selPanel.classList.remove('hidden');
    this.el.selName.textContent = station.name || station.label;
    this.el.selCap.value = station.capacity;
    if (station.isTrack) {
      this.el.selTrackRow.classList.remove('hidden');
      this.el.selTrackLen.value = station.trackLength;
    } else {
      this.el.selTrackRow.classList.add('hidden');
    }
  }

  _deselect() {
    this.selected = null;
    if (this.selBox) {
      this.scene.remove(this.selBox);
      this.selBox.geometry.dispose();
      this.selBox.material.dispose();
      this.selBox = null;
    }
    this.el.selPanel.classList.add('hidden');
  }

  // ---- pointer / raycasting --------------------------------------------
  _setPointer(e) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
  }

  _floorPoint() {
    if (this.raycaster.ray.intersectPlane(this.floorPlane, this._hit)) {
      return { x: this._hit.x, z: this._hit.z };
    }
    return null;
  }

  _stationUnderPointer() {
    const groups = this.world.stations.map((s) => s.mesh);
    const hits = this.raycaster.intersectObjects(groups, true);
    if (!hits.length) return null;
    let o = hits[0].object;
    while (o && !o.userData.station) o = o.parent;
    return o ? o.userData.station : null;
  }

  _markerUnderPointer() {
    const m = this.world.env?.markers;
    if (!m) return null;
    const hits = this.raycaster.intersectObjects([m.entrance, m.exit], true);
    if (!hits.length) return null;
    let o = hits[0].object;
    while (o && !o.userData.marker) o = o.parent;
    return o ? o.userData.marker : null;
  }

  _bindPointer() {
    const dom = this.renderer.domElement;
    dom.addEventListener('pointerdown', (e) => {
      if (!this.editMode || e.button !== 0) return;
      this._setPointer(e);
      const station = this._stationUnderPointer();
      if (station) {
        this._select(station);
        const fp = this._floorPoint();
        if (fp) this.dragOffset.set(station.pos.x - fp.x, station.pos.z - fp.z);
        this.dragging = true;
        this.controls.enabled = false;
        return;
      }
      // otherwise, see if a start/finish marker was grabbed
      const marker = this._markerUnderPointer();
      if (marker) {
        this._deselect();
        this.draggingMarker = marker;
        const cur = marker === 'entrance' ? gym.entrance : gym.exit;
        const fp = this._floorPoint();
        if (fp) this.dragOffset.set(cur.x - fp.x, cur.z - fp.z);
        this.controls.enabled = false;
      } else {
        this._deselect();
      }
    });

    dom.addEventListener('pointermove', (e) => {
      if (this.draggingMarker) {
        this._setPointer(e);
        const fp = this._floorPoint();
        if (fp) this.world.moveMarker(this.draggingMarker, fp.x + this.dragOffset.x, fp.z + this.dragOffset.y);
        return;
      }
      if (!this.dragging || !this.selected) return;
      this._setPointer(e);
      const fp = this._floorPoint();
      if (fp) {
        this.world.moveStation(this.selected, fp.x + this.dragOffset.x, fp.z + this.dragOffset.y);
        if (this.selBox) this.selBox.update();
      }
    });

    const endDrag = () => {
      if (this.draggingMarker) {
        this.draggingMarker = null;
        this.controls.enabled = true;
        this.world.save();
      }
      if (this.dragging) {
        this.dragging = false;
        this.controls.enabled = true;
        this.world.save();
      }
    };
    dom.addEventListener('pointerup', endDrag);
    dom.addEventListener('pointerleave', endDrag);
  }
}
